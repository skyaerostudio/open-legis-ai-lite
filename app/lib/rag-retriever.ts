import { createClient } from '@/lib/supabase';
import { generateEmbedding, calculateCosineSimilarity } from '@/lib/embeddings';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Find potential conflicts by searching for similar clauses using vector similarity
 */
export async function findConflicts(versionId: string, threshold = 0.7): Promise<ConflictResult[]> {
  console.log(`Starting conflict detection for version ${versionId} with threshold ${threshold}`);
  
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
 * Analyze a pair of similar clauses to determine if there's a conflict
 */
async function analyzeConflict(
  currentClause: any,
  similarClause: SimilarClause
): Promise<ConflictResult | null> {
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
 * Generate a comprehensive document summary with AI
 */
export async function generateDocumentSummary(versionId: string): Promise<DocumentSummary> {
  console.log(`Generating summary for version ${versionId}`);
  
  const supabase = createClient();

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