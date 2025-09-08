import * as diff from 'diff';
import { calculateCosineSimilarity, generateEmbedding } from './embeddings';
import { ClauseSegment } from './pdf-processor';
import { DocumentComparison, DocumentDiff } from '@/types/analysis';

// Progress callback type for streaming comparison
export interface ComparisonProgress {
  current: number;
  total: number;
  percentage: number;
  current_phase: 'preparing' | 'analyzing' | 'scoring' | 'finalizing';
  estimated_remaining_ms?: number;
  processed_clauses?: number;
  total_clauses?: number;
}

export interface ComparisonOptions {
  semantic_threshold: number; // 0-1, higher = more strict similarity matching
  significance_weights: {
    length_factor: number;      // Weight for text length changes
    position_factor: number;    // Weight for clause position changes
    semantic_factor: number;    // Weight for semantic similarity changes
    legal_factor: number;       // Weight for legal structure importance
  };
  enable_semantic_analysis: boolean;
  include_ai_explanations: boolean;
  batch_size: number; // For processing large documents
  timeout_ms: number; // Maximum processing time
}

export interface ClauseMapping {
  old_clause: ClauseSegment;
  new_clause: ClauseSegment;
  similarity: number;
  mapping_confidence: number;
  change_type: 'exact' | 'similar' | 'moved' | 'restructured';
}

export interface SemanticComparisonResult {
  similarity: number;
  key_differences: string[];
  semantic_changes: Array<{
    aspect: string;
    old_value: string;
    new_value: string;
    significance: number;
  }>;
}

// Default configuration for Indonesian legal document comparison
const DEFAULT_COMPARISON_OPTIONS: ComparisonOptions = {
  semantic_threshold: 0.70, // Reasonable threshold for legal documents
  significance_weights: {
    length_factor: 0.15,
    position_factor: 0.10,
    semantic_factor: 0.50,
    legal_factor: 0.25
  },
  enable_semantic_analysis: true,
  include_ai_explanations: true,
  batch_size: 20,
  timeout_ms: 180000 // 3 minutes
};

// Indonesian legal clause type hierarchy for significance scoring
const LEGAL_CLAUSE_HIERARCHY: Record<string, number> = {
  'bab': 5,        // Chapter - highest significance
  'bagian': 4,     // Section - high significance
  'paragraf': 3,   // Paragraph - medium significance
  'pasal': 5,      // Article - highest significance (core legal content)
  'ayat': 4,       // Verse - high significance
  'huruf': 2,      // Letter - low-medium significance
  'angka': 2,      // Number - low-medium significance
  'general': 1     // General text - lowest significance
};

/**
 * Legal-aware document comparison engine for Indonesian legal documents
 * Supports clause-level comparison with semantic similarity and significance scoring
 */
export class LegalDocumentComparator {
  private options: ComparisonOptions;
  private progressCallback?: (progress: ComparisonProgress) => void;

  constructor(
    options: Partial<ComparisonOptions> = {},
    progressCallback?: (progress: ComparisonProgress) => void
  ) {
    this.options = { ...DEFAULT_COMPARISON_OPTIONS, ...options };
    this.progressCallback = progressCallback;
  }

