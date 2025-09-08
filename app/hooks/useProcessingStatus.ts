'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToProcessingStatus, unsubscribeChannel } from '@/lib/supabase-realtime';
import type { ProcessingStatus, DocumentVersion } from '@/types/documents';

interface UseProcessingStatusReturn {
  status: ProcessingStatus;
  documentId?: string;
  error?: string;
  isSubscribed: boolean;
  isPolling: boolean;
}

export const useProcessingStatus = (versionId?: string): UseProcessingStatusReturn => {
  const [status, setStatus] = useState<ProcessingStatus>('pending');
  const [documentId, setDocumentId] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const router = useRouter();
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const lastStatusUpdateRef = useRef<number>(Date.now());
  
  // Polling function to check status via API
  const pollStatus = async (versionIdToCheck: string) => {
    try {
      const response = await fetch(`/api/process?version_id=${versionIdToCheck}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Polling status update:', data);
        
        setStatus(data.status);
        setDocumentId(data.document_id);
        lastStatusUpdateRef.current = Date.now();
        
        // Handle completion
        if (data.status === 'completed') {
          console.log('Processing completed via polling, navigating to document:', data.document_id);
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setTimeout(() => {
            router.push(`/document/${data.document_id}`);
          }, 1000);
          return false; // Stop polling
        }
        
        // Handle error
        if (data.status === 'failed') {
          setError('Document processing failed. Please try again.');
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          return false; // Stop polling
        }
        
        return true; // Continue polling if still processing
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Continue polling on network errors
    }
    return true;
  };
  
  // Start polling as fallback
  const startPolling = (versionIdToCheck: string) => {
    if (pollingIntervalRef.current) return; // Already polling
    
    console.log('Starting polling fallback for version:', versionIdToCheck);
    setIsPolling(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      const shouldContinue = await pollStatus(versionIdToCheck);
      if (!shouldContinue && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
    }, 2000); // Poll every 2 seconds
  };
  
  useEffect(() => {
    if (!versionId) {
      setStatus('pending');
      setIsSubscribed(false);
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      return;
    }
    
    console.log('Setting up processing status monitoring for:', versionId);
    
    // Initialize with current status
    pollStatus(versionId);
    
    // Try real-time subscription first
    let channel: any;
    try {
      channel = subscribeToProcessingStatus(
        versionId,
        (updatedVersion: DocumentVersion) => {
          console.log('Real-time status update:', updatedVersion);
          
          setStatus(updatedVersion.processing_status);
          setDocumentId(updatedVersion.document_id);
          lastStatusUpdateRef.current = Date.now();
          
          // Stop polling if real-time works
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = undefined;
            setIsPolling(false);
          }
          
          // Handle completion
          if (updatedVersion.processing_status === 'completed') {
            console.log('Processing completed via real-time, navigating to document:', updatedVersion.document_id);
            setTimeout(() => {
              router.push(`/document/${updatedVersion.document_id}`);
            }, 1000);
          }
          
          // Handle error
          if (updatedVersion.processing_status === 'failed') {
            setError('Document processing failed. Please try again.');
          }
        }
      );
      
      setIsSubscribed(true);
    } catch (error) {
      console.error('Real-time subscription failed:', error);
      setIsSubscribed(false);
    }
    
    // Start polling as fallback after 5 seconds if no real-time updates
    const fallbackTimer = setTimeout(() => {
      const timeSinceLastUpdate = Date.now() - lastStatusUpdateRef.current;
      if (timeSinceLastUpdate > 4000 && status !== 'completed' && status !== 'failed') {
        console.log('No recent updates, starting polling fallback');
        startPolling(versionId);
      }
    }, 5000);
    
    // Cleanup function
    return () => {
      console.log('Cleaning up processing status monitoring');
      
      clearTimeout(fallbackTimer);
      
      if (channel) {
        unsubscribeChannel(channel);
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      
      setIsSubscribed(false);
      setIsPolling(false);
    };
  }, [versionId, router]);
  
  return { 
    status, 
    documentId, 
    error, 
    isSubscribed,
    isPolling
  };
};

// Hook for monitoring multiple versions (useful for batch uploads)
// Hook for monitoring job-based processing status (new system)
export const useJobProcessingStatus = (jobId?: string): UseProcessingStatusReturn => {
  const [status, setStatus] = useState<ProcessingStatus>('pending');
  const [documentId, setDocumentId] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const router = useRouter();
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const lastStatusUpdateRef = useRef<number>(Date.now());
  
  // Polling function to check job status via API
  const pollJobStatus = async (jobIdToCheck: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobIdToCheck}/status`);
      if (response.ok) {
        const data = await response.json();
        console.log('Job polling status update:', data);
        
        setStatus(data.status as ProcessingStatus);
        lastStatusUpdateRef.current = Date.now();
        
        // Handle completion
        if (data.status === 'completed') {
          console.log('Job processing completed via polling, navigating to results:', jobIdToCheck);
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setTimeout(() => {
            router.push(`/results/${jobIdToCheck}`);
          }, 1000);
          return false; // Stop polling
        }
        
        // Handle error
        if (data.status === 'failed') {
          setError(data.error_message || 'Job processing failed. Please try again.');
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          return false; // Stop polling
        }
        
        return true; // Continue polling if still processing
      }
    } catch (error) {
      console.error('Job polling error:', error);
      // Continue polling on network errors
    }
    return true;
  };
  
  // Start polling as fallback
  const startJobPolling = (jobIdToCheck: string) => {
    if (pollingIntervalRef.current) return; // Already polling
    
    console.log('Starting job polling fallback for:', jobIdToCheck);
    setIsPolling(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      const shouldContinue = await pollJobStatus(jobIdToCheck);
      if (!shouldContinue && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
    }, 2000); // Poll every 2 seconds
  };
  
  useEffect(() => {
    if (!jobId) {
      setStatus('pending');
      setIsSubscribed(false);
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      return;
    }
    
    console.log('Setting up job processing status monitoring for:', jobId);
    
    // Initialize with current status
    pollJobStatus(jobId);
    
    // Try real-time subscription first
    let channel: any;
    try {
      const supabase = require('@/lib/supabase-realtime').createRealtimeClient();
      
      channel = supabase
        .channel(`job-status-${jobId}`)
        .on('postgres_changes', 
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload: any) => {
            console.log('Real-time job status update:', payload);
            
            const updatedJob = payload.new;
            setStatus(updatedJob.status as ProcessingStatus);
            lastStatusUpdateRef.current = Date.now();
            
            // Stop polling if real-time works
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = undefined;
              setIsPolling(false);
            }
            
            // Handle completion
            if (updatedJob.status === 'completed') {
              console.log('Job processing completed via real-time, navigating to results:', jobId);
              setTimeout(() => {
                router.push(`/results/${jobId}`);
              }, 1000);
            }
            
            // Handle error
            if (updatedJob.status === 'failed') {
              setError(updatedJob.error_message || 'Job processing failed. Please try again.');
            }
          })
        .subscribe((status: string) => {
          console.log('Job subscription status:', status);
          setIsSubscribed(status === 'SUBSCRIBED');
        });
      
    } catch (error) {
      console.error('Real-time job subscription failed:', error);
      setIsSubscribed(false);
    }
    
    // Start polling as fallback after 5 seconds if no real-time updates
    const fallbackTimer = setTimeout(() => {
      const timeSinceLastUpdate = Date.now() - lastStatusUpdateRef.current;
      if (timeSinceLastUpdate > 4000 && status !== 'completed' && status !== 'failed') {
        console.log('No recent job updates, starting polling fallback');
        startJobPolling(jobId);
      }
    }, 5000);
    
    // Cleanup function
    return () => {
      console.log('Cleaning up job processing status monitoring');
      
      clearTimeout(fallbackTimer);
      
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from job channel:', error);
        }
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      
      setIsSubscribed(false);
      setIsPolling(false);
    };
  }, [jobId, router, status]);
  
  return { 
    status, 
    documentId, 
    error, 
    isSubscribed,
    isPolling
  };
};

