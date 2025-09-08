// Document management types matching the enhanced database schema

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

export interface LegalClause extends Clause {
  clause_type: NonNullable<Clause['clause_type']>;
  clause_ref: string;
  sequence_order: number;
}

export interface Embedding {
  id: string;
  clause_id: string;
  vector: number[];
  model_name: string;
  created_at: string;
}

// Document upload and validation types
export interface DocumentUpload {
  file: File;
  title?: string;
  kind?: Document['kind'];
  jurisdiction?: Document['jurisdiction'];
  language?: string;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    size: number;
    type: string;
    name: string;
    lastModified: Date;
  };
}

export interface UploadValidationRules {
  maxSize: number;
  allowedTypes: string[];
  maxFiles: number;
  minFiles: number;
  requiresTitle: boolean;
}

// Service type configuration for upload validation
export interface ServiceUploadConfig {
  service: 'ringkasan' | 'perubahan' | 'konflik';
  validation: UploadValidationRules;
  description: string;
  examples: string[];
}

export const SERVICE_UPLOAD_CONFIGS: Record<string, ServiceUploadConfig> = {
  ringkasan: {
    service: 'ringkasan',
    validation: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['application/pdf'],
      maxFiles: 1,
      minFiles: 1,
      requiresTitle: false,
    },
    description: 'Analisis dokumen tunggal untuk ringkasan bahasa sederhana',
    examples: ['Undang-undang', 'Peraturan Pemerintah', 'Keputusan Menteri'],
  },
  perubahan: {
    service: 'perubahan',
    validation: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['application/pdf'],
      maxFiles: 2,
      minFiles: 2,
      requiresTitle: false,
    },
    description: 'Perbandingan dua versi dokumen untuk deteksi perubahan',
    examples: ['Versi lama vs versi baru UU', 'Draft vs final regulation'],
  },
  konflik: {
    service: 'konflik',
    validation: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['application/pdf'],
      maxFiles: 1,
      minFiles: 1,
      requiresTitle: false,
    },
    description: 'Deteksi konflik dokumen dengan peraturan yang sudah ada',
    examples: ['Draft peraturan baru', 'Usulan perubahan regulasi'],
  },
} as const;

// Progress tracking types
export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'uploaded' | 'error';
  versionId?: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface ProcessingProgress {
  versionId: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// Multi-file processing for comparison services
export interface MultiDocumentProgress {
  jobId: string;
  serviceType: 'ringkasan' | 'perubahan' | 'konflik';
  overallProgress: number; // 0-100
  documents: ProcessingProgress[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// Search and retrieval types
export interface DocumentSearchQuery {
  query: string;
  filters: {
    kind?: Document['kind'][];
    jurisdiction?: Document['jurisdiction'][];
    dateRange?: {
      from: string;
      to: string;
    };
  };
  sortBy: 'relevance' | 'date' | 'title';
  limit: number;
}

export interface DocumentSearchResult {
  document: Document;
  version: DocumentVersion;
  relevanceScore: number;
  matchedClauses: Array<{
    clause: Clause;
    similarity: number;
    context: string;
  }>;
}

// Legal document structure types
export interface IndonesianLegalStructure {
  bab?: Array<{
    number: string;
    title: string;
    clauses: Clause[];
  }>;
  bagian?: Array<{
    number: string;
    title: string;
    clauses: Clause[];
  }>;
  paragraf?: Array<{
    number: string;
    title: string;
    clauses: Clause[];
  }>;
  pasal: Array<{
    number: string;
    clauses: Clause[];
    ayat?: Array<{
      number: string;
      text: string;
      huruf?: Array<{
        letter: string;
        text: string;
        angka?: Array<{
          number: string;
          text: string;
        }>;
      }>;
    }>;
  }>;
}

// Export utility type for easier imports
export type ServiceType = keyof typeof SERVICE_UPLOAD_CONFIGS;