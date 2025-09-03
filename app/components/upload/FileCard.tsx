'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Download,
  MoreVertical,
  Calendar
} from 'lucide-react';

interface DocumentVersion {
  id: string;
  version_label: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  pages?: number;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  kind: string;
  jurisdiction?: string;
  created_at: string;
  document_versions: DocumentVersion[];
}

interface FileCardProps {
  document: Document;
  onView?: (documentId: string) => void;
  onRetryProcessing?: (versionId: string) => void;
  className?: string;
}

export default function FileCard({ 
  document, 
  onView, 
  onRetryProcessing, 
  className = '' 
}: FileCardProps) {
  const [processingStatus, setProcessingStatus] = useState<string>('pending');
  const [isPolling, setIsPolling] = useState(false);

  const latestVersion = document.document_versions?.[0];

  // Poll for processing status updates
  useEffect(() => {
    if (!latestVersion) return;

    const status = latestVersion.processing_status;
    setProcessingStatus(status);

    if (status === 'processing' && !isPolling) {
      setIsPolling(true);
      
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/process?version_id=${latestVersion.id}`);
          const data = await response.json();
          
          if (data.status && data.status !== 'processing') {
            setProcessingStatus(data.status);
            setIsPolling(false);
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Poll every 3 seconds

      return () => {
        clearInterval(pollInterval);
        setIsPolling(false);
      };
    }
  }, [latestVersion, isPolling]);

  const getStatusIcon = () => {
    switch (processingStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (processingStatus) {
      case 'completed':
        return 'Processing complete';
      case 'processing':
        return 'Processing document...';
      case 'failed':
        return 'Processing failed';
      case 'pending':
        return 'Queued for processing';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (processingStatus) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getKindBadge = (kind: string) => {
    const kindStyles = {
      law: 'bg-blue-100 text-blue-800',
      regulation: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      decree: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };

    return kindStyles[kind as keyof typeof kindStyles] || kindStyles.other;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRetryProcessing = () => {
    if (latestVersion && onRetryProcessing) {
      onRetryProcessing(latestVersion.id);
    }
  };

  return (
    <Card className={`w-full hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate">
                {document.title}
              </h3>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKindBadge(document.kind)}`}>
                  {document.kind}
                </span>
                
                {document.jurisdiction && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {document.jurisdiction}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(document.created_at)}</span>
                {latestVersion?.pages && (
                  <>
                    <span>•</span>
                    <span>{latestVersion.pages} pages</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Processing Status */}
        <div className="flex items-center space-x-2 mb-4">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Processing Progress (for processing status) */}
        {processingStatus === 'processing' && (
          <div className="mb-4">
            <Progress value={undefined} className="h-2" /> {/* Indeterminate progress */}
            <p className="text-xs text-muted-foreground mt-1">
              Extracting text and generating embeddings...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {processingStatus === 'completed' && (
            <>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onView?.(document.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Analysis
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </>
          )}
          
          {processingStatus === 'failed' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRetryProcessing}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Retry Processing
            </Button>
          )}
          
          {(processingStatus === 'pending' || processingStatus === 'processing') && (
            <Button variant="outline" size="sm" disabled>
              <Clock className="mr-2 h-4 w-4" />
              Processing...
            </Button>
          )}
        </div>

        {/* Version Info */}
        {latestVersion && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Version: {latestVersion.version_label}</span>
              <span>ID: {document.id.slice(-8)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}