export const useMultipleProcessingStatus = (versionIds: string[]) => {
  const [statusMap, setStatusMap] = useState<Record<string, ProcessingStatus>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    if (!versionIds.length) {
      setStatusMap({});
      setIsSubscribed(false);
      return;
    }
    
    // Initialize status map
    const initialStatusMap = versionIds.reduce((acc, versionId) => {
      acc[versionId] = 'pending';
      return acc;
    }, {} as Record<string, ProcessingStatus>);
    
    setStatusMap(initialStatusMap);
    
    // For simplicity, create individual subscriptions for each version
    // In a production app, you might optimize this with a single subscription
    const channels = versionIds.map(versionId => 
      subscribeToProcessingStatus(versionId, (updatedVersion: DocumentVersion) => {
        setStatusMap(prev => ({
          ...prev,
          [versionId]: updatedVersion.processing_status
        }));
        
        // Optional: Navigate when all processing is complete
        if (updatedVersion.processing_status === 'completed') {
          // Check if all versions are completed
          setStatusMap(currentMap => {
            const updatedMap = {
              ...currentMap,
              [versionId]: updatedVersion.processing_status
            };
            
            const allCompleted = Object.values(updatedMap).every(
              status => status === 'completed' || status === 'failed'
            );
            
            if (allCompleted) {
              // Navigate to a results page or dashboard
              setTimeout(() => {
                router.push('/results');
              }, 1000);
            }
            
            return updatedMap;
          });
        }
      })
    );
    
    setIsSubscribed(true);
    
    return () => {
      channels.forEach(channel => unsubscribeChannel(channel));
      setIsSubscribed(false);
    };
  }, [versionIds, router]);
  
  return { 
    statusMap, 
    isSubscribed,
    completedCount: Object.values(statusMap).filter(status => status === 'completed').length,
    failedCount: Object.values(statusMap).filter(status => status === 'failed').length,
    processingCount: Object.values(statusMap).filter(status => status === 'processing').length,
    totalCount: versionIds.length
  };
};