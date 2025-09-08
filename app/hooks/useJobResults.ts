'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToProcessingStatus, unsubscribeChannel, createRealtimeClient } from '@/lib/supabase-realtime';
import type { ServiceJob, StatusUpdate, ProcessingState } from '@/types/processing';
import type { AIAnalysisResult } from '@/types/analysis';

interface UseJobResultsReturn {
  result: AIAnalysisResult | null;
  loading: boolean;
  error: string | null;
  jobStatus: ServiceJob['status'];
  progress: number;
  refetchResult: () => Promise<void>;
  clearResult: () => void;
  isSubscribed: boolean;
  lastUpdated: Date | null;
}

interface JobResultsCache {
  [jobId: string]: {
    result: AIAnalysisResult;
    timestamp: Date;
    ttl: number;
  };
}

// Cache for results (5 minutes TTL by default)
const resultsCache: JobResultsCache = {};
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useJobResults = (jobId?: string, enableRealtime = true): UseJobResultsReturn => {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ServiceJob['status']>('pending');
  const [progress, setProgress] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const channelRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check cache first
  const getCachedResult = useCallback((jobIdToCheck: string): AIAnalysisResult | null => {
    const cached = resultsCache[jobIdToCheck];
    if (!cached) return null;
    
    const now = Date.now();
    const isExpired = (now - cached.timestamp.getTime()) > cached.ttl;
    
    if (isExpired) {
      delete resultsCache[jobIdToCheck];
      return null;
    }
    
    return cached.result;
  }, []);

  // Cache result
  const cacheResult = useCallback((jobIdToCache: string, resultToCache: AIAnalysisResult, ttl = DEFAULT_CACHE_TTL) => {
    resultsCache[jobIdToCache] = {
      result: resultToCache,
      timestamp: new Date(),
      ttl
    };
  }, []);

  // Fetch result from API
  const fetchResult = useCallback(async (jobIdToFetch: string, signal?: AbortSignal): Promise<AIAnalysisResult | null> => {
    try {
      const response = await fetch(`/api/results/${jobIdToFetch}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Result not ready yet
        }
        throw new Error(`Failed to fetch results: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        return data.result as AIAnalysisResult;
      }
      
      return null;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null; // Request was cancelled
      }
      throw err;
    }
  }, []);

  // Main function to get results (cache + API)
  const getResults = useCallback(async (jobIdToGet: string): Promise<void> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cachedResult = getCachedResult(jobIdToGet);
      if (cachedResult) {
        setResult(cachedResult);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // Fetch from API
      const fetchedResult = await fetchResult(jobIdToGet, abortControllerRef.current.signal);
      
      if (fetchedResult) {
        cacheResult(jobIdToGet, fetchedResult);
        setResult(fetchedResult);
        setJobStatus('completed');
        setProgress(100);
        setLastUpdated(new Date());
      } else {
        // Result not ready yet
        setResult(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'Failed to fetch results';
        setError(errorMessage);
        console.error('Error fetching job results:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [getCachedResult, fetchResult, cacheResult]);

  // Refetch results manually
  const refetchResult = useCallback(async (): Promise<void> => {
    if (!jobId) return;
    
    // Clear cache for this job to force fresh fetch
    delete resultsCache[jobId];
    
    await getResults(jobId);
  }, [jobId, getResults]);

  // Clear current result
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setJobStatus('pending');
    setProgress(0);
    setLastUpdated(null);
    
    if (jobId) {
      delete resultsCache[jobId];
    }
  }, [jobId]);

  // Real-time subscription for job status updates
  useEffect(() => {
    if (!jobId || !enableRealtime) {
      setIsSubscribed(false);
      return;
    }

    console.log('Setting up real-time subscription for job results:', jobId);
    
    try {
      // Subscribe to service_jobs table updates
      const supabase = createRealtimeClient();
      
      channelRef.current = supabase
        .channel(`job-results-${jobId}`)
        .on('postgres_changes', 
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            console.log('Job status update:', payload);
            
            const updatedJob = payload.new as ServiceJob;
            setJobStatus(updatedJob.status);
            setProgress(updatedJob.progress);
            setLastUpdated(new Date());
            
            // If job is completed and has result data, update result
            if (updatedJob.status === 'completed' && updatedJob.result_data) {
              const analysisResult: AIAnalysisResult = {
                job_id: jobId,
                service_type: updatedJob.service_type,
                status: 'completed',
                confidence_score: updatedJob.result_data.confidence_score || 0.8,
                results: updatedJob.result_data.results,
                warnings: updatedJob.result_data.warnings || [],
                limitations: updatedJob.result_data.limitations || [],
                quality_indicators: updatedJob.result_data.quality_indicators || {
                  text_extraction_quality: 0.8,
                  structure_recognition_accuracy: 0.8,
                  ai_analysis_confidence: 0.8,
                  completeness_score: 0.8
                },
                processing_metadata: updatedJob.result_data.processing_metadata || {
                  total_clauses_processed: 0,
                  failed_clauses: 0,
                  processing_time_breakdown: {},
                  model_versions: {}
                }
              };
              
              cacheResult(jobId, analysisResult);
              setResult(analysisResult);
            }
            
            // Handle failed status
            if (updatedJob.status === 'failed') {
              setError(updatedJob.error_message || 'Job processing failed');
            }
          })
        .subscribe((status) => {
          console.log('Job results subscription status:', status);
          setIsSubscribed(status === 'SUBSCRIBED');
        });
      
    } catch (err) {
      console.error('Failed to set up real-time subscription:', err);
      setIsSubscribed(false);
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [jobId, enableRealtime, cacheResult]);

  // Initial data fetch
  useEffect(() => {
    if (!jobId) {
      clearResult();
      return;
    }

    getResults(jobId);
  }, [jobId, getResults, clearResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    result,
    loading,
    error,
    jobStatus,
    progress,
    refetchResult,
    clearResult,
    isSubscribed,
    lastUpdated
  };
};

// Hook for managing multiple job results
export const useMultipleJobResults = (jobIds: string[], enableRealtime = true) => {
  const [results, setResults] = useState<Record<string, AIAnalysisResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overallLoading, setOverallLoading] = useState(false);

  // Manage individual job states manually to avoid calling hooks in loop
  useEffect(() => {
    if (!jobIds.length) {
      setResults({});
      setLoading({});
      setErrors({});
      setOverallLoading(false);
      return;
    }

    // Initialize states
    const initialResults: Record<string, AIAnalysisResult> = {};
    const initialLoading: Record<string, boolean> = {};
    const initialErrors: Record<string, string> = {};
    
    jobIds.forEach(jobId => {
      initialLoading[jobId] = false;
    });

    setResults(initialResults);
    setLoading(initialLoading);
    setErrors(initialErrors);
    
    // Fetch results for each job
    const fetchAllResults = async () => {
      const fetchPromises = jobIds.map(async (jobId) => {
        try {
          setLoading(prev => ({ ...prev, [jobId]: true }));
          
          const response = await fetch(`/api/results/${jobId}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.result) {
              setResults(prev => ({ ...prev, [jobId]: data.result }));
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : `Failed to fetch results for job ${jobId}`;
          setErrors(prev => ({ ...prev, [jobId]: errorMessage }));
        } finally {
          setLoading(prev => ({ ...prev, [jobId]: false }));
        }
      });

      await Promise.all(fetchPromises);
      setOverallLoading(false);
    };

    setOverallLoading(true);
    fetchAllResults();
  }, [jobIds]);

  // Refetch all results
  const refetchAll = useCallback(async () => {
    if (!jobIds.length) return;
    
    setOverallLoading(true);
    setErrors({});
    
    const fetchPromises = jobIds.map(async (jobId) => {
      try {
        setLoading(prev => ({ ...prev, [jobId]: true }));
        
        const response = await fetch(`/api/results/${jobId}`, {
          cache: 'no-store' // Force fresh fetch
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.result) {
            setResults(prev => ({ ...prev, [jobId]: data.result }));
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to refetch results for job ${jobId}`;
        setErrors(prev => ({ ...prev, [jobId]: errorMessage }));
      } finally {
        setLoading(prev => ({ ...prev, [jobId]: false }));
      }
    });

    await Promise.all(fetchPromises);
    setOverallLoading(false);
  }, [jobIds]);

  // Clear all results
  const clearAll = useCallback(() => {
    setResults({});
    setLoading({});
    setErrors({});
    setOverallLoading(false);
  }, []);

  return {
    results,
    loading,
    errors,
    overallLoading,
    refetchAll,
    clearAll,
    completedCount: Object.keys(results).length,
    totalCount: jobIds.length,
    hasErrors: Object.keys(errors).length > 0
  };
};