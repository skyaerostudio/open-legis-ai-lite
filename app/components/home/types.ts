import { LucideIcon } from 'lucide-react';

export type ServiceType = 'ringkasan' | 'perubahan' | 'konflik';

export interface ServiceConfig {
  id: ServiceType;
  title: string;
  description: string;
  icon: LucideIcon;
  uploadInstructions: string;
  maxFiles: number;
  workflowSteps: Array<{
    number: number;
    title: string;
    description: string;
  }>;
}

export interface AppState {
  selectedService: ServiceType | null;
  uploadedFiles: File[];
  isUploading: boolean;
  uploadError: string | null;
}

export interface FileValidation {
  isValid: boolean;
  error?: string;
  file: File;
}