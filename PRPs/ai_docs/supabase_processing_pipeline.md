# Supabase Processing Pipeline Patterns

## Real-time Status Updates

### WebSocket Subscriptions with Fallback

**PATTERN**: Use Supabase real-time for instant status updates with polling fallback.

```typescript
// app/lib/supabase-realtime.ts
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeStatusManager {
  private client: ReturnType<typeof createClient>;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10, // Rate limiting for performance
        },
      },
    });
  }
  
  subscribeToJobStatus(
    jobId: string, 
    onUpdate: (status: any) => void,
    onError?: (error: any) => void
  ): () => void {
    let isConnected = false;
    
    // Primary: WebSocket subscription
    const channel = this.client
      .channel(`job-status-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          isConnected = true;
          onUpdate(payload.new);
          console.log('Real-time update received:', payload.new.status);
        }
      )
      .on('system', {}, (payload) => {
        if (payload.extension === 'postgres_changes') {
          isConnected = payload.status === 'ok';
          console.log('WebSocket connection status:', payload.status);
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isConnected = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isConnected = false;
          onError?.(new Error(`Subscription failed: ${status}`));
        }
      });
    
    this.subscriptions.set(jobId, channel);
    
    // Fallback: Polling when WebSocket fails
    const pollInterval = setInterval(async () => {
      if (!isConnected) {
        try {
          const { data, error } = await this.client
            .from('service_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
          
          if (error) {
            onError?.(error);
          } else if (data) {
            onUpdate(data);
            console.log('Polling update received:', data.status);
          }
        } catch (error) {
          onError?.(error);
        }
      }
    }, 2000); // Poll every 2 seconds when disconnected
    
    this.pollIntervals.set(jobId, pollInterval);
    
    // Return cleanup function
    return () => this.cleanup(jobId);
  }
  
  private cleanup(jobId: string) {
    // Remove WebSocket subscription
    const channel = this.subscriptions.get(jobId);
    if (channel) {
      this.client.removeChannel(channel);
      this.subscriptions.delete(jobId);
    }
    
    // Clear polling interval
    const interval = this.pollIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(jobId);
    }
  }
  
  cleanupAll() {
    this.subscriptions.forEach((_, jobId) => this.cleanup(jobId));
  }
}
```

**GOTCHAS**:
- WebSocket connections can drop silently without errors
- Always implement polling fallback for critical status updates
- Rate limit real-time events to prevent overwhelming the client
- Connection status events don't always fire reliably

### Database Triggers for Status Broadcasting

**PATTERN**: Use PostgreSQL triggers to broadcast status changes automatically.

```sql
-- supabase/migrations/20250904000002_realtime_triggers.sql

