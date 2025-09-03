'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Zap, 
  Database,
  Sparkles
} from 'lucide-react';

interface ProcessingStatusProps {
  versionId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}

export default function ProcessingStatus({ 
  versionId, 
  onComplete, 
  onError, 
  className = '' 
}: ProcessingStatusProps) {
  const [overallStatus, setOverallStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [currentStage, setCurrentStage] = useState(0);
  const [stages, setStages] = useState<ProcessingStage[]>([
    {
      id: 'download',
      name: 'Downloading Document',
      description: 'Retrieving file from storage',
      icon: <FileText className="h-4 w-4" />,
      status: 'processing',
      progress: 0
    },
    {
      id: 'extract',
      name: 'Text Extraction',
      description: 'Extracting text and segmenting clauses',
      icon: <Zap className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'embeddings',
      name: 'Generating Embeddings',
      description: 'Creating AI embeddings for semantic search',
      icon: <Sparkles className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'store',
      name: 'Storing Data',
      description: 'Saving processed data to database',
      icon: <Database className="h-4 w-4" />,
      status: 'pending'
    }
  ]);
  
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  // Update elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Poll for processing updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let stageUpdateInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/process?version_id=${versionId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          // Complete all stages
          setStages(prev => prev.map(stage => ({
            ...stage,
            status: 'completed' as const,
            progress: 100
          })));
          setOverallStatus('completed');
          clearInterval(pollInterval);
          clearInterval(stageUpdateInterval);
          onComplete?.(data);
          
        } else if (data.status === 'failed') {
          // Mark current stage as failed
          setStages(prev => prev.map((stage, index) => ({
            ...stage,
            status: index === currentStage ? 'failed' as const : stage.status
          })));
          setOverallStatus('failed');
          clearInterval(pollInterval);
          clearInterval(stageUpdateInterval);
          onError?.('Processing failed');
        }
        
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    // Start polling every 3 seconds
    pollInterval = setInterval(pollStatus, 3000);

    // Simulate stage progression (since we don't have granular status)
    stageUpdateInterval = setInterval(() => {
      setStages(prev => {
        const newStages = [...prev];
        const current = currentStage;

        if (current < newStages.length && overallStatus === 'processing') {
          // Update current stage progress
          if (newStages[current].status === 'processing') {
            newStages[current].progress = Math.min(
              (newStages[current].progress || 0) + Math.random() * 15,
              90
            );

            // Move to next stage when current is near completion
            if ((newStages[current].progress || 0) > 80 && Math.random() > 0.7) {
              newStages[current].status = 'completed';
              newStages[current].progress = 100;
              
              // Start next stage
              if (current + 1 < newStages.length) {
                newStages[current + 1].status = 'processing';
                newStages[current + 1].progress = 10;
                setCurrentStage(current + 1);
              }
            }
          }
        }

        return newStages;
      });
    }, 1500);

    // Initial call
    pollStatus();

    return () => {
      clearInterval(pollInterval);
      clearInterval(stageUpdateInterval);
    };
  }, [versionId, currentStage, overallStatus, onComplete, onError]);

  // Estimate time remaining
  useEffect(() => {
    if (overallStatus === 'processing' && elapsedTime > 10000) { // After 10 seconds
      const completedStages = stages.filter(s => s.status === 'completed').length;
      const totalStages = stages.length;
      const progress = completedStages / totalStages;
      
      if (progress > 0) {
        const estimatedTotal = elapsedTime / progress;
        const remaining = Math.max(0, estimatedTotal - elapsedTime);
        setEstimatedTimeRemaining(remaining);
      }
    }
  }, [elapsedTime, stages, overallStatus]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getOverallProgress = () => {
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const processingStages = stages.filter(s => s.status === 'processing');
    
    let progress = (completedStages / stages.length) * 100;
    
    // Add partial progress from currently processing stage
    if (processingStages.length > 0 && processingStages[0].progress) {
      progress += (processingStages[0].progress / stages.length);
    }
    
    return Math.min(progress, 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {overallStatus === 'processing' && (
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {overallStatus === 'completed' && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {overallStatus === 'failed' && (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>
              {overallStatus === 'processing' && 'Processing Document'}
              {overallStatus === 'completed' && 'Processing Complete'}
              {overallStatus === 'failed' && 'Processing Failed'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Overall Progress
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(getOverallProgress())}%
            </span>
          </div>
          <Progress value={getOverallProgress()} className="h-3" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Elapsed: {formatTime(elapsedTime)}</span>
            {estimatedTimeRemaining && (
              <span>~{formatTime(estimatedTimeRemaining)} remaining</span>
            )}
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Processing Stages</h4>
          
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getStatusIcon(stage.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm">{stage.name}</h5>
                  {stage.status === 'processing' && stage.progress && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(stage.progress)}%
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {stage.description}
                </p>
                
                {stage.status === 'processing' && stage.progress && (
                  <Progress 
                    value={stage.progress} 
                    className="h-1 mt-1" 
                  />
                )}
              </div>
              
              <div className="flex-shrink-0">
                {stage.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Status Messages */}
        {overallStatus === 'completed' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Document processed successfully! You can now view the analysis and explore the results.
            </p>
          </div>
        )}

        {overallStatus === 'failed' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Processing failed. Please try uploading the document again or contact support if the issue persists.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}