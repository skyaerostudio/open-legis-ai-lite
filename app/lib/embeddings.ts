import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  tokens_used: number;
  model: string;
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    index: number;
    embedding: number[];
  }>;
  total_tokens: number;
  model: string;
}

/**
 * Generate embedding for a single text segment
 * Uses text-embedding-3-small for optimal cost/performance balance
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input for embedding generation');
  }

  // Clean and truncate text to model limits (8191 tokens ≈ 32,000 characters)
  const cleanText = cleanTextForEmbedding(text);
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanText,
      encoding_format: 'float'
    });

    const embeddingData = response.data[0];
    if (!embeddingData || !embeddingData.embedding) {
      throw new Error('No embedding data received from OpenAI');
    }

    return {
      embedding: embeddingData.embedding,
      tokens_used: response.usage.total_tokens,
      model: response.model
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI quota exceeded. Please check your account limits.');
      }
      if (error.message.includes('invalid_api_key')) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      }
    }
    
    console.error('Embedding generation failed:', error);
    throw new Error('Failed to generate embedding. Please try again.');
  }
}

/**
 * Generate embeddings for multiple text segments in batch
 * More efficient for processing multiple clauses from the same document
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Invalid texts array for batch embedding generation');
  }

  // Clean all texts and ensure they fit within limits
  const cleanTexts = texts.map(text => cleanTextForEmbedding(text));
  
  // OpenAI has a limit on batch size - split into chunks if necessary
  const BATCH_SIZE = 100;
  const batches = chunkArray(cleanTexts, BATCH_SIZE);
  
  let allEmbeddings: Array<{ index: number; embedding: number[] }> = [];
  let totalTokens = 0;
  let modelUsed = '';

  try {
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} texts`);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float'
      });

      // Map embeddings back to original indices
      const batchEmbeddings = response.data.map((item, localIndex) => ({
        index: batchIndex * BATCH_SIZE + localIndex,
        embedding: item.embedding
      }));

      allEmbeddings = allEmbeddings.concat(batchEmbeddings);
      totalTokens += response.usage.total_tokens;
      modelUsed = response.model;

      // Add delay between batches to respect rate limits
      if (batchIndex < batches.length - 1) {
        await delay(100); // 100ms delay between batches
      }
    }

    return {
      embeddings: allEmbeddings,
      total_tokens: totalTokens,
      model: modelUsed
    };

  } catch (error) {
    console.error('Batch embedding generation failed:', error);
    throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean and prepare text for embedding generation
 */
function cleanTextForEmbedding(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  // Remove excessive whitespace and normalize
  let cleaned = text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')      // Limit consecutive newlines
    .replace(/\s+/g, ' ')            // Normalize all whitespace to single spaces
    .trim();

  // Truncate to safe token limit (approximately 32,000 characters for 8191 tokens)
  const MAX_CHARS = 30000; // Conservative limit
  if (cleaned.length > MAX_CHARS) {
    console.warn(`Text truncated from ${cleaned.length} to ${MAX_CHARS} characters`);
    cleaned = cleaned.substring(0, MAX_CHARS);
    
    // Try to end at a sentence boundary
    const lastSentence = cleaned.lastIndexOf('.');
    if (lastSentence > MAX_CHARS * 0.8) { // If we can preserve at least 80%
      cleaned = cleaned.substring(0, lastSentence + 1);
    }
  }

  if (cleaned.length === 0) {
    throw new Error('Text is empty after cleaning');
  }

  return cleaned;
}

/**
 * Utility function to split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Utility function for delays (rate limiting)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate cosine similarity between two embeddings
 * Used for finding similar clauses and conflict detection
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) {
    throw new Error('Invalid embeddings for similarity calculation');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Estimate token count for text (rough approximation)
 * Used for cost estimation and validation
 */
export function estimateTokenCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Rough approximation: 1 token ≈ 4 characters for English/Indonesian text
  return Math.ceil(text.length / 4);
}

/**
 * Get embedding cost estimate in USD
 */
export function getEmbeddingCostEstimate(tokenCount: number): number {
  // text-embedding-3-small pricing: $0.00002 per 1K tokens (as of 2024)
  const pricePerThousandTokens = 0.00002;
  return (tokenCount / 1000) * pricePerThousandTokens;
}

/**
 * Validate OpenAI API configuration
 */
export function validateOpenAIConfig(): { isValid: boolean; error?: string } {
  if (!process.env.OPENAI_API_KEY) {
    return {
      isValid: false,
      error: 'OPENAI_API_KEY environment variable is not set'
    };
  }

  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    return {
      isValid: false,
      error: 'OPENAI_API_KEY appears to be invalid (should start with sk-)'
    };
  }

  return { isValid: true };
}

/**
 * Test embedding generation with a simple text
 * Used for health checks and configuration validation
 */
export async function testEmbeddingGeneration(): Promise<boolean> {
  try {
    const testText = 'This is a test sentence for embedding generation.';
    const result = await generateEmbedding(testText);
    
    // Validate the result
    if (!result.embedding || !Array.isArray(result.embedding)) {
      return false;
    }
    
    // text-embedding-3-small should return 1536-dimensional vectors
    if (result.embedding.length !== 1536) {
      console.warn(`Expected 1536 dimensions, got ${result.embedding.length}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Embedding test failed:', error);
    return false;
  }
}