  /**
   * Compare two documents and generate comprehensive diff analysis
   */
  async compareDocuments(
    oldClauses: ClauseSegment[],
    newClauses: ClauseSegment[]
  ): Promise<DocumentComparison> {
    const startTime = Date.now();
    
    try {
      // Update progress: preparing
      this.updateProgress({
        current: 0,
        total: 100,
        percentage: 0,
        current_phase: 'preparing'
      });

      // Pre-process clauses for comparison
      const preprocessedOld = this.preprocessClauses(oldClauses);
      const preprocessedNew = this.preprocessClauses(newClauses);

      // Update progress: analyzing
      this.updateProgress({
        current: 10,
        total: 100,
        percentage: 10,
        current_phase: 'analyzing',
        processed_clauses: 0,
        total_clauses: Math.max(preprocessedOld.length, preprocessedNew.length)
      });

      // Create clause mappings to identify relationships
      const mappings = await this.createClauseMappings(preprocessedOld, preprocessedNew);

      // Update progress: scoring
      this.updateProgress({
        current: 60,
        total: 100,
        percentage: 60,
        current_phase: 'scoring'
      });

      // Generate detailed diffs based on mappings
      const diffs = await this.generateDetailedDiffs(mappings, preprocessedOld, preprocessedNew);

      // Update progress: finalizing
      this.updateProgress({
        current: 90,
        total: 100,
        percentage: 90,
        current_phase: 'finalizing'
      });

      // Calculate statistics and generate summary
      const statistics = this.calculateStatistics(diffs);
      const summary = await this.generateComparisonSummary(diffs, statistics);

      // Final progress update
      this.updateProgress({
        current: 100,
        total: 100,
        percentage: 100,
        current_phase: 'finalizing'
      });

      const processingTime = (Date.now() - startTime) / 1000;

      return {
        changes: diffs,
        summary,
        statistics,
        processing_info: {
          comparison_method: this.options.enable_semantic_analysis ? 'hybrid' : 'clause',
          processing_time_seconds: processingTime,
          generated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      throw new Error(`Document comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocess clauses for comparison - normalize and enhance metadata
   */
  private preprocessClauses(clauses: ClauseSegment[]): ClauseSegment[] {
    return clauses
      .filter(clause => clause.text && clause.text.trim().length > 0)
      .map((clause, index) => ({
        ...clause,
        // Normalize text for better comparison
        text: this.normalizeTextForComparison(clause.text),
        // Ensure sequence order
        sequence_order: clause.sequence_order ?? index,
        // Normalize clause type
        clause_type: this.normalizeClauseType(clause.clause_type) as ClauseSegment['clause_type']
      }))
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
  }

  /**
   * Normalize text for comparison (Indonesian legal document specific)
   */
  private normalizeTextForComparison(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[""'']/g, '"') // Normalize quotes
      .replace(/[–—]/g, '-') // Normalize dashes
      .trim();
  }

  /**
   * Normalize clause type for consistent comparison
   */
  private normalizeClauseType(clauseType?: string): string {
    if (!clauseType) return 'general';
    const normalized = clauseType.toLowerCase().trim();
    
    // Map common variations
    const typeMap: Record<string, string> = {
      'artikel': 'pasal',
      'article': 'pasal',
      'verse': 'ayat',
      'chapter': 'bab',
      'section': 'bagian',
      'paragraph': 'paragraf',
      'letter': 'huruf',
      'number': 'angka'
    };

    return typeMap[normalized] || normalized || 'general';
  }

  /**
   * Create mappings between old and new clauses
   */
  private async createClauseMappings(
    oldClauses: ClauseSegment[],
    newClauses: ClauseSegment[]
  ): Promise<ClauseMapping[]> {
    const mappings: ClauseMapping[] = [];
    const usedNewIndices = new Set<number>();

    for (let oldIndex = 0; oldIndex < oldClauses.length; oldIndex++) {
      const oldClause = oldClauses[oldIndex];
      let bestMatch: { newIndex: number; similarity: number; confidence: number } | null = null;

      for (let newIndex = 0; newIndex < newClauses.length; newIndex++) {
        if (usedNewIndices.has(newIndex)) continue;

        const newClause = newClauses[newIndex];
        const similarity = await this.calculateClauseSimilarity(oldClause, newClause);
        const confidence = this.calculateMappingConfidence(oldClause, newClause, similarity);

        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { newIndex, similarity, confidence };
        }
      }

      if (bestMatch && bestMatch.similarity >= this.options.semantic_threshold) {
        usedNewIndices.add(bestMatch.newIndex);
        const newClause = newClauses[bestMatch.newIndex];
        
        mappings.push({
          old_clause: oldClause,
          new_clause: newClause,
          similarity: bestMatch.similarity,
          mapping_confidence: bestMatch.confidence,
          change_type: this.determineChangeType(oldClause, newClause, bestMatch.similarity)
        });

        // Update progress
        this.updateProgress({
          current: 10 + Math.floor((oldIndex / oldClauses.length) * 50),
          total: 100,
          percentage: 10 + Math.floor((oldIndex / oldClauses.length) * 50),
          current_phase: 'analyzing',
          processed_clauses: oldIndex + 1,
          total_clauses: oldClauses.length
        });
      }
    }

    return mappings;
  }

  /**
   * Calculate similarity between two clauses using multiple methods
   */
  private async calculateClauseSimilarity(clause1: ClauseSegment, clause2: ClauseSegment): Promise<number> {
    // Text-based similarity
    const textSimilarity = this.calculateTextSimilarity(clause1.text, clause2.text);

    // Semantic similarity if enabled
    let semanticSimilarity = 0;
    if (this.options.enable_semantic_analysis) {
      try {
        const embedding1 = await generateEmbedding(clause1.text);
        const embedding2 = await generateEmbedding(clause2.text);
        semanticSimilarity = calculateCosineSimilarity(embedding1.embedding, embedding2.embedding);
      } catch (error) {
        console.warn('Semantic similarity calculation failed, using text similarity only');
        semanticSimilarity = textSimilarity;
      }
    }

    // Combine similarities with weights
    const combinedSimilarity = this.options.enable_semantic_analysis
      ? (semanticSimilarity * 0.7) + (textSimilarity * 0.3)
      : textSimilarity;

    return Math.max(0, Math.min(1, combinedSimilarity));
  }

  /**
   * Calculate text similarity using edit distance and word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    
    const norm1 = this.normalizeTextForComparison(text1).toLowerCase().trim();
    const norm2 = this.normalizeTextForComparison(text2).toLowerCase().trim();
    
    if (norm1 === norm2) return 1.0;
    
    // Calculate Levenshtein-based similarity
    const editDistance = this.calculateEditDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    const levenshteinSimilarity = maxLength > 0 ? 1 - (editDistance / maxLength) : 1;
    
    // Calculate word-based similarity
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    const wordSimilarity = this.calculateJaccardSimilarity(words1, words2);
    
    // Combined similarity (weighted average)
    return (levenshteinSimilarity * 0.3) + (wordSimilarity * 0.7);
  }

  /**
   * Calculate edit distance (Levenshtein distance)
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate Jaccard similarity between two word arrays
   */
  private calculateJaccardSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1.filter(w => w.length > 2)); // Filter out short words for better comparison
    const set2 = new Set(words2.filter(w => w.length > 2));
    
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate mapping confidence based on multiple factors
   */
  private calculateMappingConfidence(
    oldClause: ClauseSegment,
    newClause: ClauseSegment,
    similarity: number
  ): number {
    let confidence = similarity;

    // Boost confidence for same clause types
    if (oldClause.clause_type === newClause.clause_type) {
      confidence += 0.1;
    }

    // Boost confidence for similar positions
    const oldPos = oldClause.sequence_order || 0;
    const newPos = newClause.sequence_order || 0;
    const positionDiff = Math.abs(oldPos - newPos);
    const maxPosition = Math.max(oldPos, newPos) || 1;
    const positionSimilarity = 1 - (positionDiff / maxPosition);
    confidence += positionSimilarity * 0.1;

    // Boost confidence for similar clause references
    if (oldClause.clause_ref && newClause.clause_ref && oldClause.clause_ref === newClause.clause_ref) {
      confidence += 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine the type of change between clauses
   */
  private determineChangeType(
    oldClause: ClauseSegment,
    newClause: ClauseSegment,
    similarity: number
  ): ClauseMapping['change_type'] {
    if (similarity >= 0.999 || oldClause.text === newClause.text) return 'exact';
    if (similarity >= 0.85) return 'similar';
    
    // Check if it's a move (same content, different position)
    const oldPos = oldClause.sequence_order || 0;
    const newPos = newClause.sequence_order || 0;
    const positionDiff = Math.abs(oldPos - newPos);
    
    if (similarity >= 0.95 && positionDiff > 2) {
      return 'moved';
    }
    
    return 'restructured';
  }

  /**
   * Generate detailed diffs from clause mappings
   */
  private async generateDetailedDiffs(
    mappings: ClauseMapping[],
    oldClauses: ClauseSegment[],
    newClauses: ClauseSegment[]
  ): Promise<DocumentDiff[]> {
    const diffs: DocumentDiff[] = [];
    const mappedOldIndices = new Set<number>();
    const mappedNewIndices = new Set<number>();

    // Process modifications from mappings
    for (const mapping of mappings) {
      const oldIndex = oldClauses.indexOf(mapping.old_clause);
      const newIndex = newClauses.indexOf(mapping.new_clause);
      
      if (oldIndex !== -1) mappedOldIndices.add(oldIndex);
      if (newIndex !== -1) mappedNewIndices.add(newIndex);

      if (mapping.change_type !== 'exact') {
        const diffChange = await this.createDiffFromMapping(mapping);
        diffs.push(diffChange);
      }
    }

    // Process deletions (clauses in old but not mapped to new)
    for (let i = 0; i < oldClauses.length; i++) {
      if (!mappedOldIndices.has(i)) {
        const deletedClause = oldClauses[i];
        diffs.push({
          id: `del_${i}_${Date.now()}`,
          clause_ref: deletedClause.clause_ref,
          change_type: 'deleted',
          old_text: deletedClause.text,
          significance_score: this.calculateSignificanceScore(deletedClause.clause_type || 'general', 'deleted'),
          sequence_order: deletedClause.sequence_order || i,
          context: {
            before: i > 0 ? oldClauses[i - 1]?.text?.slice(0, 100) : undefined,
            after: i < oldClauses.length - 1 ? oldClauses[i + 1]?.text?.slice(0, 100) : undefined
          }
        });
      }
    }

    // Process additions (clauses in new but not mapped from old)
    for (let i = 0; i < newClauses.length; i++) {
      if (!mappedNewIndices.has(i)) {
        const addedClause = newClauses[i];
        diffs.push({
          id: `add_${i}_${Date.now()}`,
          clause_ref: addedClause.clause_ref,
          change_type: 'added',
          new_text: addedClause.text,
          significance_score: this.calculateSignificanceScore(addedClause.clause_type || 'general', 'added'),
          sequence_order: addedClause.sequence_order || i,
          context: {
            before: i > 0 ? newClauses[i - 1]?.text?.slice(0, 100) : undefined,
            after: i < newClauses.length - 1 ? newClauses[i + 1]?.text?.slice(0, 100) : undefined
          }
        });
      }
    }

    // Sort by sequence order
    return diffs.sort((a, b) => a.sequence_order - b.sequence_order);
  }

  /**
   * Create a DocumentDiff from a ClauseMapping
   */
  private async createDiffFromMapping(mapping: ClauseMapping): Promise<DocumentDiff> {
    const changeType = mapping.change_type === 'moved' ? 'moved' : 'modified';
    const significanceScore = this.calculateSignificanceScore(
      mapping.old_clause.clause_type || 'general',
      changeType,
      mapping.similarity
    );

    let explanation = '';
    if (this.options.include_ai_explanations) {
      explanation = this.generateChangeExplanation(
        mapping.old_clause.text,
        mapping.new_clause.text,
        mapping.similarity
      );
    }

    return {
      id: `mod_${mapping.old_clause.sequence_order}_${Date.now()}`,
      clause_ref: mapping.old_clause.clause_ref || mapping.new_clause.clause_ref,
      change_type: changeType,
      old_text: mapping.old_clause.text,
      new_text: mapping.new_clause.text,
      similarity_score: mapping.similarity,
      significance_score: significanceScore,
      sequence_order: mapping.new_clause.sequence_order || 0,
      context: {
        before: undefined, // Could be enhanced with context
        after: undefined
      },
      explanation,
      legal_implications: significanceScore >= 4 ? ['High-impact legal change detected'] : undefined
    };
  }

  /**
   * Calculate significance score based on clause type and change type
   */
  private calculateSignificanceScore(
    clauseType: string,
    changeType: DocumentDiff['change_type'],
    similarity?: number
  ): number {
    let baseScore = LEGAL_CLAUSE_HIERARCHY[clauseType] || LEGAL_CLAUSE_HIERARCHY['general'];

    // Adjust based on change type
    switch (changeType) {
      case 'deleted':
        baseScore *= 1.2; // Deletions are slightly more significant
        break;
      case 'added':
        baseScore *= 1.1; // Additions are significant
        break;
      case 'modified':
        if (similarity !== undefined) {
          // More significant if similarity is lower
          const changeIntensity = 1 - similarity;
          baseScore *= (1 + changeIntensity * 1.0); // Increased multiplier for better differentiation
        }
        break;
      case 'moved':
        baseScore *= 0.8; // Moves are less significant than modifications
        break;
    }

    // Allow scores above 5 for major changes, but cap final result
    const rawScore = baseScore;
    const cappedScore = Math.max(1, Math.min(5, Math.round(rawScore)));
    
    // Store raw score for internal comparison, return capped score
    return cappedScore;
  }

  /**
   * Generate explanation for a change
   */
  private generateChangeExplanation(oldText: string, newText: string, similarity: number): string {
    const wordDiff = diff.diffWords(oldText, newText);
    const additions = wordDiff.filter(change => change.added);
    const deletions = wordDiff.filter(change => change.removed);

    if (additions.length === 0 && deletions.length === 0) {
      return 'Minor formatting or whitespace changes';
    }

    const explanationParts: string[] = [];

    if (deletions.length > 0) {
      const deletedText = deletions.map(d => d.value).join(' ').trim();
      explanationParts.push(`Removed: "${deletedText.slice(0, 100)}${deletedText.length > 100 ? '...' : ''}"`);
    }

    if (additions.length > 0) {
      const addedText = additions.map(a => a.value).join(' ').trim();
      explanationParts.push(`Added: "${addedText.slice(0, 100)}${addedText.length > 100 ? '...' : ''}"`);
    }

    const changeIntensity = similarity < 0.7 ? 'Major' : similarity < 0.9 ? 'Moderate' : 'Minor';
    return `${changeIntensity} modification. ${explanationParts.join('. ')}`;
  }

  /**
   * Calculate statistics from diffs
   */
  private calculateStatistics(diffs: DocumentDiff[]): DocumentComparison['statistics'] {
    const stats = {
      total_changes: diffs.length,
      additions: diffs.filter(d => d.change_type === 'added').length,
      deletions: diffs.filter(d => d.change_type === 'deleted').length,
      modifications: diffs.filter(d => d.change_type === 'modified').length,
      moves: diffs.filter(d => d.change_type === 'moved').length,
      significance_distribution: {
        critical: diffs.filter(d => d.significance_score === 5).length,
        major: diffs.filter(d => d.significance_score === 4).length,
        minor: diffs.filter(d => d.significance_score >= 2 && d.significance_score <= 3).length,
        trivial: diffs.filter(d => d.significance_score === 1).length
      }
    };

    return stats;
  }

  /**
   * Generate comparison summary
   */
  private async generateComparisonSummary(
    diffs: DocumentDiff[],
    statistics: DocumentComparison['statistics']
  ): Promise<string> {
    if (statistics.total_changes === 0) {
      return 'No changes detected between document versions.';
    }

    const parts: string[] = [];

    if (statistics.additions > 0) {
      parts.push(`${statistics.additions} clause${statistics.additions === 1 ? '' : 's'} added`);
    }

    if (statistics.deletions > 0) {
      parts.push(`${statistics.deletions} clause${statistics.deletions === 1 ? '' : 's'} removed`);
    }

    if (statistics.modifications > 0) {
      parts.push(`${statistics.modifications} clause${statistics.modifications === 1 ? '' : 's'} modified`);
    }

    if (statistics.moves > 0) {
      parts.push(`${statistics.moves} clause${statistics.moves === 1 ? '' : 's'} moved`);
    }

    let summary = parts.join(', ');

    if (statistics.significance_distribution.critical > 0) {
      summary += ` (${statistics.significance_distribution.critical} critical change${statistics.significance_distribution.critical === 1 ? '' : 's'})`;
    } else if (statistics.significance_distribution.major > 0) {
      summary += ` (${statistics.significance_distribution.major} major change${statistics.significance_distribution.major === 1 ? '' : 's'})`;
    }

    return summary;
  }

  /**
   * Update progress callback if provided
   */
  private updateProgress(progress: ComparisonProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}

// Convenience functions
export async function compareDocuments(
  oldClauses: ClauseSegment[],
  newClauses: ClauseSegment[],
  options?: Partial<ComparisonOptions>,
  progressCallback?: (progress: ComparisonProgress) => void
): Promise<DocumentComparison> {
  const comparator = new LegalDocumentComparator(options, progressCallback);
  return await comparator.compareDocuments(oldClauses, newClauses);
}

export async function quickCompare(
  oldClauses: ClauseSegment[],
  newClauses: ClauseSegment[]
): Promise<DocumentComparison> {
  const quickOptions: Partial<ComparisonOptions> = {
    enable_semantic_analysis: false,
    include_ai_explanations: false,
    timeout_ms: 30000 // 30 seconds
  };
  
  return await compareDocuments(oldClauses, newClauses, quickOptions);
}

export async function detailedCompare(
  oldClauses: ClauseSegment[],
  newClauses: ClauseSegment[],
  progressCallback?: (progress: ComparisonProgress) => void
): Promise<DocumentComparison> {
  const detailedOptions: Partial<ComparisonOptions> = {
    enable_semantic_analysis: true,
    include_ai_explanations: true,
    semantic_threshold: 0.8,
    timeout_ms: 300000 // 5 minutes
  };
  
  return await compareDocuments(oldClauses, newClauses, detailedOptions, progressCallback);
}

// Legacy compatibility exports for existing API routes
export async function createDiffRecord(
  versionFromId: string,
  versionToId: string,
  diffResult: DocumentComparison
): Promise<any> {
  const diffRecords = diffResult.changes.map((change, index) => ({
    v_from: versionFromId,
    v_to: versionToId,
    clause_ref: change.clause_ref || `change-${index}`,
    change_kind: change.change_type,
    score: change.similarity_score || null,
    diff_data: {
      old_text: change.old_text,
      new_text: change.new_text,
      significance_level: change.significance_score >= 4 ? 'major' : change.significance_score >= 2 ? 'minor' : 'trivial',
      explanation: change.explanation,
      legal_implications: change.legal_implications,
      page_info: {
        // Legacy compatibility - these aren't available in new structure
        page_from: 1,
        page_to: 1
      }
    }
  }));
  
  return {
    records: diffRecords,
    summary: diffResult.summary,
    metadata: {
      ...diffResult.processing_info,
      total_changes: diffResult.statistics.total_changes,
      confidence_score: 0.9 // Default confidence
    }
  };
}

export function getDiffSummary(diffResult: DocumentComparison): string {
  return diffResult.summary;
}