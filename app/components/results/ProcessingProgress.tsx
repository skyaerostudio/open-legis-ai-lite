'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Zap, 
  Database,
  Sparkles,
  RefreshCw,
  Activity,
  Timer,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { ServiceJob, ProcessingStepConfig } from '@/types/processing';
import { SERVICE_JOB_CONFIGS } from '@/types/processing';

interface ProcessingProgressProps {
  jobId: string;
  serviceType: ServiceJob['service_type'];
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ProcessingStage extends ProcessingStepConfig {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export default function ProcessingProgress({ 
  jobId, 
  serviceType,
  onComplete, 
  onError, 
  className = '' 
}: ProcessingProgressProps) {
  // Use real-time processing status hook
  const { status: processingStatus, error: processingError, isSubscribed, isPolling } = useProcessingStatus(jobId);
  
  const [overallStatus, setOverallStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [stages, setStages] = useState<ProcessingStage[]>([]);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  // Initialize stages based on service type
  useEffect(() => {
    const serviceConfig = SERVICE_JOB_CONFIGS[serviceType];
    const initialStages: ProcessingStage[] = serviceConfig.processing_steps.map(step => ({
      ...step,
      status: 'pending',
      progress: 0,
      retryCount: 0
    }));
    
    // Set first stage to processing
    if (initialStages.length > 0) {
      initialStages[0].status = 'processing';
      initialStages[0].startedAt = new Date();
    }
    
    setStages(initialStages);
  }, [serviceType]);

  // Update elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Handle real-time processing status updates
  useEffect(() => {
    if (processingError) {
      handleProcessingError(processingError);
      return;
    }

    if (processingStatus === 'completed') {
      handleProcessingComplete();
    } else if (processingStatus === 'failed') {
      handleProcessingFailed();
    } else if (processingStatus === 'processing') {
      updateProcessingStages();
    }
  }, [processingStatus, processingError]);

  // Estimate time remaining
  useEffect(() => {
    if (overallStatus === 'processing' && elapsedTime > 10000) {
      calculateEstimatedTime();
    }
  }, [elapsedTime, stages, overallStatus]);

  const handleProcessingError = (error: string) => {
    setStages(prev => prev.map(stage => ({
      ...stage,
      status: stage.status === 'processing' ? 'failed' as const : stage.status,
      errorMessage: stage.status === 'processing' ? error : stage.errorMessage
    })));
    setOverallStatus('failed');
    onError?.(error);
  };

  const handleProcessingComplete = () => {
    setStages(prev => prev.map(stage => ({
      ...stage,
      status: 'completed' as const,
      progress: 100,
      completedAt: new Date()
    })));
    setOverallStatus('completed');
    onComplete?.({ jobId, serviceType });
  };

  const handleProcessingFailed = () => {
    setStages(prev => prev.map(stage => ({
      ...stage,
      status: stage.status === 'processing' ? 'failed' as const : stage.status
    })));
    setOverallStatus('failed');
    onError?.('Processing failed');
  };

  const updateProcessingStages = () => {
    setOverallStatus('processing');
    
    setStages(prev => {
      const newStages = [...prev];
      const currentTime = new Date();
      
      // Simulate realistic progress based on elapsed time
      const totalEstimatedTime = newStages.reduce((sum, stage) => sum + stage.estimated_duration_ms, 0);
      const progressRatio = elapsedTime / totalEstimatedTime;
      
      let accumulatedTime = 0;
      
      for (let i = 0; i < newStages.length; i++) {
        const stage = newStages[i];
        const stageEndTime = accumulatedTime + stage.estimated_duration_ms;
        
        if (elapsedTime > stageEndTime) {
          // Stage should be completed
          if (stage.status !== 'completed') {
            newStages[i] = {
              ...stage,
              status: 'completed',
              progress: 100,
              completedAt: currentTime
            };
          }
        } else if (elapsedTime > accumulatedTime) {
          // Stage is in progress
          const stageProgress = ((elapsedTime - accumulatedTime) / stage.estimated_duration_ms) * 100;
          newStages[i] = {
            ...stage,
            status: 'processing',
            progress: Math.min(stageProgress, 95), // Never show 100% until actually complete
            startedAt: stage.startedAt || currentTime
          };
          break; // Only one stage processing at a time
        } else {
          // Future stages remain pending
          break;
        }
        
        accumulatedTime = stageEndTime;
      }
      
      return newStages;
    });
  };

  const calculateEstimatedTime = () => {
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const totalStages = stages.length;
    const progress = completedStages / totalStages;
    
    if (progress > 0.1) { // Only estimate after 10% progress
      const estimatedTotal = elapsedTime / progress;
      const remaining = Math.max(0, estimatedTotal - elapsedTime);
      setEstimatedTimeRemaining(remaining);
    }
  };

  const handleRetryStage = (stageIndex: number) => {
    setStages(prev => {
      const newStages = [...prev];
      const stage = newStages[stageIndex];
      
      if (stage.can_retry && stage.status === 'failed') {
        newStages[stageIndex] = {
          ...stage,
          status: 'retrying',
          progress: 0,
          retryCount: stage.retryCount + 1,
          errorMessage: undefined,
          startedAt: new Date()
        };
      }
      
      return newStages;
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getOverallProgress = () => {
    const totalStages = stages.length;
    if (totalStages === 0) return 0;
    
    let totalProgress = 0;
    
    stages.forEach(stage => {
      if (stage.status === 'completed') {
        totalProgress += 100;
      } else if (stage.status === 'processing' || stage.status === 'retrying') {
        totalProgress += stage.progress;
      }
    });
    
    return Math.min(totalProgress / totalStages, 100);
  };

  const getStatusIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'retrying':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const serviceConfig = SERVICE_JOB_CONFIGS[serviceType];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
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
            <div>
              <div className="font-semibold">
                {overallStatus === 'processing' && `Memproses ${serviceConfig.display_name}`}
                {overallStatus === 'completed' && 'Pemrosesan Selesai'}
                {overallStatus === 'failed' && 'Pemrosesan Gagal'}
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                {serviceConfig.description}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {isSubscribed ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Real-time
                </>
              ) : isPolling ? (
                <>
                  <Activity className="h-3 w-3 mr-1" />
                  Polling
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Connecting
                </>
              )}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Progress Keseluruhan
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(getOverallProgress())}%
            </span>
          </div>
          <Progress value={getOverallProgress()} className="h-3" />
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Waktu: {formatTime(elapsedTime)}
              </span>
            </div>
            {estimatedTimeRemaining && overallStatus === 'processing' && (
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Sisa: ~{formatTime(estimatedTimeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Tahapan Pemrosesan</h4>
          
          {stages.map((stage, index) => (
            <div key={stage.key} className={`border rounded-lg p-4 ${getStatusColor(stage.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(stage.status)}
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">{stage.title}</h5>
                    <p className="text-xs opacity-75">{stage.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {stage.status === 'processing' || stage.status === 'retrying' ? (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(stage.progress)}%
                    </Badge>
                  ) : null}
                  
                  {stage.retryCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Retry #{stage.retryCount}
                    </Badge>
                  )}
                </div>
              </div>
              
              {(stage.status === 'processing' || stage.status === 'retrying') && (
                <Progress value={stage.progress} className="h-2 mt-2" />
              )}
              
              {stage.status === 'failed' && stage.errorMessage && (
                <div className="mt-2 space-y-2">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800 text-xs">
                      {stage.errorMessage}
                    </AlertDescription>
                  </Alert>
                  {stage.can_retry && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRetryStage(index)}
                      className="h-6 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Coba Lagi
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 text-xs opacity-60">
                <span>
                  Est: {formatTime(stage.estimated_duration_ms)}
                </span>
                {stage.startedAt && (
                  <span>
                    Dimulai: {stage.startedAt.toLocaleTimeString('id-ID')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status Messages */}
        {overallStatus === 'completed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Berhasil!</strong> Dokumen telah berhasil diproses. 
              Anda sekarang dapat melihat hasil analisis dan menjelajahi hasilnya.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'failed' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Gagal!</strong> Pemrosesan gagal. Silakan coba unggah dokumen lagi 
              atau hubungi dukungan jika masalah ini terus berlanjut.
            </AlertDescription>
          </Alert>
        )}

        {/* Job Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <div className="flex justify-between">
            <span>Job ID: {jobId.slice(-12)}</span>
            <span>Service: {serviceType}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}