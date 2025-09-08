'use client';

import { useState, useCallback, useMemo } from 'react';
import { SERVICE_JOB_CONFIGS, type ServiceJob, type ServiceJobConfig } from '@/types/processing';

interface UseServiceSelectionReturn {
  selectedService: ServiceJob['service_type'] | null;
  serviceConfig: ServiceJobConfig | null;
  setSelectedService: (service: ServiceJob['service_type'] | null) => void;
  validateFileCount: (fileCount: number) => ValidationResult;
  isValidFileCount: (fileCount: number) => boolean;
  getUploadInstructions: () => string;
  getEstimatedTime: () => string;
  resetSelection: () => void;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export const useServiceSelection = (): UseServiceSelectionReturn => {
  const [selectedService, setSelectedService] = useState<ServiceJob['service_type'] | null>(null);

  // Get service configuration for selected service
  const serviceConfig = useMemo(() => {
    if (!selectedService) return null;
    return SERVICE_JOB_CONFIGS[selectedService];
  }, [selectedService]);

  // Validate file count against service requirements
  const validateFileCount = useCallback((fileCount: number): ValidationResult => {
    if (!serviceConfig) {
      return {
        isValid: false,
        error: 'Harap pilih layanan terlebih dahulu'
      };
    }

    const { min_documents, max_documents, display_name } = serviceConfig;

    if (fileCount < min_documents) {
      return {
        isValid: false,
        error: `${display_name} membutuhkan ${min_documents === 1 ? 'satu' : min_documents} dokumen${min_documents > 1 ? ' untuk perbandingan' : ''}`
      };
    }

    if (fileCount > max_documents) {
      return {
        isValid: false,
        error: `${display_name} hanya dapat memproses maksimal ${max_documents} dokumen sekaligus`
      };
    }

    return { isValid: true };
  }, [serviceConfig]);

  // Simple boolean check for file count validation
  const isValidFileCount = useCallback((fileCount: number): boolean => {
    return validateFileCount(fileCount).isValid;
  }, [validateFileCount]);

  // Get upload instructions based on selected service
  const getUploadInstructions = useCallback((): string => {
    if (!serviceConfig) {
      return 'Pilih layanan untuk melihat instruksi upload';
    }

    const { service_type, min_documents, max_documents } = serviceConfig;

    switch (service_type) {
      case 'ringkasan':
        return 'Upload satu dokumen hukum untuk dianalisis dan diringkas dalam bahasa yang mudah dipahami.';
      
      case 'perubahan':
        return 'Upload dua versi dokumen untuk membandingkan perubahan. File pertama adalah versi lama, file kedua adalah versi baru.';
      
      case 'konflik':
        return 'Upload satu dokumen hukum untuk mendeteksi potensi konflik dengan peraturan yang sudah ada.';
      
      default:
        return `Upload ${min_documents === max_documents 
          ? min_documents 
          : `${min_documents}-${max_documents}`} dokumen untuk diproses.`;
    }
  }, [serviceConfig]);

  // Get estimated processing time
  const getEstimatedTime = useCallback((): string => {
    if (!serviceConfig) {
      return '';
    }

    const { estimated_time_minutes } = serviceConfig;
    
    if (estimated_time_minutes < 60) {
      return `Estimasi waktu: ${estimated_time_minutes} menit`;
    }
    
    const hours = Math.floor(estimated_time_minutes / 60);
    const minutes = estimated_time_minutes % 60;
    
    if (minutes === 0) {
      return `Estimasi waktu: ${hours} jam`;
    }
    
    return `Estimasi waktu: ${hours} jam ${minutes} menit`;
  }, [serviceConfig]);

  // Reset selection
  const resetSelection = useCallback(() => {
    setSelectedService(null);
  }, []);

  return {
    selectedService,
    serviceConfig,
    setSelectedService,
    validateFileCount,
    isValidFileCount,
    getUploadInstructions,
    getEstimatedTime,
    resetSelection
  };
};

// Hook for managing form state with service selection
export const useServiceSelectionForm = () => {
  const serviceSelection = useServiceSelection();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add file to selection
  const addFile = useCallback((file: File) => {
    setFiles(prev => {
      const newFiles = [...prev, file];
      const validation = serviceSelection.validateFileCount(newFiles.length);
      
      if (!validation.isValid) {
        setFormError(validation.error || 'Invalid file count');
        return prev; // Don't add file if it would make count invalid
      }
      
      setFormError(null);
      return newFiles;
    });
  }, [serviceSelection]);

  // Remove file from selection
  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFormError(null);
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
    setFormError(null);
  }, []);

  // Validate form for submission
  const validateForm = useCallback((): ValidationResult => {
    if (!serviceSelection.selectedService) {
      return {
        isValid: false,
        error: 'Harap pilih layanan terlebih dahulu'
      };
    }

    const fileValidation = serviceSelection.validateFileCount(files.length);
    if (!fileValidation.isValid) {
      return fileValidation;
    }

    // Check for valid file types (PDF, HTML)
    const invalidFiles = files.filter(file => {
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      return !(
        type === 'application/pdf' ||
        type === 'text/html' ||
        name.endsWith('.pdf') ||
        name.endsWith('.html') ||
        name.endsWith('.htm')
      );
    });

    if (invalidFiles.length > 0) {
      return {
        isValid: false,
        error: `File tidak didukung: ${invalidFiles.map(f => f.name).join(', ')}. Hanya mendukung PDF dan HTML.`
      };
    }

    // Check file sizes (50MB limit)
    const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return {
        isValid: false,
        error: `File terlalu besar: ${oversizedFiles.map(f => f.name).join(', ')}. Maksimal 50MB per file.`
      };
    }

    return { isValid: true };
  }, [serviceSelection, files]);

  // Check if form is ready for submission
  const isFormValid = useMemo(() => {
    return validateForm().isValid;
  }, [validateForm]);

  // Reset form
  const resetForm = useCallback(() => {
    serviceSelection.resetSelection();
    clearFiles();
    setIsSubmitting(false);
    setFormError(null);
  }, [serviceSelection, clearFiles]);

  return {
    ...serviceSelection,
    files,
    addFile,
    removeFile,
    clearFiles,
    isSubmitting,
    setIsSubmitting,
    formError,
    setFormError,
    validateForm,
    isFormValid,
    resetForm
  };
};