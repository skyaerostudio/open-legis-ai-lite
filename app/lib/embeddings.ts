import OpenAI from 'openai';
import * as crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  tokens_used: number;
  model: string;
  cached?: boolean;
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    index: number;
    embedding: number[];
    cached?: boolean;
  }>;
  total_tokens: number;
  model: string;
  cache_hits: number;
  cache_misses: number;
}

export interface EmbeddingProgress {
  current: number;
  total: number;
  percentage: number;
  estimated_remaining_ms?: number;
  current_batch?: number;
  total_batches?: number;
}

export interface EmbeddingCacheEntry {
  embedding: number[];
  tokens_used: number;
  model: string;
  created_at: number;
  access_count: number;
  last_accessed: number;
}

export interface RetryConfig {
  max_retries: number;
  base_delay_ms: number;
  max_delay_ms: number;
  backoff_factor: number;
}

// In-memory cache for embeddings
const embeddingCache = new Map<string, EmbeddingCacheEntry>();
const CACHE_MAX_SIZE = 10000; // Maximum number of cached embeddings
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_retries: 5,
  base_delay_ms: 1000,
  max_delay_ms: 60000,
  backoff_factor: 2
};

/**
 * Generate cache key for text content
 */
function generateCacheKey(text: string, model: string = 'text-embedding-3-small'): string {
  const content = `${model}:${cleanTextForEmbedding(text)}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get embedding from cache or return null if not found/expired
 */
function getCachedEmbedding(cacheKey: string): EmbeddingCacheEntry | null {
  const cached = embeddingCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache entry is expired
  const now = Date.now();
  if (now - cached.created_at > CACHE_TTL_MS) {
    embeddingCache.delete(cacheKey);
    return null;
  }
  
  // Update access statistics
  cached.access_count++;
  cached.last_accessed = now;
  
  return cached;
}

/**
 * Store embedding in cache with LRU eviction
 */
function cacheEmbedding(cacheKey: string, embedding: number[], tokens_used: number, model: string): void {
  // Check if cache is full and evict least recently used entries
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    evictLeastRecentlyUsed(Math.floor(CACHE_MAX_SIZE * 0.1)); // Evict 10% when full
  }
  
  const entry: EmbeddingCacheEntry = {
    embedding,
    tokens_used,
    model,
    created_at: Date.now(),
    access_count: 1,
    last_accessed: Date.now()
  };
  
  embeddingCache.set(cacheKey, entry);
}

/**
 * Evict least recently used cache entries
 */
function evictLeastRecentlyUsed(count: number): void {
  const entries = Array.from(embeddingCache.entries());
  
  // Sort by last_accessed (ascending - oldest first)
  entries.sort((a, b) => a[1].last_accessed - b[1].last_accessed);
  
  // Remove the oldest entries
  for (let i = 0; i < count && i < entries.length; i++) {
    embeddingCache.delete(entries[i][0]);
  }
}

/**
 * Exponential backoff retry wrapper
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.max_retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('invalid_api_key') || 
            errorMessage.includes('insufficient_quota') ||
            errorMessage.includes('content_filter')) {
          throw error; // Don't retry these errors
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt === config.max_retries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        config.base_delay_ms * Math.pow(config.backoff_factor, attempt),
        config.max_delay_ms
      );
      
      // Add jitter (±25% of base delay)
      const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
      const delay = Math.max(100, baseDelay + jitter);
      
      console.warn(`${context} failed (attempt ${attempt + 1}/${config.max_retries + 1}), retrying in ${Math.round(delay)}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Generate embedding for a single text segment with caching and retry logic
 * Uses text-embedding-3-small for optimal cost/performance balance
 */
export async function generateEmbedding(
  text: string, 
  retryConfig?: Partial<RetryConfig>
): Promise<EmbeddingResult> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input for embedding generation');
  }

  // Clean and truncate text to model limits
  const cleanText = cleanTextForEmbedding(text);
  const cacheKey = generateCacheKey(cleanText);
  
  // Check cache first
  const cached = getCachedEmbedding(cacheKey);
  if (cached) {
    return {
      embedding: cached.embedding,
      tokens_used: cached.tokens_used,
      model: cached.model,
      cached: true
    };
  }
  
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  try {
    const result = await retryWithBackoff(async () => {
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
    }, config, 'Embedding generation');

    // Cache the result
    cacheEmbedding(cacheKey, result.embedding, result.tokens_used, result.model);
    
    return {
      ...result,
      cached: false
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI rate limit exceeded after retries. Please try again later.');
      }
      if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI quota exceeded. Please check your account limits.');
      }
      if (error.message.includes('invalid_api_key')) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      }
    }
    
    console.error('Embedding generation failed after retries:', error);
    throw new Error(`Failed to generate embedding after ${config.max_retries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple text segments in batch with caching and progress tracking
 * More efficient for processing multiple clauses from the same document
 */
export async function generateBatchEmbeddings(
  texts: string[], 
  progressCallback?: (progress: EmbeddingProgress) => void,
  retryConfig?: Partial<RetryConfig>
): Promise<BatchEmbeddingResult> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Invalid texts array for batch embedding generation');
  }

  const startTime = Date.now();
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  // Clean all texts and check cache
  const processItems: Array<{
    index: number;
    text: string;
    cleanText: string;
    cacheKey: string;
    cached?: EmbeddingCacheEntry;
  }> = texts.map((text, index) => {
    const cleanText = cleanTextForEmbedding(text);
    const cacheKey = generateCacheKey(cleanText);
    const cached = getCachedEmbedding(cacheKey);
    
    return {
      index,
      text,
      cleanText,
      cacheKey,
      cached
    };
  });

  // Separate cached and non-cached items
  const cachedItems = processItems.filter(item => item.cached);
  const uncachedItems = processItems.filter(item => !item.cached);
  
  let cacheHits = cachedItems.length;
  let cacheMisses = uncachedItems.length;
  
  console.log(`Batch processing: ${cacheHits} cache hits, ${cacheMisses} cache misses`);
  
  // Initialize result array with cached embeddings
  const resultEmbeddings: Array<{
    index: number;
    embedding: number[];
    cached?: boolean;
  }> = cachedItems.map(item => ({
    index: item.index,
    embedding: item.cached!.embedding,
    cached: true
  }));

  let totalTokens = cachedItems.reduce((sum, item) => sum + item.cached!.tokens_used, 0);
  let modelUsed = 'text-embedding-3-small';
  
  // Process uncached items in batches
  if (uncachedItems.length > 0) {
    const BATCH_SIZE = 100;
    const batches = chunkArray(uncachedItems, BATCH_SIZE);
    const totalBatches = batches.length;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchTexts = batch.map(item => item.cleanText);
      
      // Update progress
      const completed = cachedItems.length + (batchIndex * BATCH_SIZE);
      const progress: EmbeddingProgress = {
        current: completed,
        total: texts.length,
        percentage: Math.round((completed / texts.length) * 100),
        current_batch: batchIndex + 1,
        total_batches: totalBatches
      };
      
      // Estimate remaining time
      if (batchIndex > 0) {
        const elapsed = Date.now() - startTime;
        const averageTimePerBatch = elapsed / batchIndex;
        const remainingBatches = totalBatches - batchIndex;
        progress.estimated_remaining_ms = Math.round(averageTimePerBatch * remainingBatches);
      }
      
      try {
        progressCallback?.(progress);
      } catch (error) {
        // Ignore progress callback errors to prevent interrupting the main process
        console.warn('Progress callback error:', error);
      }
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} with ${batch.length} texts`);
      
      try {
        const response = await retryWithBackoff(async () => {
          return await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: batchTexts,
            encoding_format: 'float'
          });
        }, config, `Batch ${batchIndex + 1}/${totalBatches}`);

        // Process batch results
        response.data.forEach((item, localIndex) => {
          const originalItem = batch[localIndex];
          
          // Add to results
          resultEmbeddings.push({
            index: originalItem.index,
            embedding: item.embedding,
            cached: false
          });
          
          // Cache the embedding
          cacheEmbedding(
            originalItem.cacheKey, 
            item.embedding, 
            Math.ceil(response.usage.total_tokens / response.data.length), // Approximate per-item tokens
            response.model
          );
        });

        totalTokens += response.usage.total_tokens;
        modelUsed = response.model;

        // Add delay between batches to respect rate limits (adaptive delay)
        if (batchIndex < batches.length - 1) {
          const delay_ms = Math.max(100, Math.min(1000, 50 * batch.length)); // Scale with batch size
          await delay(delay_ms);
        }

      } catch (error) {
        console.error(`Batch ${batchIndex + 1} failed after retries:`, error);
        
        // For batch failures, try processing items individually as fallback
        console.log(`Falling back to individual processing for batch ${batchIndex + 1}`);
        
        for (const item of batch) {
          try {
            const individualResult = await generateEmbedding(item.cleanText, config);
            resultEmbeddings.push({
              index: item.index,
              embedding: individualResult.embedding,
              cached: individualResult.cached || false
            });
            
            if (!individualResult.cached) {
              totalTokens += individualResult.tokens_used;
            }
            
            // Small delay between individual requests
            await delay(200);
            
          } catch (individualError) {
            console.error(`Individual processing failed for item ${item.index}:`, individualError);
            throw new Error(`Failed to process text at index ${item.index}: ${individualError instanceof Error ? individualError.message : 'Unknown error'}`);
          }
        }
      }
    }
  }

  // Sort results by original index
  resultEmbeddings.sort((a, b) => a.index - b.index);

  // Final progress update
  const finalProgress: EmbeddingProgress = {
    current: texts.length,
    total: texts.length,
    percentage: 100,
    current_batch: Math.ceil(uncachedItems.length / 100),
    total_batches: Math.ceil(uncachedItems.length / 100)
  };
  try {
    progressCallback?.(finalProgress);
  } catch (error) {
    // Ignore progress callback errors to prevent interrupting the main process
    console.warn('Progress callback error:', error);
  }

  return {
    embeddings: resultEmbeddings,
    total_tokens: totalTokens,
    model: modelUsed,
    cache_hits: cacheHits,
    cache_misses: cacheMisses
  };
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
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  max_size: number;
  hit_ratio?: number;
  memory_usage_mb: number;
} {
  const entries = Array.from(embeddingCache.values());
  
  // Estimate memory usage (rough calculation)
  const avgEmbeddingSize = 1536 * 4; // 1536 floats * 4 bytes each
  const avgEntryOverhead = 200; // Rough estimate for object overhead
  const memoryUsageMB = (embeddingCache.size * (avgEmbeddingSize + avgEntryOverhead)) / (1024 * 1024);
  
  return {
    size: embeddingCache.size,
    max_size: CACHE_MAX_SIZE,
    memory_usage_mb: Math.round(memoryUsageMB * 100) / 100
  };
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): number {
  const now = Date.now();
  let clearedCount = 0;
  
  const entries = Array.from(embeddingCache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.created_at > CACHE_TTL_MS) {
      embeddingCache.delete(key);
      clearedCount++;
    }
  }
  
  return clearedCount;
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  embeddingCache.clear();
}

