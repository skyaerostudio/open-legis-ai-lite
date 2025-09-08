-- Production alignment and processing pipeline fixes
-- This migration adds enhanced multi-document workflow support, 
-- atomic processing updates, and optimized vector similarity search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add missing columns to existing tables for enhanced processing
ALTER TABLE documents ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'id';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enhance document_versions with detailed processing tracking
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100);
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update processing status to include more granular states
ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_processing_status_check;
ALTER TABLE document_versions ADD CONSTRAINT document_versions_processing_status_check 
    CHECK (processing_status IN ('pending', 'downloading', 'extracting', 'parsing', 'analyzing', 'completed', 'failed'));

-- Add clause_type and sequence_order to clauses table
ALTER TABLE clauses ADD COLUMN IF NOT EXISTS clause_type TEXT CHECK (clause_type IN ('pasal', 'ayat', 'huruf', 'angka', 'bab', 'bagian', 'paragraf'));
ALTER TABLE clauses ADD COLUMN IF NOT EXISTS sequence_order INTEGER;

-- Add model tracking to embeddings
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'text-embedding-3-small';

-- Service jobs table for tracking multi-document operations
CREATE TABLE IF NOT EXISTS service_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL CHECK (service_type IN ('ringkasan', 'perubahan', 'konflik')),
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    version_ids UUID[] NOT NULL, -- Array of document_version IDs
    result_data JSONB,
    error_message TEXT,
    is_public BOOLEAN DEFAULT false,
    shared_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced document comparison results for Deteksi Perubahan
CREATE TABLE IF NOT EXISTS document_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES service_jobs(id) ON DELETE CASCADE,
    version_from UUID REFERENCES document_versions(id),
    version_to UUID REFERENCES document_versions(id),
    clause_ref TEXT,
    change_type TEXT CHECK (change_type IN ('added', 'deleted', 'modified', 'moved')),
    old_text TEXT,
    new_text TEXT,
    similarity_score FLOAT,
    significance_score INTEGER DEFAULT 1 CHECK (significance_score BETWEEN 1 AND 5),
    sequence_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced conflict detection results for Deteksi Konflik
CREATE TABLE IF NOT EXISTS document_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES service_jobs(id) ON DELETE CASCADE,
    version_id UUID REFERENCES document_versions(id),
    conflicting_law_title TEXT NOT NULL,
    conflicting_law_ref TEXT, -- Article/section reference
    overlap_score FLOAT NOT NULL CHECK (overlap_score >= 0.0 AND overlap_score <= 1.0),
    conflict_type TEXT CHECK (conflict_type IN ('contradiction', 'overlap', 'gap', 'inconsistency')),
    excerpt_original TEXT NOT NULL,
    excerpt_conflicting TEXT NOT NULL,
    explanation TEXT,
    citation_data JSONB,
    confidence_score FLOAT CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_processing ON document_versions(processing_status, created_at);
CREATE INDEX IF NOT EXISTS idx_service_jobs_status ON service_jobs(status, service_type, created_at);
CREATE INDEX IF NOT EXISTS idx_clauses_version_order ON clauses(version_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_document_diffs_job ON document_diffs(job_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_document_conflicts_job ON document_conflicts(job_id, overlap_score DESC);

-- Full-text search indexes for Indonesian content
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON documents USING gin(to_tsvector('indonesian', title));

-- Improved vector similarity search function for legal documents
DROP FUNCTION IF EXISTS search_similar_legal_content;
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

-- Conflict detection function with jurisdiction filtering
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

-- Atomic processing status update function
DROP FUNCTION IF EXISTS update_processing_status;
CREATE OR REPLACE FUNCTION update_processing_status(
    p_version_id uuid,
    p_status text,
    p_progress integer DEFAULT NULL,
    p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE document_versions 
    SET 
        processing_status = p_status,
        processing_progress = COALESCE(p_progress, processing_progress),
        processing_error = p_error,
        processing_started_at = CASE 
            WHEN p_status NOT IN ('pending', 'failed') AND processing_started_at IS NULL 
            THEN NOW() 
            ELSE processing_started_at 
        END,
        processing_completed_at = CASE 
            WHEN p_status IN ('completed', 'failed') 
            THEN NOW() 
            ELSE processing_completed_at 
        END,
        updated_at = NOW()
    WHERE id = p_version_id;
END;
$$;

-- Job processing management functions
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

-- Update triggers for automatic timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to relevant tables
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_versions_updated_at ON document_versions;
CREATE TRIGGER update_document_versions_updated_at 
    BEFORE UPDATE ON document_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_jobs_updated_at ON service_jobs;
CREATE TRIGGER update_service_jobs_updated_at 
    BEFORE UPDATE ON service_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for new tables
ALTER TABLE service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_conflicts ENABLE ROW LEVEL SECURITY;

-- Public read access for sharing results
CREATE POLICY "Public read access for service_jobs" ON service_jobs
    FOR SELECT USING (is_public = true);

CREATE POLICY "Public read access for document_diffs" ON document_diffs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM service_jobs sj 
            WHERE sj.id = job_id AND sj.is_public = true
        )
    );

CREATE POLICY "Public read access for document_conflicts" ON document_conflicts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM service_jobs sj 
            WHERE sj.id = job_id AND sj.is_public = true
        )
    );

-- Authenticated users can create jobs
CREATE POLICY "Authenticated users can insert service_jobs" ON service_jobs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Service role full access for background processing
CREATE POLICY "Service role full access service_jobs" ON service_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access document_diffs" ON document_diffs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access document_conflicts" ON document_conflicts
    FOR ALL USING (auth.role() = 'service_role');

-- Performance monitoring views for health checking
CREATE OR REPLACE VIEW processing_pipeline_health AS
SELECT 
    'pending_jobs' as metric,
    COUNT(*) as value,
    CASE 
        WHEN COUNT(*) > 50 THEN 'critical'
        WHEN COUNT(*) > 20 THEN 'warning'
        ELSE 'ok'
    END as status
FROM service_jobs 
WHERE status = 'pending'

UNION ALL

SELECT 
    'stuck_processing' as metric,
    COUNT(*) as value,
    CASE 
        WHEN COUNT(*) > 0 THEN 'critical'
        ELSE 'ok'
    END as status
FROM service_jobs 
WHERE status = 'processing' 
    AND updated_at < NOW() - INTERVAL '10 minutes'
    
UNION ALL

SELECT 
    'failed_jobs_today' as metric,
    COUNT(*) as value,
    CASE 
        WHEN COUNT(*) > 10 THEN 'critical'
        WHEN COUNT(*) > 5 THEN 'warning'
        ELSE 'ok'
    END as status
FROM service_jobs 
WHERE status = 'failed' 
    AND created_at > CURRENT_DATE;

-- Comments for documentation
COMMENT ON TABLE service_jobs IS 'Tracks multi-document analysis jobs for the three services: ringkasan, perubahan, konflik';
COMMENT ON TABLE document_diffs IS 'Stores clause-level differences for document comparison (Deteksi Perubahan)';
COMMENT ON TABLE document_conflicts IS 'Stores potential legal conflicts detected via semantic similarity (Deteksi Konflik)';
COMMENT ON FUNCTION search_similar_legal_content IS 'Enhanced vector similarity search for legal documents with document type filtering';
COMMENT ON FUNCTION detect_legal_conflicts IS 'Specialized conflict detection with jurisdiction filtering and high confidence thresholds';
COMMENT ON VIEW processing_pipeline_health IS 'Real-time monitoring of processing pipeline health metrics';