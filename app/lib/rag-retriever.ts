import { generateEmbedding, calculateCosineSimilarity } from './embeddings';
import { createClient } from './supabase';
import { ClauseSegment } from './pdf-processor';
import { ConflictDetection, ConflictFlag, LegalCitation, SimilaritySearchResult } from '@/types/analysis';
import OpenAI from 'openai';

// Progress callback type for RAG processing
export interface ConflictDetectionProgress {
  current: number;
  total: number;
  percentage: number;
  current_phase: 'embedding' | 'searching' | 'analyzing' | 'explaining' | 'finalizing';
  estimated_remaining_ms?: number;
  processed_clauses?: number;
  corpus_documents_searched?: number;
}

export interface ConflictDetectionOptions {
  similarity_threshold: number; // 0-1, default 0.8 for high confidence conflicts
  max_conflicts_per_clause: number; // Limit results per clause
  include_low_confidence: boolean; // Include conflicts with lower confidence
  jurisdiction_filter?: 'national' | 'provincial' | 'municipal';
  document_types: string[]; // Types to search against ['law', 'regulation']
  enable_ai_explanations: boolean;
  batch_size: number; // For processing large documents
  timeout_ms: number; // Maximum processing time per clause
  context_window_size: number; // Characters of context around conflicts
}

export interface ConflictContext {
  original_clause: ClauseSegment;
  conflicting_clause: {
    id: string;
    text: string;
    document_title: string;
    clause_ref?: string;
    document_type: string;
    jurisdiction: string;
  };
  similarity_score: number;
  conflict_indicators: string[];
}

export interface LegalConflictAnalysis {
  conflict_type: ConflictFlag['conflict_type'];
  confidence: number;
  explanation: string;
  legal_implications: string[];
  resolution_suggestions: string[];
  severity_factors: string[];
}

// Default configuration for Indonesian legal conflict detection
const DEFAULT_CONFLICT_OPTIONS: ConflictDetectionOptions = {
  similarity_threshold: 0.8,
  max_conflicts_per_clause: 5,
  include_low_confidence: false,
  document_types: ['law', 'regulation'],
  enable_ai_explanations: true,
  batch_size: 10,
  timeout_ms: 30000, // 30 seconds per clause
  context_window_size: 500,
};

// Legacy interfaces for backward compatibility
export interface ConflictResult {
  law_ref: string;
  overlap_score: number;
  excerpt: string;
  citation: {
    title: string;
    article?: string;
    paragraph?: string;
    url?: string;
  };
  explanation: string;
}

export interface SimilarClause {
  id: string;
  text: string;
  clause_ref?: string;
  document_title: string;
  law_reference: string;
  similarity_score: number;
  source_url?: string;
}

export interface DocumentSummary {
  summary: string;
  key_changes: string[];
  glossary: Array<{
    term: string;
    definition: string;
  }>;
  citations: Array<{
    text: string;
    source: string;
    page?: number;
  }>;
  metadata: {
    total_clauses: number;
    processing_method: string;
    confidence_score: number;
  };
}

/**
 * ConflictDetector - RAG-based legal conflict detection system
 * 
 * This class implements semantic search against a legal corpus to identify
 * potential conflicts, contradictions, and overlaps between new legal documents
 * and existing laws and regulations.
 */
export class ConflictDetector {
  private supabase = createClient();
  private openai?: OpenAI;
  private options: ConflictDetectionOptions;
  
