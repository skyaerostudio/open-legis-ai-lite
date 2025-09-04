'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import FileDropZone from '@/components/upload/FileDropZone';
import UploadProgress from '@/components/upload/UploadProgress';
import { useUploadWithProgress } from '@/hooks/useUploadWithProgress';
import type { ServiceType, ServiceConfig } from './types';

interface UploadWorkflowManagerProps {
  selectedService: ServiceType;
  serviceConfig: ServiceConfig;
  className?: string;
}

export default function UploadWorkflowManager({
  selectedService,
  serviceConfig,
  className = ''
}: UploadWorkflowManagerProps) {
  const { uploads, uploadFile, clearUploads, removeUpload } = useUploadWithProgress();
  const [processingVersions, setProcessingVersions] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);

    try {
      console.log(`Starting upload of ${files.length} files for service: ${selectedService}`);
      
      const uploadPromises = files.map(async (file, index) => {
        console.log(`Uploading file ${index + 1}/${files.length}:`, file.name);
        
        const result = await uploadFile(
          file, 
          selectedService,
          (progress) => {
            console.log(`Upload progress for ${file.name}: ${progress}%`);
          }
        );
        
        console.log('Upload completed:', result);
        
        // Track processing version ID
        if (result.version?.id) {
          setProcessingVersions(prev => [...prev, result.version.id]);
        }
        
        return result;
      });
      
      const results = await Promise.all(uploadPromises);
      console.log('All uploads completed:', results);
      
      // Handle navigation based on service type
      if (results.length === 1 && results[0].version?.id) {
        // Single file services - navigate to processing page
        console.log('Navigating to processing page:', results[0].version.id);
        setTimeout(() => {
          router.push(`/processing/${results[0].version.id}`);
        }, 1500); // Give user time to see upload completion
      } else if (results.length > 1) {
        // Multiple file services - could navigate to batch processing page
        console.log('Multiple files uploaded, staying on current page');
        // For now, stay on the current page to show processing status
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Upload failed. Please try again.';
      
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = async (fileIndex: number) => {
    const failedUpload = uploads.find(upload => upload.fileIndex === fileIndex);
    if (failedUpload) {
      console.log('Retrying upload for:', failedUpload.fileName);
      // This would require storing the original File object
      // For now, we'll ask user to re-select the file
      setUploadError('Please re-select the file to retry upload.');
    }
  };

  const handleClearUploads = () => {
    clearUploads();
    setProcessingVersions([]);
    setUploadError(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Upload Area */}
      <FileDropZone
        onFilesSelected={handleFileUpload}
        maxFiles={serviceConfig.maxFiles}
        acceptedTypes={['pdf', 'html']}
        maxFileSize={50 * 1024 * 1024} // 50MB
        disabled={isUploading}
        uploadInstructions={serviceConfig.uploadInstructions}
      />
      
      {/* Upload Progress Display */}
      {uploads.length > 0 && (
        <UploadProgress
          uploads={uploads}
          onRemoveUpload={removeUpload}
          onRetryUpload={handleRetryUpload}
        />
      )}
      
      {/* Upload Error Display */}
      {uploadError && (
        <Card>
          <CardContent className="p-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 text-red-400">❌</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Upload Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {uploadError}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 rounded"
                      onClick={() => setUploadError(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Success State with Clear Option */}
      {uploads.length > 0 && uploads.every(upload => upload.status === 'uploaded') && (
        <Card>
          <CardContent className="p-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    ✅ Upload Complete
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    {uploads.length} file{uploads.length !== 1 ? 's' : ''} uploaded successfully.
                    {processingVersions.length > 0 && ' Processing has started.'}
                  </div>
                </div>
                <button
                  type="button"
                  className="bg-green-100 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-200 rounded"
                  onClick={handleClearUploads}
                >
                  Upload New Files
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}