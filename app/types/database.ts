// Database schema types matching our Supabase schema

import type { ServiceJob } from './processing';

// Core database tables matching the migration schema
export interface Document {
  id: string;
  title: string;
  source_url?: string;
  kind?: 'law' | 'regulation' | 'draft' | 'uploaded';
  jurisdiction?: 'national' | 'provincial' | 'municipal';
  language: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_label: string;
  storage_path: string;
  pages?: number;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_error?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus = 
  | 'pending' 
  | 'downloading' 
  | 'extracting' 
  | 'parsing' 
  | 'analyzing' 
  | 'completed' 
  | 'failed';

export interface Clause {
  id: string;
  version_id: string;
  clause_ref?: string;
  clause_type?: 'pasal' | 'ayat' | 'huruf' | 'angka' | 'bab' | 'bagian' | 'paragraf';
  text: string;
  page_from?: number;
  page_to?: number;
  sequence_order?: number;
  created_at: string;
}

export interface Embedding {
  id: string;
  clause_id: string;
  vector: number[]; // 1536 dimensions for text-embedding-3-small
  model_name: string;
  created_at: string;
}

// New tables from the enhanced schema
export interface ServiceJobRecord extends Omit<ServiceJob, 'created_at' | 'updated_at'> {
  created_at: string;
  updated_at: string;
}

export interface DocumentDiff {
  id: string;
  job_id: string;
  version_from: string;
  version_to: string;
  clause_ref?: string;
  change_type: 'added' | 'deleted' | 'modified' | 'moved';
  old_text?: string;
  new_text?: string;
  similarity_score?: number;
  significance_score: number;
  sequence_order: number;
  created_at: string;
}

export interface DocumentConflict {
  id: string;
  job_id: string;
  version_id: string;
  conflicting_law_title: string;
  conflicting_law_ref?: string;
  overlap_score: number;
  conflict_type: 'contradiction' | 'overlap' | 'gap' | 'inconsistency';
  excerpt_original: string;
  excerpt_conflicting: string;
  explanation: string;
  citation_data: any; // JSONB
  confidence_score: number;
  created_at: string;
}

// Legacy table structures (for backward compatibility)
export interface DiffRecord {
  id: string;
  v_from?: string;
  v_to?: string;
  clause_ref?: string;
  change_kind: 'added' | 'deleted' | 'modified';
  score?: number;
  diff_data?: any;
  created_at: string;
}

export interface Conflict {
  id: string;
  version_id: string;
  law_ref: string;
  overlap_score: number;
  excerpt: string;
  cite_json?: any;
  created_at: string;
}

// Database function return types
export interface SimilarClauseResult {
  clause_id: string;
  version_id: string;
  document_title: string;
  clause_ref: string;
  clause_text: string;
  similarity: number;
  document_type: string;
  jurisdiction: string;
}

export interface ConflictSearchResult {
  conflict_clause_id: string;
  conflict_text: string;
  conflict_document_title: string;
  conflict_document_type: string;
  similarity_score: number;
  jurisdiction: string;
}

// Database operation types
export interface DatabaseInsertResult<T = any> {
  data: T | null;
  error: DatabaseError | null;
  status: number;
  statusText: string;
}

export interface DatabaseSelectResult<T = any> {
  data: T[] | null;
  error: DatabaseError | null;
  count: number | null;
}

export interface DatabaseSingleResult<T = any> {
  data: T | null;
  error: DatabaseError | null;
}

export interface DatabaseError {
  message: string;
  details: string;
  hint?: string;
  code?: string;
}

// Upload and processing types
export interface DocumentUpload {
  file: File;
  title?: string;
  kind?: Document['kind'];
  jurisdiction?: Document['jurisdiction'];
  language?: string;
}

export interface AnalysisProgress {
  version_id: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  current_step: string;
  estimated_completion?: Date;
}

export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'uploaded' | 'error';
  versionId?: string;
  error?: string;
}

export interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}

