-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Core document management
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source_url TEXT,
    kind TEXT, -- 'law', 'regulation', 'draft', etc.
    jurisdiction TEXT, -- 'national', 'provincial', 'municipal'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document versions for comparison
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL, -- 'v1', 'draft-2024-01', etc.
    storage_path TEXT NOT NULL, -- Supabase Storage path
    pages INTEGER,
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique version labels per document
    CONSTRAINT unique_version_per_document UNIQUE (document_id, version_label)
);

-- Clause-level text segments with page references
CREATE TABLE clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    clause_ref TEXT, -- 'Pasal 1', 'Ayat 2', etc.
    text TEXT NOT NULL,
    page_from INTEGER,
    page_to INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for faster clause lookups
    CONSTRAINT text_not_empty CHECK (length(trim(text)) > 0)
);

-- Vector embeddings for RAG (text-embedding-3-small = 1536 dimensions)
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clause_id UUID REFERENCES clauses(id) ON DELETE CASCADE,
    vector vector(1536), -- text-embedding-3-small dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one embedding per clause
    CONSTRAINT unique_embedding_per_clause UNIQUE (clause_id)
);

-- Computed diffs between versions
CREATE TABLE diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    v_from UUID REFERENCES document_versions(id),
    v_to UUID REFERENCES document_versions(id),
    clause_ref TEXT,
    change_kind TEXT NOT NULL CHECK (change_kind IN ('added', 'deleted', 'modified')),
    score FLOAT CHECK (score >= 0 AND score <= 1), -- similarity score 0-1
    diff_data JSONB, -- detailed change information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure different versions being compared
    CONSTRAINT different_versions CHECK (v_from != v_to)
);

-- Conflict detection results
CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    law_ref TEXT NOT NULL, -- Reference to existing law
    overlap_score FLOAT NOT NULL CHECK (overlap_score >= 0 AND overlap_score <= 1),
    excerpt TEXT NOT NULL, -- Conflicting text excerpt
    cite_json JSONB, -- Full citation data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector) WITH (lists = 100);
CREATE INDEX idx_clauses_version ON clauses(version_id);
CREATE INDEX idx_clauses_text_search ON clauses USING gin(to_tsvector('indonesian', text));
CREATE INDEX idx_conflicts_version ON conflicts(version_id);
CREATE INDEX idx_diffs_versions ON diffs(v_from, v_to);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_status ON document_versions(processing_status);

-- Row Level Security (RLS) Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;

-- Public read access for documents (for sharing feature)
CREATE POLICY "Public read access for documents" ON documents
    FOR SELECT USING (true);

CREATE POLICY "Public read access for document_versions" ON document_versions
    FOR SELECT USING (true);

CREATE POLICY "Public read access for clauses" ON clauses
    FOR SELECT USING (true);

CREATE POLICY "Public read access for diffs" ON diffs
    FOR SELECT USING (true);

CREATE POLICY "Public read access for conflicts" ON conflicts
    FOR SELECT USING (true);

-- Authenticated users can insert/update (for document upload)
CREATE POLICY "Authenticated users can insert documents" ON documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert document_versions" ON document_versions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Service role can do everything (for background processing)
CREATE POLICY "Service role full access documents" ON documents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access document_versions" ON document_versions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access clauses" ON clauses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access embeddings" ON embeddings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access diffs" ON diffs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access conflicts" ON conflicts
    FOR ALL USING (auth.role() = 'service_role');

-- Function for vector similarity search (RAG implementation)
CREATE OR REPLACE FUNCTION search_similar_clauses(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    clause_id uuid,
    text text,
    similarity float,
    clause_ref text,
    law_reference text,
    law_title text,
    source_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as clause_id,
        c.text,
        (e.vector <=> query_embedding) * -1 + 1 as similarity,
        c.clause_ref,
        d.title as law_reference,
        d.title as law_title,
        d.source_url
    FROM clauses c
    JOIN embeddings e ON c.id = e.clause_id
    JOIN document_versions dv ON c.version_id = dv.id
    JOIN documents d ON dv.document_id = d.id
    WHERE (e.vector <=> query_embedding) * -1 + 1 > match_threshold
    ORDER BY e.vector <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to update document processing status
CREATE OR REPLACE FUNCTION update_processing_status(
    version_id_param uuid,
    new_status text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE document_versions 
    SET processing_status = new_status
    WHERE id = version_id_param;
END;
$$;

-- Create storage bucket for documents (this might need to be done via Supabase dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Storage policies for document uploads
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Public read access to processed documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Service role full access to storage" ON storage.objects
    FOR ALL USING (
        bucket_id = 'documents' 
        AND auth.role() = 'service_role'
    );