  constructor(options: Partial<ConflictDetectionOptions> = {}) {
    this.options = { ...DEFAULT_CONFLICT_OPTIONS, ...options };
    
    // Initialize OpenAI if API key is available and explanations are enabled
    if (this.options.enable_ai_explanations && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Main conflict detection method
   */
  async detectConflicts(
    clauses: ClauseSegment[],
    excludeDocumentId?: string,
    onProgress?: (progress: ConflictDetectionProgress) => void
  ): Promise<ConflictDetection> {
    const startTime = Date.now();
    const totalClauses = clauses.length;
    let processedClauses = 0;
    
    const allConflicts: ConflictFlag[] = [];
    let corpusDocumentsSearched = 0;

    try {
      for (let i = 0; i < clauses.length; i += this.options.batch_size) {
        const batch = clauses.slice(i, Math.min(i + this.options.batch_size, clauses.length));
        
        // Update progress - embedding phase
        onProgress?.({
          current: processedClauses,
          total: totalClauses,
          percentage: Math.round((processedClauses / totalClauses) * 100),
          current_phase: 'embedding',
          processed_clauses: processedClauses,
        });

        // Process batch of clauses
        const batchConflicts = await this.processBatch(batch, excludeDocumentId, (phaseProgress) => {
          onProgress?.({
            current: processedClauses + phaseProgress.current,
            total: totalClauses,
            percentage: Math.round(((processedClauses + phaseProgress.current) / totalClauses) * 100),
            current_phase: phaseProgress.current_phase,
            processed_clauses: processedClauses + phaseProgress.current,
            corpus_documents_searched: corpusDocumentsSearched,
          });
        });

        allConflicts.push(...batchConflicts);
        processedClauses += batch.length;
        
        // Count unique documents searched (approximate)
        const uniqueDocuments = new Set(batchConflicts.map(c => c.conflicting_law_title));
        corpusDocumentsSearched += uniqueDocuments.size;
      }

      // Update progress - finalizing
      onProgress?.({
        current: totalClauses,
        total: totalClauses,
        percentage: 100,
        current_phase: 'finalizing',
        processed_clauses: totalClauses,
        corpus_documents_searched: corpusDocumentsSearched,
      });

      // Sort conflicts by confidence and overlap score
      const sortedConflicts = allConflicts.sort((a, b) => {
        if (a.confidence_score !== b.confidence_score) {
          return b.confidence_score - a.confidence_score;
        }
        return b.overlap_score - a.overlap_score;
      });

      // Generate overall analysis
      const analysis = this.generateOverallAnalysis(sortedConflicts);
      const processingTimeSeconds = (Date.now() - startTime) / 1000;

      return {
        conflicts: sortedConflicts,
        summary: analysis.summary,
        risk_assessment: analysis.risk_assessment,
        recommendations: analysis.recommendations,
        overall_compatibility_score: analysis.compatibility_score,
        processing_info: {
          corpus_searched: corpusDocumentsSearched,
          similarity_threshold: this.options.similarity_threshold,
          processing_time_seconds: processingTimeSeconds,
          generated_at: new Date().toISOString(),
        },
      };

    } catch (error) {
      console.error('Conflict detection failed:', error);
      throw new Error(`Conflict detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a batch of clauses for conflict detection
   */
  private async processBatch(
    clauses: ClauseSegment[],
    excludeDocumentId?: string,
    onProgress?: (progress: ConflictDetectionProgress) => void
  ): Promise<ConflictFlag[]> {
    const batchConflicts: ConflictFlag[] = [];

    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      
      try {
        // Update progress - searching phase
        onProgress?.({
          current: i,
          total: clauses.length,
          percentage: Math.round((i / clauses.length) * 100),
          current_phase: 'searching',
        });

        // Generate embedding for the clause
        const embedding = await generateEmbedding(clause.text);
        
        // Search for similar clauses in legal corpus
        const similarClauses = await this.searchLegalCorpus(
          embedding,
          excludeDocumentId
        );

        if (similarClauses.length === 0) {
          continue; // No potential conflicts found
        }

        // Update progress - analyzing phase
        onProgress?.({
          current: i,
          total: clauses.length,
          percentage: Math.round((i / clauses.length) * 100),
          current_phase: 'analyzing',
        });

        // Analyze each potential conflict
        for (const similarClause of similarClauses) {
          const conflictAnalysis = await this.analyzeConflict(clause, {
            original_clause: clause,
            conflicting_clause: {
              id: similarClause.clause_id,
              text: similarClause.clause_text,
              document_title: similarClause.document_title,
              clause_ref: similarClause.clause_ref,
              document_type: similarClause.document_type,
              jurisdiction: similarClause.jurisdiction,
            },
            similarity_score: similarClause.similarity,
            conflict_indicators: [],
          });

          if (conflictAnalysis.confidence >= this.options.similarity_threshold || 
              this.options.include_low_confidence) {
            
            const conflictFlag = await this.createConflictFlag(
              clause,
              similarClause,
              conflictAnalysis
            );

            batchConflicts.push(conflictFlag);
          }
        }

      } catch (error) {
        console.error(`Error processing clause ${i}:`, error);
        // Continue with other clauses
        continue;
      }
    }

    return batchConflicts;
  }

  /**
   * Search for similar clauses in the legal corpus using vector similarity
   */
  private async searchLegalCorpus(
    queryEmbedding: number[],
    excludeDocumentId?: string
  ): Promise<SimilaritySearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('detect_legal_conflicts', {
        query_embedding: queryEmbedding,
        exclude_document_id: excludeDocumentId || null,
        jurisdiction_filter: this.options.jurisdiction_filter || null,
        confidence_threshold: this.options.similarity_threshold,
      });

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Map database results to SimilaritySearchResult format
      return (data || []).map((row: any, index: number) => ({
        clause_id: row.conflict_clause_id,
        version_id: '', // Not needed for conflict detection
        document_title: row.conflict_document_title,
        clause_ref: row.clause_ref || '',
        clause_text: row.conflict_text,
        similarity: row.similarity_score,
        document_type: row.conflict_document_type,
        jurisdiction: row.jurisdiction,
        rank: index + 1,
        context: {
          before: '',
          after: '',
        },
      }));

    } catch (error) {
      console.error('Legal corpus search failed:', error);
      throw error;
    }
  }

  /**
   * Analyze potential conflict between two clauses
   */
  private async analyzeConflict(
    originalClause: ClauseSegment,
    context: ConflictContext
  ): Promise<LegalConflictAnalysis> {
    // Basic conflict type detection based on similarity and text analysis
    const conflictType = this.detectConflictType(
      originalClause.text,
      context.conflicting_clause.text,
      context.similarity_score
    );

    // Calculate confidence based on similarity and other factors
    const confidence = this.calculateConflictConfidence(
      originalClause,
      context
    );

    // Generate AI explanation if enabled
    let explanation = `Potential ${conflictType} detected with ${context.conflicting_clause.document_title}`;
    let legal_implications: string[] = [];
    let resolution_suggestions: string[] = [];
    let severity_factors: string[] = [];

    if (this.options.enable_ai_explanations && this.openai) {
      try {
        const aiAnalysis = await this.generateAIExplanation(originalClause, context);
        explanation = aiAnalysis.explanation || explanation;
        legal_implications = aiAnalysis.legal_implications || [];
        resolution_suggestions = aiAnalysis.resolution_suggestions || [];
        severity_factors = aiAnalysis.severity_factors || [];
      } catch (error) {
        console.error('AI explanation failed:', error);
        // Continue with basic explanation
      }
    }

    return {
      conflict_type: conflictType,
      confidence,
      explanation,
      legal_implications,
      resolution_suggestions,
      severity_factors,
    };
  }

  /**
   * Detect the type of conflict based on text analysis
   */
  private detectConflictType(
    originalText: string,
    conflictingText: string,
    similarity: number
  ): ConflictFlag['conflict_type'] {
    const original = originalText.toLowerCase();
    const conflicting = conflictingText.toLowerCase();

    // High similarity suggests potential overlap or duplication
    if (similarity > 0.9) {
      return 'overlap';
    }

    // Check for contradictory keywords
    const contradictionKeywords = [
      ['dilarang', 'diperbolehkan'],
      ['tidak boleh', 'boleh'],
      ['wajib', 'tidak wajib'],
      ['harus', 'tidak perlu'],
      ['diizinkan', 'dilarang'],
    ];

    for (const [positive, negative] of contradictionKeywords) {
      if ((original.includes(positive) && conflicting.includes(negative)) ||
          (original.includes(negative) && conflicting.includes(positive))) {
        return 'contradiction';
      }
    }

    // Check for inconsistent requirements or procedures
    const inconsistencyKeywords = ['prosedur', 'tata cara', 'syarat', 'ketentuan'];
    const hasInconsistentProcedures = inconsistencyKeywords.some(keyword => 
      original.includes(keyword) && conflicting.includes(keyword)
    );

    if (hasInconsistentProcedures && similarity > 0.7) {
      return 'inconsistency';
    }

    // Default to overlap for high similarity cases
    return 'overlap';
  }

  /**
   * Calculate confidence score for conflict detection
   */
  private calculateConflictConfidence(
    originalClause: ClauseSegment,
    context: ConflictContext
  ): number {
    let confidence = context.similarity_score;

    // Adjust confidence based on clause importance
    if (originalClause.clause_type === 'pasal') {
      confidence *= 1.2; // Articles are more important
    } else if (originalClause.clause_type === 'ayat') {
      confidence *= 1.1; // Paragraphs are moderately important
    }

    // Adjust based on jurisdiction relevance
    if (context.conflicting_clause.jurisdiction === 'national') {
      confidence *= 1.3; // National laws have higher precedence
    }

    // Adjust based on document type
    if (context.conflicting_clause.document_type === 'law') {
      confidence *= 1.2; // Laws have higher precedence than regulations
    }

    // Cap confidence at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate AI explanation for the conflict
   */
  private async generateAIExplanation(
    originalClause: ClauseSegment,
    context: ConflictContext
  ): Promise<Partial<LegalConflictAnalysis>> {
    if (!this.openai) {
      return {};
    }

    try {
      const prompt = `Analyze the potential legal conflict between these two Indonesian legal provisions:

ORIGINAL PROVISION:
Document: New/Proposed Document
Clause: ${originalClause.clause_ref || 'N/A'}
Text: ${originalClause.text}

POTENTIALLY CONFLICTING PROVISION:
Document: ${context.conflicting_clause.document_title}
Clause: ${context.conflicting_clause.clause_ref || 'N/A'}
Text: ${context.conflicting_clause.text}

Similarity Score: ${context.similarity_score.toFixed(3)}

Please provide:
1. A clear explanation of the potential conflict in Indonesian
2. Legal implications if this conflict exists
3. Suggestions for resolving the conflict
4. Factors that contribute to the severity of this conflict

Respond in JSON format:
{
  "explanation": "Clear explanation in Indonesian",
  "legal_implications": ["implication 1", "implication 2"],
  "resolution_suggestions": ["suggestion 1", "suggestion 2"],
  "severity_factors": ["factor 1", "factor 2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a legal expert specializing in Indonesian law. Provide precise, helpful analysis of legal conflicts.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          return {
            explanation: content,
            legal_implications: [],
            resolution_suggestions: [],
            severity_factors: [],
          };
        }
      }

      return {};
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {};
    }
  }

  /**
   * Create a ConflictFlag from analysis results
   */
  private async createConflictFlag(
    originalClause: ClauseSegment,
    similarClause: SimilaritySearchResult,
    analysis: LegalConflictAnalysis
  ): Promise<ConflictFlag> {
    // Create legal citation
    const citation = this.createLegalCitation(similarClause);
    
    // Determine severity based on confidence and conflict type
    const severity = this.determineSeverity(analysis.confidence, analysis.conflict_type);

    return {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conflicting_law_title: similarClause.document_title,
      conflicting_law_ref: similarClause.clause_ref,
      overlap_score: similarClause.similarity,
      conflict_type: analysis.conflict_type,
      excerpt_original: this.truncateText(originalClause.text, 300),
      excerpt_conflicting: this.truncateText(similarClause.clause_text, 300),
      explanation: analysis.explanation,
      citation_data: citation,
      confidence_score: analysis.confidence,
      severity,
      resolution_suggestion: analysis.resolution_suggestions.join('; ') || undefined,
      legal_precedent: undefined, // Could be populated from additional analysis
    };
  }

  /**
   * Create legal citation from similarity search result
   */
  private createLegalCitation(result: SimilaritySearchResult): LegalCitation {
    // Parse document title to extract citation components
    const title = result.document_title;
    const titleMatch = title.match(/(\w+)\s+(?:No\.|Nomor)\s*(\d+)\s+Tahun\s+(\d+)/i);
    
    let type: LegalCitation['type'] = 'other';
    if (title.toLowerCase().includes('undang-undang')) {
      type = 'undang-undang';
    } else if (title.toLowerCase().includes('peraturan pemerintah')) {
      type = 'peraturan-pemerintah';
    } else if (title.toLowerCase().includes('keputusan presiden')) {
      type = 'keputusan-presiden';
    } else if (title.toLowerCase().includes('peraturan menteri')) {
      type = 'peraturan-menteri';
    } else if (title.toLowerCase().includes('peraturan daerah')) {
      type = 'peraturan-daerah';
    }

    return {
      title,
      type,
      number: titleMatch?.[2] || 'N/A',
      year: titleMatch?.[3] || 'N/A',
      article: result.clause_ref,
      jurisdiction: result.jurisdiction as LegalCitation['jurisdiction'],
      status: 'active', // Assume active unless specified otherwise
      access_date: new Date().toISOString().split('T')[0],
      issuing_authority: this.determineIssuingAuthority(type),
    };
  }

  /**
   * Determine issuing authority based on legal document type
   */
  private determineIssuingAuthority(type: LegalCitation['type']): string {
    switch (type) {
      case 'undang-undang':
        return 'DPR RI dan Presiden RI';
      case 'peraturan-pemerintah':
        return 'Presiden RI';
      case 'keputusan-presiden':
      case 'instruksi-presiden':
        return 'Presiden RI';
      case 'peraturan-menteri':
        return 'Menteri';
      case 'peraturan-daerah':
        return 'Pemerintah Daerah';
      default:
        return 'N/A';
    }
  }

  /**
   * Determine severity based on confidence and conflict type
   */
  private determineSeverity(
    confidence: number,
    conflictType: ConflictFlag['conflict_type']
  ): ConflictFlag['severity'] {
    if (conflictType === 'contradiction') {
      return confidence > 0.9 ? 'critical' : confidence > 0.8 ? 'high' : 'medium';
    }
    
    if (conflictType === 'inconsistency') {
      return confidence > 0.85 ? 'high' : confidence > 0.75 ? 'medium' : 'low';
    }
    
    if (conflictType === 'overlap') {
      return confidence > 0.95 ? 'high' : confidence > 0.85 ? 'medium' : 'low';
    }
    
    // gap type
    return confidence > 0.8 ? 'medium' : 'low';
  }

  /**
   * Generate overall analysis from all conflicts
   */
  private generateOverallAnalysis(conflicts: ConflictFlag[]): {
    summary: string;
    risk_assessment: ConflictDetection['risk_assessment'];
    recommendations: string[];
    compatibility_score: number;
  } {
    if (conflicts.length === 0) {
      return {
        summary: 'Tidak ditemukan konflik signifikan dengan peraturan perundang-undangan yang ada.',
        risk_assessment: 'low',
        recommendations: ['Lanjutkan dengan proses legislasi normal.'],
        compatibility_score: 1.0,
      };
    }

    // Calculate risk assessment based on conflict severities
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
    const highConflicts = conflicts.filter(c => c.severity === 'high').length;
    const mediumConflicts = conflicts.filter(c => c.severity === 'medium').length;

    let risk_assessment: ConflictDetection['risk_assessment'];
    if (criticalConflicts > 0) {
      risk_assessment = 'critical';
    } else if (highConflicts >= 3 || (highConflicts >= 1 && mediumConflicts >= 3)) {
      risk_assessment = 'high';
    } else if (highConflicts >= 1 || mediumConflicts >= 3) {
      risk_assessment = 'medium';
    } else {
      risk_assessment = 'low';
    }

    // Calculate compatibility score (inverse of conflict severity)
    const totalSeverityScore = conflicts.reduce((sum, conflict) => {
      const severityWeight = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1,
      }[conflict.severity];
      
      return sum + (severityWeight * conflict.confidence_score);
    }, 0);

    const maxPossibleScore = conflicts.length * 4; // Max severity * max confidence
    const compatibility_score = maxPossibleScore > 0 ? 
      1 - (totalSeverityScore / maxPossibleScore) : 1.0;

    // Generate summary
    const summary = `Ditemukan ${conflicts.length} potensi konflik: ${criticalConflicts} kritis, ${highConflicts} tinggi, ${mediumConflicts} sedang, ${conflicts.length - criticalConflicts - highConflicts - mediumConflicts} rendah. Skor kompatibilitas: ${(compatibility_score * 100).toFixed(1)}%.`;

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalConflicts > 0) {
      recommendations.push('Segera tinjau dan selesaikan konflik kritis sebelum melanjutkan.');
    }
    if (highConflicts > 0) {
      recommendations.push('Konsultasikan konflik tingkat tinggi dengan ahli hukum.');
    }
    if (mediumConflicts > 2) {
      recommendations.push('Pertimbangkan revisi klausul yang berpotensi konflik.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Monitor perkembangan implementasi untuk potensi konflik di masa depan.');
    }

    return {
      summary,
      risk_assessment,
      recommendations,
      compatibility_score,
    };
  }