/**
 * Warm up cache with commonly used texts
 */
export async function warmUpCache(commonTexts: string[]): Promise<{
  processed: number;
  cached: number;
  errors: number;
}> {
  let processed = 0;
  let cached = 0;
  let errors = 0;
  
  console.log(`Warming up cache with ${commonTexts.length} common texts...`);
  
  for (const text of commonTexts) {
    try {
      const result = await generateEmbedding(text, { max_retries: 2 });
      processed++;
      
      if (result.cached) {
        cached++;
      }
      
      // Small delay to avoid overwhelming the API
      await delay(100);
      
    } catch (error) {
      console.warn('Cache warm-up failed for text:', text.substring(0, 100), error);
      errors++;
    }
  }
  
  console.log(`Cache warm-up complete: ${processed} processed, ${cached} were cached, ${errors} errors`);
  
  return { processed, cached, errors };
}

/**
 * Process document segments with embeddings and progress tracking
 * Higher-level function for document processing workflows
 */
export async function processDocumentEmbeddings(
  segments: Array<{ text: string; clause_ref?: string }>,
  progressCallback?: (progress: EmbeddingProgress) => void,
  retryConfig?: Partial<RetryConfig>
): Promise<Array<{
  text: string;
  clause_ref?: string;
  embedding: number[];
  tokens_used: number;
  cached: boolean;
}>> {
  const texts = segments.map(segment => segment.text);
  
  const batchResult = await generateBatchEmbeddings(texts, progressCallback, retryConfig);
  
  return segments.map((segment, index) => {
    const embeddingResult = batchResult.embeddings.find(e => e.index === index);
    if (!embeddingResult) {
      throw new Error(`Missing embedding result for segment ${index}`);
    }
    
    return {
      text: segment.text,
      clause_ref: segment.clause_ref,
      embedding: embeddingResult.embedding,
      tokens_used: Math.ceil(batchResult.total_tokens / batchResult.embeddings.length),
      cached: embeddingResult.cached || false
    };
  });
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

/**
 * Comprehensive health check for embedding system
 */
export async function runEmbeddingHealthCheck(): Promise<{
  config_valid: boolean;
  api_accessible: boolean;
  cache_stats: ReturnType<typeof getCacheStats>;
  test_passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Check configuration
  const configCheck = validateOpenAIConfig();
  if (!configCheck.isValid) {
    errors.push(configCheck.error!);
  }
  
  // Test API access and functionality
  let apiAccessible = false;
  let testPassed = false;
  
  try {
    testPassed = await testEmbeddingGeneration();
    apiAccessible = true;
  } catch (error) {
    apiAccessible = false;
    errors.push(`API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Get cache statistics
  const cacheStats = getCacheStats();
  
  // Clear expired entries
  const clearedEntries = clearExpiredCache();
  if (clearedEntries > 0) {
    console.log(`Cleared ${clearedEntries} expired cache entries`);
  }
  
  return {
    config_valid: configCheck.isValid,
    api_accessible: apiAccessible,
    cache_stats: cacheStats,
    test_passed: testPassed,
    errors
  };
}