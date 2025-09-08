// Processing pipeline and job management types

export interface ServiceJob {
  id: string;
  service_type: 'ringkasan' | 'perubahan' | 'konflik';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  version_ids: string[];
  result_data?: any;
  error_message?: string;
  is_public: boolean;
  shared_at?: string;
  created_at: string;
  updated_at: string;
}

// Service-specific job configurations
export interface ServiceJobConfig {
  service_type: ServiceJob['service_type'];
  display_name: string;
  description: string;
  max_documents: number;
  min_documents: number;
  estimated_time_minutes: number;
  processing_steps: ProcessingStepConfig[];
}

export interface ProcessingStepConfig {
  key: string;
  title: string;
  description: string;
  estimated_duration_ms: number;
  can_retry: boolean;
  dependencies: string[];
}

export const SERVICE_JOB_CONFIGS: Record<ServiceJob['service_type'], ServiceJobConfig> = {
  ringkasan: {
    service_type: 'ringkasan',
    display_name: 'Ringkasan Bahasa Sederhana',
    description: 'Membuat ringkasan dokumen hukum dalam bahasa yang mudah dipahami',
    max_documents: 1,
    min_documents: 1,
    estimated_time_minutes: 3,
    processing_steps: [
      {
        key: 'downloading',
        title: 'Mengunduh Dokumen',
        description: 'Menyiapkan dokumen untuk dianalisis',
        estimated_duration_ms: 30000,
        can_retry: true,
        dependencies: [],
      },
      {
        key: 'extracting',
        title: 'Mengekstrak Teks',
        description: 'Mengambil teks dari dokumen PDF',
        estimated_duration_ms: 90000,
        can_retry: true,
        dependencies: ['downloading'],
      },
      {
        key: 'parsing',
        title: 'Menganalisis Struktur',
        description: 'Memahami struktur dokumen hukum Indonesia',
        estimated_duration_ms: 30000,
        can_retry: true,
        dependencies: ['extracting'],
      },
      {
        key: 'analyzing',
        title: 'Membuat Ringkasan',
        description: 'AI sedang membuat ringkasan dalam bahasa sederhana',
        estimated_duration_ms: 120000,
        can_retry: false,
        dependencies: ['parsing'],
      },
    ],
  },
  perubahan: {
    service_type: 'perubahan',
    display_name: 'Deteksi Perubahan',
    description: 'Membandingkan dua versi dokumen untuk menemukan perubahan',
    max_documents: 2,
    min_documents: 2,
    estimated_time_minutes: 4,
    processing_steps: [
      {
        key: 'downloading',
        title: 'Mengunduh Dokumen',
        description: 'Menyiapkan kedua dokumen untuk dianalisis',
        estimated_duration_ms: 45000,
        can_retry: true,
        dependencies: [],
      },
      {
        key: 'extracting',
        title: 'Mengekstrak Teks',
        description: 'Mengambil teks dari kedua dokumen PDF',
        estimated_duration_ms: 120000,
        can_retry: true,
        dependencies: ['downloading'],
      },
      {
        key: 'parsing',
        title: 'Menganalisis Struktur',
        description: 'Memahami struktur kedua dokumen hukum',
        estimated_duration_ms: 45000,
        can_retry: true,
        dependencies: ['extracting'],
      },
      {
        key: 'analyzing',
        title: 'Membandingkan Dokumen',
        description: 'Mencari perbedaan antar dokumen pasal per pasal',
        estimated_duration_ms: 150000,
        can_retry: false,
        dependencies: ['parsing'],
      },
    ],
  },
  konflik: {
    service_type: 'konflik',
    display_name: 'Deteksi Konflik',
    description: 'Mendeteksi potensi konflik dengan peraturan yang sudah ada',
    max_documents: 1,
    min_documents: 1,
    estimated_time_minutes: 5,
    processing_steps: [
      {
        key: 'downloading',
        title: 'Mengunduh Dokumen',
        description: 'Menyiapkan dokumen untuk dianalisis',
        estimated_duration_ms: 30000,
        can_retry: true,
        dependencies: [],
      },
      {
        key: 'extracting',
        title: 'Mengekstrak Teks',
        description: 'Mengambil teks dari dokumen PDF',
        estimated_duration_ms: 90000,
        can_retry: true,
        dependencies: ['downloading'],
      },
      {
        key: 'parsing',
        title: 'Menganalisis Struktur',
        description: 'Memahami struktur dokumen hukum Indonesia',
        estimated_duration_ms: 30000,
        can_retry: true,
        dependencies: ['extracting'],
      },
      {
        key: 'analyzing',
        title: 'Mendeteksi Konflik',
        description: 'Mencari konflik dengan database peraturan yang ada',
        estimated_duration_ms: 180000,
        can_retry: false,
        dependencies: ['parsing'],
      },
    ],
  },
} as const;

// Job creation and management
export interface CreateJobRequest {
  service_type: ServiceJob['service_type'];
  document_versions: string[];
  metadata?: Record<string, any>;
}

export interface CreateJobResponse {
  success: boolean;
  job_id?: string;
  error?: string;
  estimated_completion?: string;
}

// Processing state management
export interface ProcessingState {
  jobId: string;
  serviceType: ServiceJob['service_type'];
  status: ServiceJob['status'];
  progress: number;
  currentStep: string;
  stepProgress: number;
  estimatedTimeRemaining?: number;
  startedAt: Date;
  lastUpdated: Date;
  steps: ProcessingStepState[];
  error?: ProcessingError;
}

export interface ProcessingStepState {
  key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  canRetry: boolean;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
  suggestedAction?: string;
}

// Background processing management
export interface ProcessingQueue {
  pending: ServiceJob[];
  processing: ServiceJob[];
  completed: ServiceJob[];
  failed: ServiceJob[];
  totalJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface ProcessingWorker {
  id: string;
  status: 'idle' | 'processing' | 'error';
  currentJobId?: string;
  lastActivity: Date;
  processedJobs: number;
  errorCount: number;
}

// Real-time status updates
export interface StatusUpdate {
  jobId: string;
  timestamp: Date;
  status: ServiceJob['status'];
  progress: number;
  currentStep: string;
  message?: string;
  error?: ProcessingError;
  metadata?: Record<string, any>;
}

export interface StatusSubscription {
  jobId: string;
  callback: (update: StatusUpdate) => void;
  onError?: (error: Error) => void;
  onComplete?: (finalStatus: ServiceJob) => void;
}

// Retry and recovery
export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export interface RetryAttempt {
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  error?: ProcessingError;
  success: boolean;
}

// Processing metrics and monitoring
export interface ProcessingMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  serviceBreakdown: Record<ServiceJob['service_type'], {
    count: number;
    successRate: number;
    averageTime: number;
  }>;
  errorBreakdown: Record<string, number>;
  peakLoadTimes: Array<{
    hour: number;
    jobCount: number;
  }>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  totalProcessedJobs: number;
  currentLoad: number;
  queueSize: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck: Date;
  services: Record<ServiceJob['service_type'], {
    status: 'active' | 'degraded' | 'inactive';
    responseTime: number;
    errorRate: number;
  }>;
}

// Validation and error types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// Export utility types
export type ServiceTypeUnion = ServiceJob['service_type'];
export type JobStatusUnion = ServiceJob['status'];
export type ProcessingStepStatusUnion = ProcessingStepState['status'];