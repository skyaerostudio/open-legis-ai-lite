// Database types matching our Supabase schema
export interface Document {
  id: string
  title: string
  source_url?: string
  kind?: string
  jurisdiction?: string
  created_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_label: string
  storage_path: string
  pages?: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

export interface Clause {
  id: string
  version_id: string
  clause_ref?: string
  text: string
  page_from?: number
  page_to?: number
  created_at: string
}

export interface Embedding {
  id: string
  clause_id: string
  vector: number[]
  created_at: string
}

export interface DiffRecord {
  id: string
  v_from?: string
  v_to?: string
  clause_ref?: string
  change_kind: 'added' | 'deleted' | 'modified'
  score?: number
  diff_data?: any
  created_at: string
}

export interface Conflict {
  id: string
  version_id: string
  law_ref: string
  overlap_score: number
  excerpt: string
  cite_json?: any
  created_at: string
}

// Search result types
export interface SimilarClauseResult {
  clause_id: string
  text: string
  similarity: number
  clause_ref: string
  law_reference: string
  law_title: string
  source_url: string
}

// Processing status enum
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Document upload types
export interface DocumentUpload {
  file: File
  title?: string
  kind?: string
  jurisdiction?: string
}

// Analysis result types
export interface AnalysisProgress {
  version_id: string
  status: ProcessingStatus
  progress: number // 0-100
  current_step: string
  estimated_completion?: Date
}