-- Function to broadcast status changes
CREATE OR REPLACE FUNCTION notify_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only broadcast significant status changes
  IF OLD.status != NEW.status OR OLD.progress != NEW.progress THEN
    -- Send real-time notification
    PERFORM pg_notify(
      'job_status_change', 
      json_build_object(
        'job_id', NEW.id,
        'status', NEW.status,
        'progress', NEW.progress,
        'service_type', NEW.service_type,
        'updated_at', NEW.updated_at
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on service_jobs table
DROP TRIGGER IF EXISTS job_status_trigger ON service_jobs;
CREATE TRIGGER job_status_trigger
  AFTER UPDATE ON service_jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_job_status_change();

-- Function for document version status changes
CREATE OR REPLACE FUNCTION notify_version_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast processing status changes
  IF OLD.processing_status != NEW.processing_status OR OLD.processing_progress != NEW.processing_progress THEN
    PERFORM pg_notify(
      'version_status_change',
      json_build_object(
        'version_id', NEW.id,
        'status', NEW.processing_status,
        'progress', NEW.processing_progress,
        'error', NEW.processing_error,
        'updated_at', NEW.updated_at
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on document_versions table
DROP TRIGGER IF EXISTS version_status_trigger ON document_versions;
CREATE TRIGGER version_status_trigger
  AFTER UPDATE ON document_versions
  FOR EACH ROW
  EXECUTE FUNCTION notify_version_status_change();
```

**GOTCHAS**:
- Triggers fire for every update - filter for significant changes only
- JSON serialization in triggers can be expensive for large payloads
- pg_notify has payload size limits (8000 bytes)
- Real-time subscriptions must match trigger notification patterns

## Background Processing

### Atomic Job Processing with Error Recovery

**PATTERN**: Ensure database consistency during processing with proper rollback.

```typescript
// app/lib/job-processor.ts
export class JobProcessor {
  constructor(private supabase: SupabaseClient) {}
  
  async processJob(jobId: string): Promise<void> {
    // Start database transaction
    const { data: job, error: fetchError } = await this.supabase
      .rpc('begin_job_processing', { p_job_id: jobId });
    
    if (fetchError || !job) {
      throw new Error(`Failed to start job processing: ${fetchError?.message}`);
    }
    
    try {
      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', 0);
      
      // Service-specific processing
      const result = await this.executeServiceProcessing(job);
      
      // Commit successful processing
      await this.supabase.rpc('complete_job_processing', {
        p_job_id: jobId,
        p_result_data: result,
      });
      
    } catch (error) {
      console.error('Job processing failed:', error);
      
      // Rollback and mark as failed
      await this.supabase.rpc('fail_job_processing', {
        p_job_id: jobId,
        p_error_message: error.message,
      });
      
      throw error;
    }
  }
  
  private async executeServiceProcessing(job: ServiceJob): Promise<any> {
    switch (job.service_type) {
      case 'ringkasan':
        return await this.processRingkasan(job);
      case 'perubahan':
        return await this.processPerubahan(job);
      case 'konflik':
        return await this.processKonflik(job);
      default:
        throw new Error(`Unknown service type: ${job.service_type}`);
    }
  }
  
  private async updateJobStatus(jobId: string, status: string, progress: number) {
    const { error } = await this.supabase
      .from('service_jobs')
      .update({ 
        status, 
        progress, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', jobId);
    
    if (error) {
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }
}

-- Database functions for atomic processing
-- supabase/migrations/20250904000003_job_processing_functions.sql

CREATE OR REPLACE FUNCTION begin_job_processing(p_job_id uuid)
RETURNS TABLE (
  id uuid,
  service_type text,
  version_ids uuid[],
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if job exists and is in pending state
  IF NOT EXISTS (
    SELECT 1 FROM service_jobs 
    WHERE service_jobs.id = p_job_id 
    AND service_jobs.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Job not found or not in pending state';
  END IF;
  
  -- Return job details for processing
  RETURN QUERY
  SELECT 
    sj.id, 
    sj.service_type, 
    sj.version_ids,
    sj.status
  FROM service_jobs sj
  WHERE sj.id = p_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION complete_job_processing(
  p_job_id uuid,
  p_result_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update job as completed
  UPDATE service_jobs
  SET 
    status = 'completed',
    progress = 100,
    result_data = p_result_data,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  -- Update all related document versions
  UPDATE document_versions
  SET 
    processing_status = 'completed',
    processing_progress = 100,
    processing_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(
    SELECT unnest(version_ids) 
    FROM service_jobs 
    WHERE service_jobs.id = p_job_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION fail_job_processing(
  p_job_id uuid,
  p_error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update job as failed
  UPDATE service_jobs
  SET 
    status = 'failed',
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  -- Update all related document versions
  UPDATE document_versions
  SET 
    processing_status = 'failed',
    processing_error = p_error_message,
    updated_at = NOW()
  WHERE id = ANY(
    SELECT unnest(version_ids) 
    FROM service_jobs 
    WHERE service_jobs.id = p_job_id
  );
END;
$$;
```

**GOTCHAS**:
- Always use database transactions for multi-table operations
- Job status updates must be atomic to prevent inconsistent states
- Error messages should be user-friendly in Indonesian
- Rollback must clean up all related processing state

### Processing Queue Management

**PATTERN**: Implement job queue with priority and retry logic.

```typescript
// app/lib/processing-queue.ts
export class ProcessingQueue {
  private processingJobs: Set<string> = new Set();
  private readonly maxConcurrentJobs = 3;
  private readonly retryDelay = 60000; // 1 minute
  private readonly maxRetries = 3;
  
  constructor(private supabase: SupabaseClient) {}
  
  async processNextJob(): Promise<boolean> {
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return false; // Queue is full
    }
    
    // Get next pending job with highest priority
    const { data: job, error } = await this.supabase
      .from('service_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('task_order', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    
    if (error || !job) {
      return false; // No jobs available
    }
    
    // Prevent concurrent processing of same job
    if (this.processingJobs.has(job.id)) {
      return false;
    }
    
    this.processingJobs.add(job.id);
    
    try {
      const processor = new JobProcessor(this.supabase);
      await processor.processJob(job.id);
      return true;
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      await this.handleJobFailure(job, error);
      return false;
      
    } finally {
      this.processingJobs.delete(job.id);
    }
  }
  
  private async handleJobFailure(job: ServiceJob, error: Error) {
    const retryCount = (job.result_data?.retry_count || 0) + 1;
    
    if (retryCount <= this.maxRetries) {
      // Schedule retry
      setTimeout(async () => {
        await this.supabase
          .from('service_jobs')
          .update({
            status: 'pending',
            result_data: { 
              ...job.result_data, 
              retry_count: retryCount,
              last_error: error.message,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }, this.retryDelay * retryCount); // Exponential backoff
      
    } else {
      // Max retries exceeded - mark as permanently failed
      await this.supabase
        .from('service_jobs')
        .update({
          status: 'failed',
          error_message: `Max retries exceeded. Last error: ${error.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
  }
  
  async startProcessing() {
    const processLoop = async () => {
      try {
        const processed = await this.processNextJob();
        if (!processed) {
          // No jobs processed, wait before checking again
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error('Processing loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      // Continue processing
      setImmediate(processLoop);
    };
    
    processLoop();
  }
}
```

**GOTCHAS**:
- Concurrent job processing requires careful state management
- Exponential backoff prevents overwhelming failed services
- Job priorities must be balanced with creation timestamps
- Memory leaks possible if job sets aren't cleaned properly

## Vector Similarity Search

### pgvector Optimization for Legal Documents

**PATTERN**: Configure pgvector indexes for optimal performance with legal document corpus.

```sql
-- supabase/migrations/20250904000004_vector_optimization.sql

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create optimized index for embeddings table
-- IVFFLAT is best for 1000+ vectors with good recall
DROP INDEX IF EXISTS idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector 
ON embeddings 
USING ivfflat (vector vector_cosine_ops) 
WITH (lists = 100);

-- Create additional index for combined queries
CREATE INDEX idx_embeddings_clause_vector 
ON embeddings (clause_id) 
INCLUDE (vector);

-- Optimize ANALYZE for better query planning
ANALYZE embeddings;

-- Function for optimized similarity search
CREATE OR REPLACE FUNCTION search_similar_legal_content(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10,
  document_types text[] DEFAULT NULL
)
RETURNS TABLE (
  clause_id uuid,
  version_id uuid,
  document_title text,
  clause_ref text,
  clause_text text,
  similarity float,
  document_type text,
  jurisdiction text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.version_id,
    d.title,
    c.clause_ref,
    c.text,
    1 - (e.vector <=> query_embedding) AS similarity,
    d.kind,
    d.jurisdiction
  FROM clauses c
  JOIN embeddings e ON e.clause_id = c.id
  JOIN document_versions dv ON dv.id = c.version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE 
    1 - (e.vector <=> query_embedding) > match_threshold
    AND (document_types IS NULL OR d.kind = ANY(document_types))
    AND dv.processing_status = 'completed'
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for conflict detection with jurisdiction filtering
CREATE OR REPLACE FUNCTION detect_legal_conflicts(
  query_embedding vector(1536),
  exclude_document_id uuid DEFAULT NULL,
  jurisdiction_filter text DEFAULT NULL,
  confidence_threshold float DEFAULT 0.8
)
RETURNS TABLE (
  conflict_clause_id uuid,
  conflict_text text,
  conflict_document_title text,
  conflict_document_type text,
  similarity_score float,
  jurisdiction text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.text,
    d.title,
    d.kind,
    1 - (e.vector <=> query_embedding) AS similarity,
    d.jurisdiction
  FROM clauses c
  JOIN embeddings e ON e.clause_id = c.id
  JOIN document_versions dv ON dv.id = c.version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE 
    1 - (e.vector <=> query_embedding) > confidence_threshold
    AND d.id != COALESCE(exclude_document_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (jurisdiction_filter IS NULL OR d.jurisdiction = jurisdiction_filter)
    AND dv.processing_status = 'completed'
    AND d.kind IN ('law', 'regulation') -- Only compare against official laws
  ORDER BY e.vector <=> query_embedding
  LIMIT 50; -- More results for conflict analysis
END;
$$;
```

**GOTCHAS**:
- IVFFLAT index performance depends on VACUUM and ANALYZE frequency
- Lists parameter should be sqrt(rows) for optimal performance
- Vector operations are CPU-intensive - consider read replicas for search
- Similarity thresholds need tuning based on legal document domain

### Batch Embedding Generation

**PATTERN**: Efficient batch processing for large document corpora.

```typescript
// app/lib/batch-embeddings.ts
export class BatchEmbeddingProcessor {
  private readonly batchSize = 100;
  private readonly rateLimitDelay = 200; // milliseconds between batches
  
  constructor(
    private openai: OpenAI,
    private supabase: SupabaseClient
  ) {}
  
  async generateEmbeddingsForClauses(clauses: LegalClause[]): Promise<void> {
    const batches = this.chunkArray(clauses, this.batchSize);
    
    console.log(`Processing ${clauses.length} clauses in ${batches.length} batches`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        await this.processBatch(batch, i + 1, batches.length);
        
        // Rate limiting delay between batches
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
        
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        
        // Retry individual clauses on batch failure
        await this.processIndividualClauses(batch);
      }
    }
  }
  
  private async processBatch(
    clauses: LegalClause[], 
    batchNumber: number, 
    totalBatches: number
  ): Promise<void> {
    console.log(`Processing batch ${batchNumber}/${totalBatches}`);
    
    // Prepare texts for embedding
    const texts = clauses.map(clause => 
      `${clause.clause_ref}: ${clause.text}`.substring(0, 8000) // Truncate if too long
    );
    
    // Generate embeddings
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    });
    
    // Prepare embedding records
    const embeddingRecords = clauses.map((clause, index) => ({
      clause_id: clause.id,
      vector: response.data[index].embedding,
      model_name: 'text-embedding-3-small',
      created_at: new Date().toISOString(),
    }));
    
    // Batch insert to database
    const { error } = await this.supabase
      .from('embeddings')
      .insert(embeddingRecords);
    
    if (error) {
      throw new Error(`Failed to save embeddings: ${error.message}`);
    }
    
    console.log(`Batch ${batchNumber} completed: ${embeddingRecords.length} embeddings saved`);
  }
  
  private async processIndividualClauses(clauses: LegalClause[]): Promise<void> {
    console.log(`Retrying ${clauses.length} clauses individually`);
    
    for (const clause of clauses) {
      try {
        await this.processSingleClause(clause);
        await new Promise(resolve => setTimeout(resolve, 50)); // Short delay between requests
      } catch (error) {
        console.error(`Failed to process clause ${clause.id}:`, error);
        // Continue with other clauses
      }
    }
  }
  
  private async processSingleClause(clause: LegalClause): Promise<void> {
    const text = `${clause.clause_ref}: ${clause.text}`.substring(0, 8000);
    
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [text],
      dimensions: 1536,
    });
    
    const { error } = await this.supabase
      .from('embeddings')
      .insert({
        clause_id: clause.id,
        vector: response.data[0].embedding,
        model_name: 'text-embedding-3-small',
      });
    
    if (error) {
      throw new Error(`Failed to save embedding for clause ${clause.id}: ${error.message}`);
    }
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

**GOTCHAS**:
- OpenAI API rate limits: 3,000 requests/minute for text-embedding-3-small
- Batch failures require individual retry logic
- Large embedding batches can cause memory issues
- Always truncate long texts to avoid API limits (8191 tokens)

## Performance Monitoring

### Database Performance Metrics

**PATTERN**: Monitor critical queries and connection health.

```sql
-- Performance monitoring views and functions
-- supabase/migrations/20250904000005_performance_monitoring.sql

-- View for slow queries
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time,
  max_time,
  min_time
FROM pg_stat_statements
WHERE mean_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Function to check processing pipeline health
CREATE OR REPLACE FUNCTION check_processing_health()
RETURNS TABLE (
  metric text,
  value bigint,
  status text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'pending_jobs'::text,
    COUNT(*)::bigint,
    CASE 
      WHEN COUNT(*) > 50 THEN 'critical'
      WHEN COUNT(*) > 20 THEN 'warning'
      ELSE 'ok'
    END::text
  FROM service_jobs 
  WHERE status = 'pending'
  
  UNION ALL
  
  SELECT 
    'stuck_processing'::text,
    COUNT(*)::bigint,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::text
  FROM service_jobs 
  WHERE status = 'processing' 
    AND updated_at < NOW() - INTERVAL '10 minutes'
    
  UNION ALL
  
  SELECT 
    'failed_jobs_today'::text,
    COUNT(*)::bigint,
    CASE 
      WHEN COUNT(*) > 10 THEN 'critical'
      WHEN COUNT(*) > 5 THEN 'warning'
      ELSE 'ok'
    END::text
  FROM service_jobs 
  WHERE status = 'failed' 
    AND created_at > CURRENT_DATE;
END;
$$;

-- Index usage monitoring
CREATE VIEW index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

**GOTCHAS**:
- pg_stat_statements must be enabled for query monitoring
- Performance views need regular analysis to catch degradation
- Index usage monitoring helps identify unused indexes
- Connection pooling essential for high-concurrency applications