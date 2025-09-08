'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import type { UploadProgress } from '@/types/documents';

interface UseUploadWithProgressReturn {
  uploads: UploadProgress[];
  uploadFile: (
    file: File, 
    serviceType: string,
    onProgress?: (progress: number) => void
  ) => Promise<any>;
  clearUploads: () => void;
  removeUpload: (fileIndex: number) => void;
}

export const useUploadWithProgress = (): UseUploadWithProgressReturn => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  
  const uploadFile = useCallback(async (
    file: File, 
    serviceType: string,
    onProgress?: (progress: number) => void
  ) => {
    const fileIndex = uploads.length;
    
    // Add file to upload state
    const newUpload: UploadProgress = {
      fileIndex,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    };
    
    setUploads(prev => [...prev, newUpload]);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('service_type', serviceType);
    
    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event: any) => {
          if (event.total) {
            const progress = Math.round((event.loaded * 100) / event.total);
            
            // Update upload state
            setUploads(prev => prev.map(upload => 
              upload.fileIndex === fileIndex
                ? { ...upload, progress }
                : upload
            ));
            
            // Call optional progress callback
            onProgress?.(progress);
          }
        },
      };
      
      const response = await axios.post('/api/upload', formData, config as any);
      
      // Update upload state to completed
      setUploads(prev => prev.map(upload => 
        upload.fileIndex === fileIndex
          ? { 
              ...upload, 
              status: 'uploaded', 
              progress: 100,
              versionId: (response.data as any)?.version?.id,
              jobId: (response.data as any)?.job?.id 
            }
          : upload
      ));
      
      return response.data; // Contains document, version, and job info
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Upload failed';
      
      // Update upload state to error
      setUploads(prev => prev.map(upload => 
        upload.fileIndex === fileIndex
          ? { 
              ...upload, 
              status: 'error', 
              error: errorMessage 
            }
          : upload
      ));
      
      throw error;
    }
  }, [uploads.length]);
  
  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);
  
  const removeUpload = useCallback((fileIndex: number) => {
    setUploads(prev => prev.filter(upload => upload.fileIndex !== fileIndex));
  }, []);
  
  return { 
    uploads, 
    uploadFile, 
    clearUploads, 
    removeUpload 
  };
};