  /**
   * Utility function to truncate text while preserving word boundaries
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Update configuration options
   */
  public updateOptions(newOptions: Partial<ConflictDetectionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current configuration
   */
  public getOptions(): ConflictDetectionOptions {
    return { ...this.options };
  }
}

/**
 * Legacy function for backward compatibility
 * Find potential conflicts by searching for similar clauses using vector similarity
 */
export async function findConflicts(versionId: string, threshold = 0.7): Promise<ConflictResult[]> {
  console.log(`Starting legacy conflict detection for version ${versionId} with threshold ${threshold}`);
  
  const supabase = createClient();
  const conflicts: ConflictResult[] = [];

  try {
    // Get all clauses for this version
    const { data: clauses, error: clausesError } = await supabase
      .from('clauses')
      .select('*')
      .eq('version_id', versionId);

    if (clausesError) {
      throw new Error(`Failed to fetch clauses: ${clausesError.message}`);
    }

    if (!clauses || clauses.length === 0) {
      console.log('No clauses found for version');
      return [];
    }

    console.log(`Found ${clauses.length} clauses to check for conflicts`);

    // Process each clause for conflict detection
    for (const clause of clauses) {
      try {
        // Get embedding for this clause
        const { data: embeddingData, error: embeddingError } = await supabase
          .from('embeddings')
          .select('vector')
          .eq('clause_id', clause.id)
          .single();

        if (embeddingError || !embeddingData) {
          console.warn(`No embedding found for clause ${clause.id}, skipping`);
          continue;
        }

        // Search for similar clauses from other documents using pgvector
        const similarClauses = await searchSimilarClauses(
          embeddingData.vector,
          versionId,
          threshold,
          5 // Limit to top 5 similar clauses
        );

        // Analyze each similar clause for conflicts
        for (const similar of similarClauses) {
          const conflict = await analyzeConflict(clause, similar);
          if (conflict) {
            conflicts.push(conflict);
          }
        }

      } catch (error) {
        console.error(`Error processing clause ${clause.id}:`, error);
        // Continue processing other clauses
      }
    }

    console.log(`Found ${conflicts.length} potential conflicts`);
    return conflicts;

  } catch (error) {
    console.error('Conflict detection failed:', error);
    throw error;
  }
}

/**
 * Search for similar clauses using pgvector similarity search
 */
async function searchSimilarClauses(
  queryVector: number[],
  excludeVersionId: string,
  threshold: number,
  limit: number
): Promise<SimilarClause[]> {
  const supabase = createClient();

  try {
    // Use Supabase RPC function for vector similarity search
    const { data: results, error } = await supabase.rpc('search_similar_clauses', {
      query_embedding: queryVector,
      similarity_threshold: threshold,
      max_results: limit,
      exclude_version_id: excludeVersionId
    });

    if (error) {
      console.warn('Vector search failed, using fallback method:', error.message);
      return await fallbackSimilaritySearch(queryVector, excludeVersionId, threshold, limit);
    }

    return results || [];

  } catch (error) {
    console.warn('Vector search error, using fallback:', error);
    return await fallbackSimilaritySearch(queryVector, excludeVersionId, threshold, limit);
  }
}

/**
 * Fallback similarity search using client-side cosine similarity
 */
async function fallbackSimilaritySearch(
  queryVector: number[],
  excludeVersionId: string,
  threshold: number,
  limit: number
): Promise<SimilarClause[]> {
  const supabase = createClient();

  // Get all embeddings except from the current version
  const { data: embeddings, error } = await supabase
    .from('embeddings')
    .select(`
      vector,
      clauses!inner (
        id,
        text,
        clause_ref,
        version_id,
        document_versions!inner (
          document_id,
          documents!inner (
            title
          )
        )
      )
    `)
    .neq('clauses.version_id', excludeVersionId);

  if (error || !embeddings) {
    console.error('Fallback search failed:', error);
    return [];
  }

  // Calculate similarities client-side
  const similarities = embeddings.map((item: any) => {
    const similarity = calculateCosineSimilarity(queryVector, item.vector);
    return {
      similarity,
      clause: item.clauses
    };
  });

  // Filter and sort by similarity
  return similarities
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item: any) => ({
      id: item.clause.id,
      text: item.clause.text,
      clause_ref: item.clause.clause_ref,
      document_title: item.clause.document_versions.documents.title,
      law_reference: item.clause.document_versions.documents.title,
      similarity_score: item.similarity,
      source_url: undefined
    }));
}