// Advanced query types
export interface DocumentQuery {
  select?: string;
  filters?: {
    id?: string;
    title?: string;
    kind?: Document['kind'];
    jurisdiction?: Document['jurisdiction'];
    language?: string;
    created_after?: string;
    created_before?: string;
  };
  orderBy?: {
    column: keyof Document;
    ascending: boolean;
  };
  limit?: number;
  offset?: number;
}

export interface ClauseQuery {
  select?: string;
  filters?: {
    version_id?: string;
    clause_type?: Clause['clause_type'];
    text_contains?: string;
    sequence_order_gte?: number;
    sequence_order_lte?: number;
  };
  orderBy?: {
    column: keyof Clause;
    ascending: boolean;
  };
  limit?: number;
  offset?: number;
}

// Storage-related types
export interface StorageFileInfo {
  id: string;
  name: string;
  bucket_id: string;
  owner: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
  };
}

export interface StorageUploadOptions {
  cacheControl?: string;
  contentType?: string;
  duplex?: string;
  upsert?: boolean;
}

// Real-time subscription types
export interface RealtimeSubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
}

export interface RealtimePayload<T = any> {
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  columns: Array<{
    name: string;
    type: string;
  }>;
  record: T;
  old_record: T;
}

// Performance monitoring types
export interface ProcessingPipelineHealth {
  metric: string;
  value: number;
  status: 'ok' | 'warning' | 'critical';
}

export interface IndexUsageStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  scans: number;
  tuples_read: number;
  tuples_fetched: number;
}

// Utility types for database operations
export type DatabaseTable = 
  | 'documents' 
  | 'document_versions' 
  | 'clauses' 
  | 'embeddings' 
  | 'service_jobs' 
  | 'document_diffs' 
  | 'document_conflicts'
  | 'diffs' 
  | 'conflicts';

export type DatabaseOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

export type DatabaseFilter<T> = Partial<{
  [K in keyof T]: T[K] | T[K][] | {
    gte?: T[K];
    gt?: T[K];
    lte?: T[K];
    lt?: T[K];
    eq?: T[K];
    neq?: T[K];
    in?: T[K][];
    like?: string;
    ilike?: string;
    is?: null;
  };
}>;

// Type guards for runtime type checking
export function isDocument(obj: any): obj is Document {
  return obj && typeof obj === 'object' && 'id' in obj && 'title' in obj;
}

export function isDocumentVersion(obj: any): obj is DocumentVersion {
  return obj && typeof obj === 'object' && 'id' in obj && 'document_id' in obj && 'version_label' in obj;
}

export function isClause(obj: any): obj is Clause {
  return obj && typeof obj === 'object' && 'id' in obj && 'version_id' in obj && 'text' in obj;
}

export function isServiceJob(obj: any): obj is ServiceJobRecord {
  return obj && typeof obj === 'object' && 'id' in obj && 'service_type' in obj && 'status' in obj;
}

// Database configuration types
export interface DatabaseConfig {
  url: string;
  apiKey: string;
  serviceRoleKey?: string;
  options?: {
    schema?: string;
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    detectSessionInUrl?: boolean;
    headers?: Record<string, string>;
  };
}

export interface ConnectionPoolConfig {
  max: number;
  min: number;
  acquireTimeoutMs: number;
  createTimeoutMs: number;
  destroyTimeoutMs: number;
  idleTimeoutMs: number;
  reapIntervalMs: number;
  createRetryIntervalMs: number;
}

// Batch operation types
export interface BatchOperation<T> {
  operation: 'insert' | 'update' | 'delete';
  table: DatabaseTable;
  data: T | T[];
  options?: {
    onConflict?: string;
    returning?: string;
    count?: 'exact' | 'planned' | 'estimated';
  };
}

export interface BatchResult<T = any> {
  operation: DatabaseOperation;
  table: DatabaseTable;
  success: boolean;
  data?: T;
  error?: DatabaseError;
  affected_rows?: number;
}

// Types are already exported above, no need to re-export