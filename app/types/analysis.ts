// Analysis and AI processing types
export interface DocumentSummary {
  summary: string
  glossary: Array<{
    term: string
    definition: string
  }>
  key_changes?: string[]
  citations: Array<{
    text: string
    source: string
    page?: number
    clause_ref?: string
  }>
  word_count: number
  generated_at: string
}

export interface DiffResult {
  changes: Array<{
    clause_ref?: string
    change_kind: 'added' | 'deleted' | 'modified'
    old_text?: string
    new_text?: string
    similarity_score?: number
    significance: 'low' | 'medium' | 'high'
  }>
  summary: string
  total_changes: number
  significant_changes: number
  generated_at: string
}

export interface ConflictFlag {
  law_ref: string
  overlap_score: number
  excerpt: string
  citation: {
    title: string
    article?: string
    paragraph?: string
    url?: string
    jurisdiction?: string
  }
  explanation: string
  severity: 'low' | 'medium' | 'high'
  recommendation?: string
}

export interface ProcessingResult {
  version_id: string
  document_id: string
  status: 'success' | 'error' | 'partial'
  summary?: DocumentSummary
  conflicts?: ConflictFlag[]
  processing_time_seconds: number
  error_message?: string
  warnings?: string[]
}

export interface ComparisonRequest {
  old_version_id: string
  new_version_id: string
  comparison_type: 'clause' | 'semantic' | 'both'
}

export interface ComparisonResult {
  old_version_id: string
  new_version_id: string
  diff_result: DiffResult
  processing_time_seconds: number
  generated_at: string
}

// Indonesian legal document specific types
export interface LegalTermDefinition {
  term: string
  definition: string
  category: 'legal' | 'technical' | 'administrative'
  source?: string
}

export interface LegalReference {
  type: 'law' | 'regulation' | 'decree' | 'instruction'
  number: string
  year: number
  title: string
  article?: string
  paragraph?: string
  url?: string
}