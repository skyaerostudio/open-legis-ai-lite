import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable')
}

// Client for server-side operations (uses service key)
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Client for client-side operations (uses anon key)
export function createBrowserClient() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  })
}

// Helper functions for common operations
export async function uploadDocument(file: File, fileName: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return data
}

export async function createDocumentRecord(
  title: string, 
  kind?: string, 
  sourceUrl?: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title,
      kind,
      source_url: sourceUrl
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`)
  }

  return data
}

export async function createVersionRecord(
  documentId: string,
  versionLabel: string,
  storagePath: string,
  pages?: number
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_label: versionLabel,
      storage_path: storagePath,
      pages,
      processing_status: 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create version: ${error.message}`)
  }

  return data
}

export async function updateProcessingStatus(
  versionId: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed'
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('document_versions')
    .update({ processing_status: status })
    .eq('id', versionId)

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`)
  }
}

export async function insertClauses(clauses: Array<{
  version_id: string
  clause_ref?: string
  text: string
  page_from?: number
  page_to?: number
}>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('clauses')
    .insert(clauses)
    .select()

  if (error) {
    throw new Error(`Failed to insert clauses: ${error.message}`)
  }

  return data
}

export async function insertEmbedding(clauseId: string, vector: number[]) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('embeddings')
    .insert({
      clause_id: clauseId,
      vector: JSON.stringify(vector)
    })

  if (error) {
    throw new Error(`Failed to insert embedding: ${error.message}`)
  }
}

export async function searchSimilarClauses(
  queryEmbedding: number[],
  matchThreshold: number = 0.7,
  matchCount: number = 5
) {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('search_similar_clauses', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount
  })

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  return data
}