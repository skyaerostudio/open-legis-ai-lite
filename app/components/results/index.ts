// Results components barrel export
// Provides a centralized export point for all result display components

// Core result display components
export { default as DocumentSummary } from './DocumentSummary';
export { default as DocumentComparison } from './DocumentComparison';
export { default as ConflictDetection } from './ConflictDetection';
export { default as ProcessingProgress } from './ProcessingProgress';

// Navigation and layout components
export { default as ResultsNavigation } from './ResultsNavigation';
export { default as ExportButton } from './ExportButton';

// Legacy components (for backward compatibility)
export { default as DocumentResults } from './DocumentResults';
export { default as ResultsLoading } from './ResultsLoading';
export { default as ClausesView } from './ClausesView';
export { default as ConflictsView } from './ConflictsView';

// Re-export types for convenience (if needed by consumers)
export type {
  DocumentSummary as DocumentSummaryType,
  DocumentComparison as DocumentComparisonType,
  ConflictDetection as ConflictDetectionType,
  DocumentDiff,
  ConflictFlag,
  ExportConfiguration
} from '@/types/analysis';

export type {
  ServiceJob,
  ProcessingState,
  ProcessingStepState,
  ProcessingError,
  StatusUpdate
} from '@/types/processing';

// Component prop types for easier imports
export interface ResultsNavigationProps {
  jobId: string;
  serviceType: 'ringkasan' | 'perubahan' | 'konflik';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: {
    summary?: any;
    comparison?: any;
    conflicts?: any;
  };
  className?: string;
  onShare?: () => void;
  onExport?: (format: 'pdf' | 'docx') => void;
  onBack?: () => void;
}

export interface ProcessingProgressProps {
  jobId: string;
  serviceType: 'ringkasan' | 'perubahan' | 'konflik';
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface ExportButtonProps {
  jobId: string;
  serviceType: 'ringkasan' | 'perubahan' | 'konflik';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onExportStart?: (format: string) => void;
  onExportComplete?: (downloadUrl: string) => void;
  onExportError?: (error: string) => void;
}

// Utility functions and constants
export const SERVICE_TYPE_LABELS = {
  ringkasan: 'Ringkasan Bahasa Sederhana',
  perubahan: 'Deteksi Perubahan',
  konflik: 'Deteksi Konflik'
} as const;

export const STATUS_LABELS = {
  pending: 'Menunggu',
  processing: 'Memproses',
  completed: 'Selesai',
  failed: 'Gagal'
} as const;

export const EXPORT_FORMATS = {
  pdf: 'PDF Document',
  docx: 'Microsoft Word',
  html: 'Web Page',
  json: 'JSON Data',
  csv: 'CSV Spreadsheet'
} as const;

// Helper functions
export const getServiceTypeLabel = (serviceType: string) => {
  return SERVICE_TYPE_LABELS[serviceType as keyof typeof SERVICE_TYPE_LABELS] || serviceType;
};

export const getStatusLabel = (status: string) => {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
};

export const getExportFormatLabel = (format: string) => {
  return EXPORT_FORMATS[format as keyof typeof EXPORT_FORMATS] || format.toUpperCase();
};