/**
 * Legacy analyze conflict function for backward compatibility
 */
async function analyzeConflict(
  currentClause: any,
  similarClause: SimilarClause
): Promise<ConflictResult | null> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const prompt = `Analyze these two legal clauses from Indonesian documents to determine if they conflict:

CURRENT CLAUSE (from new document):
${currentClause.text}

EXISTING CLAUSE (from ${similarClause.law_reference}):
${similarClause.text}

Please determine:
1. Do these clauses create a legal conflict or contradiction?
2. What is the nature of the conflict (if any)?
3. Rate the severity/significance of the conflict (1-10)

Respond with a JSON object:
{
  "has_conflict": boolean,
  "conflict_type": "direct_contradiction" | "partial_overlap" | "procedural_conflict" | "jurisdictional_conflict" | "none",
  "severity": number (1-10),
  "explanation": "detailed explanation in Indonesian or English",
  "recommendation": "suggested action or resolution"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert legal analyst specializing in Indonesian law. Analyze legal clauses for conflicts and inconsistencies.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      return null;
    }

    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    // Only return conflicts that are significant (severity >= 5)
    if (!analysis.has_conflict || analysis.severity < 5) {
      return null;
    }

    return {
      law_ref: similarClause.law_reference,
      overlap_score: similarClause.similarity_score,
      excerpt: similarClause.text.substring(0, 200) + '...',
      citation: {
        title: similarClause.document_title,
        article: similarClause.clause_ref,
        url: similarClause.source_url
      },
      explanation: `${analysis.explanation}\n\nRekomendasi: ${analysis.recommendation}`
    };

  } catch (error) {
    console.error('Conflict analysis failed:', error);
    return null;
  }
}

/**
 * Legacy document summary generation function for backward compatibility
 */
export async function generateDocumentSummary(versionId: string): Promise<DocumentSummary> {
  console.log(`Generating summary for version ${versionId}`);
  
  const supabase = createClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Get all clauses for this version
    const { data: clauses, error: clausesError } = await supabase
      .from('clauses')
      .select('*')
      .eq('version_id', versionId)
      .order('clause_ref', { ascending: true });

    if (clausesError) {
      throw new Error(`Failed to fetch clauses: ${clausesError.message}`);
    }

    if (!clauses || clauses.length === 0) {
      throw new Error('No clauses found for summary generation');
    }

    // Combine all clause texts
    const fullText = clauses.map(c => c.text).join('\n\n');

    // Generate summary using OpenAI
    const summaryPrompt = `Please provide a comprehensive summary of this Indonesian legal document. 

