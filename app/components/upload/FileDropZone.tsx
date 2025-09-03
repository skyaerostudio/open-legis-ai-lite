'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles: number;
  acceptedTypes: string[];
  maxFileSize: number;
  disabled?: boolean;
  uploadInstructions?: string;
}

export default function FileDropZone({ 
  onFilesSelected, 
  maxFiles, 
  acceptedTypes, 
  maxFileSize, 
  disabled, 
  uploadInstructions 
}: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateFiles = useCallback((files: FileList): { validFiles: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    const filesToCheck = Math.min(files.length, maxFiles);
    
    for (let i = 0; i < filesToCheck; i++) {
      const file = files[i];
      
      // Validate file type
      if (!acceptedTypes.some(type => file.type.includes(type))) {
        errors.push(`${file.name}: Format tidak didukung. Gunakan PDF atau HTML.`);
        continue;
      }
      
      // Validate file size (50MB = 50 * 1024 * 1024 bytes)
      if (file.size > maxFileSize) {
        const sizeMB = Math.round(maxFileSize / (1024 * 1024));
        errors.push(`${file.name}: File terlalu besar. Maksimal ${sizeMB}MB.`);
        continue;
      }
      
      validFiles.push(file);
    }

    // Check if too many files were selected
    if (files.length > maxFiles) {
      errors.push(`Terlalu banyak file. Maksimal ${maxFiles} file.`);
    }
    
    return { validFiles, errors };
  }, [acceptedTypes, maxFileSize, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    const { validFiles, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      setUploadError(errors[0]);
    } else {
      setUploadError(null);
    }
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [disabled, validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // CRITICAL: Must preventDefault to enable drop
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set drag inactive if we're leaving the drop zone itself, not child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const { validFiles, errors } = validateFiles(files);
      
      if (errors.length > 0) {
        setUploadError(errors[0]);
      } else {
        setUploadError(null);
      }
      
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [validateFiles, onFilesSelected]);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          isDragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">
          Seret dan lepas file di sini atau klik untuk pilih
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {uploadInstructions || `Format yang didukung: PDF, HTML (maksimal ${Math.round(maxFileSize / (1024 * 1024))}MB)`}
        </p>
        <input
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="sr-only"
          id="file-input"
          disabled={disabled}
        />
        <label
          htmlFor="file-input"
          className={cn(
            "mt-4 cursor-pointer rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          Pilih File
        </label>
      </div>
      
      {uploadError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">❌ Error:</p>
          <p className="text-red-700">{uploadError}</p>
        </div>
      )}
    </div>
  );
}