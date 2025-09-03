-- Update the similarity search function to support excluding specific versions
CREATE OR REPLACE FUNCTION search_similar_clauses(
    query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.7,
    max_results int DEFAULT 5,
    exclude_version_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id text,
    text text,
    clause_ref text,
    document_title text,
    law_reference text,
    similarity_score float,
    source_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id::text,
        c.text,
        c.clause_ref,
        d.title as document_title,
        d.title as law_reference,
        -- Convert cosine distance to similarity score (0-1, higher = more similar)
        (1 - (e.vector <=> query_embedding)) as similarity_score,
        d.source_url
    FROM clauses c
    JOIN embeddings e ON c.id = e.clause_id
    JOIN document_versions dv ON c.version_id = dv.id
    JOIN documents d ON dv.document_id = d.id
    WHERE 
        -- Only include clauses that meet the similarity threshold
        (1 - (e.vector <=> query_embedding)) >= similarity_threshold
        -- Exclude specified version if provided
        AND (exclude_version_id IS NULL OR c.version_id != exclude_version_id)
        -- Only include completed documents
        AND dv.processing_status = 'completed'
    ORDER BY e.vector <=> query_embedding  -- Order by cosine distance (smaller = more similar)
    LIMIT max_results;
END;
$$;

-- Add comment to explain the function
COMMENT ON FUNCTION search_similar_clauses IS 'Search for similar clauses using pgvector cosine distance, with optional version exclusion';