Document content:
${fullText.substring(0, 12000)} ${fullText.length > 12000 ? '...[truncated]' : ''}

Please provide:
1. A clear, plain-language summary (600-900 words in Indonesian or English)
2. Key changes or provisions (if this appears to be an amendment)
3. Important legal terms with definitions
4. Main citations or references to other laws

Respond in JSON format:
{
  "summary": "comprehensive plain-language summary",
  "key_changes": ["change 1", "change 2", ...],
  "glossary": [{"term": "term", "definition": "definition"}, ...],
  "citations": [{"text": "citation text", "source": "source reference"}, ...]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert legal analyst who specializes in making Indonesian legal documents accessible to the public. Provide clear, accurate summaries in plain language.'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const summaryText = response.choices[0]?.message?.content;
    if (!summaryText) {
      throw new Error('Failed to generate summary');
    }

    const summaryData = JSON.parse(summaryText);

    return {
      summary: summaryData.summary,
      key_changes: summaryData.key_changes || [],
      glossary: summaryData.glossary || [],
      citations: summaryData.citations || [],
      metadata: {
        total_clauses: clauses.length,
        processing_method: 'ai_analysis',
        confidence_score: 0.85 // Default confidence score
      }
    };

  } catch (error) {
    console.error('Summary generation failed:', error);
    throw error;
  }
}

/**
 * Get analysis results for a processed document version
 */
// Export utility functions for external use
export function createConflictDetector(options?: Partial<ConflictDetectionOptions>): ConflictDetector {
  return new ConflictDetector(options);
}

/**
 * Legacy analysis results function for backward compatibility
 */
export async function getAnalysisResults(versionId: string) {
  try {
    const [summary, conflicts] = await Promise.all([
      generateDocumentSummary(versionId),
      findConflicts(versionId)
    ]);

    return {
      summary,
      conflicts,
      processing_complete: true,
      analysis_timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Default export
export default ConflictDetector;