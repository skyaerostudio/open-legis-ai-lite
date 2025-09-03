'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface UploadResult {
  success: boolean;
  document: {
    id: string;
    title: string;
    kind: string;
  };
  version: {
    id: string;
    processing_status: string;
  };
  message: string;
}

interface FileUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export default function FileUpload({ 
  onUploadComplete, 
  onUploadError, 
  className = '' 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('regulation');
  const [jurisdiction, setJurisdiction] = useState('national');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('html')) return '🌐';
    if (file.type.includes('word')) return '📝';
    return '📄';
  };

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported file type. Please upload PDF, HTML, DOC, or DOCX files.';
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      const sizeMB = Math.round(file.size / (1024 * 1024));
      return `File too large (${sizeMB}MB). Maximum size is 50MB.`;
    }
    
    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }
    
    setSelectedFile(file);
    setUploadError(null);
    setUploadResult(null);
    
    // Auto-fill title if not already set
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [title]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title || selectedFile.name);
      formData.append('kind', kind);
      formData.append('jurisdiction', jurisdiction);

      // Simulate upload progress (since FormData doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload failed with status ${response.status}`);
      }

      setUploadResult(result);
      setSelectedFile(null);
      setTitle('');
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
    setTitle('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <Card className="w-full">
        <CardContent className="p-6">
          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
              ${selectedFile ? 'border-primary bg-primary/5' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">{getFileIcon(selectedFile)}</span>
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(selectedFile.size / 1024)} KB • {selectedFile.type}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetUpload}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Form Fields */}
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <Label htmlFor="document-title">Document Title</Label>
                    <Input
                      id="document-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter document title..."
                      disabled={isUploading}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document-kind">Document Type</Label>
                      <select
                        id="document-kind"
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                        disabled={isUploading}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      >
                        <option value="law">Law</option>
                        <option value="regulation">Regulation</option>
                        <option value="draft">Draft</option>
                        <option value="decree">Decree</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="jurisdiction">Jurisdiction</Label>
                      <select
                        id="jurisdiction"
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        disabled={isUploading}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      >
                        <option value="national">National</option>
                        <option value="provincial">Provincial</option>
                        <option value="municipal">Municipal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop your document here</p>
                  <p className="text-muted-foreground">
                    or{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse to upload
                    </Button>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports PDF, HTML, DOC, DOCX • Max 50MB
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            accept=".pdf,.html,.doc,.docx"
            className="hidden"
            disabled={isUploading}
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && !isUploading && !uploadResult && (
            <div className="mt-4 flex justify-center">
              <Button onClick={handleUpload} className="w-full max-w-md">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          )}

          {/* Success Result */}
          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Upload Successful!</h4>
                  <p className="text-sm text-green-700 mt-1">{uploadResult.message}</p>
                  <div className="mt-2 text-xs text-green-600">
                    <p>Document ID: {uploadResult.document.id}</p>
                    <p>Processing Status: {uploadResult.version.processing_status}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">Upload Error</h4>
                  <p className="text-sm text-red-700 mt-1">{uploadError}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setUploadError(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}