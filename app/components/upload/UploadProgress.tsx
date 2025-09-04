'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Upload,
  CheckCircle, 
  AlertCircle, 
  FileText,
  X
} from 'lucide-react';
import type { UploadProgress as UploadProgressType } from '@/types/documents';

interface UploadProgressProps {
  uploads: UploadProgressType[];
  onRemoveUpload?: (fileIndex: number) => void;
  onRetryUpload?: (fileIndex: number) => void;
  className?: string;
}

export default function UploadProgress({ 
  uploads, 
  onRemoveUpload,
  onRetryUpload,
  className = '' 
}: UploadProgressProps) {
  if (uploads.length === 0) {
    return null;
  }

  const getStatusIcon = (status: UploadProgressType['status']) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: UploadProgressType['status']) => {
    switch (status) {
      case 'uploaded':
        return 'border-green-200 bg-green-50';
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({uploads.length} file{uploads.length !== 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {uploads.map((upload, index) => (
          <div 
            key={upload.fileIndex} 
            className={`p-4 rounded-lg border ${getStatusColor(upload.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getStatusIcon(upload.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {upload.fileName}
                  </h4>
                  
                  {upload.status === 'uploading' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {upload.progress}%
                    </p>
                  )}
                  
                  {upload.status === 'uploaded' && (
                    <p className="text-xs text-green-700 mt-1">
                      ✅ Upload complete
                      {upload.versionId && (
                        <span className="ml-2 font-mono text-xs">
                          ID: {upload.versionId.substring(0, 8)}...
                        </span>
                      )}
                    </p>
                  )}
                  
                  {upload.status === 'error' && upload.error && (
                    <p className="text-xs text-red-700 mt-1">
                      ❌ {upload.error}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {upload.status === 'error' && onRetryUpload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryUpload(upload.fileIndex)}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                )}
                
                {onRemoveUpload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveUpload(upload.fileIndex)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {upload.status === 'uploading' && (
              <Progress 
                value={upload.progress} 
                className="h-2" 
              />
            )}
          </div>
        ))}
        
        {/* Summary */}
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {uploads.filter(u => u.status === 'uploaded').length} uploaded, {' '}
              {uploads.filter(u => u.status === 'uploading').length} uploading, {' '}
              {uploads.filter(u => u.status === 'error').length} failed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}