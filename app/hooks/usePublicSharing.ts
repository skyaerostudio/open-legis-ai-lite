'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ServiceJob } from '@/types/processing';

interface ShareSettings {
  isPublic: boolean;
  shareUrl?: string;
  expiresAt?: Date;
  allowDownload: boolean;
  showWatermark: boolean;
  title?: string;
  description?: string;
}

interface ShareAnalytics {
  viewCount: number;
  uniqueViewers: number;
  lastViewed?: Date;
  referrers: Record<string, number>;
  countries: Record<string, number>;
}

interface UsePublicSharingReturn {
  shareSettings: ShareSettings;
  analytics: ShareAnalytics | null;
  loading: boolean;
  error: string | null;
  isSharing: boolean;
  shareUrl: string | null;
  createShareLink: (settings?: Partial<ShareSettings>) => Promise<string | null>;
  updateShareSettings: (settings: Partial<ShareSettings>) => Promise<void>;
  revokeShareLink: () => Promise<void>;
  copyShareLink: () => Promise<boolean>;
  getShareMetadata: () => ShareMetadata;
  refreshAnalytics: () => Promise<void>;
}

interface ShareMetadata {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  type: 'article';
  siteName: 'Open-LegisAI';
}

const DEFAULT_SHARE_SETTINGS: ShareSettings = {
  isPublic: false,
  allowDownload: true,
  showWatermark: true
};

export const usePublicSharing = (jobId?: string): UsePublicSharingReturn => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>(DEFAULT_SHARE_SETTINGS);
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Derived state
  const shareUrl = shareSettings.shareUrl || null;

  // Create share link
  const createShareLink = useCallback(async (settings: Partial<ShareSettings> = {}): Promise<string | null> => {
    if (!jobId) {
      setError('Job ID is required to create share link');
      return null;
    }

    setLoading(true);
    setError(null);
    setIsSharing(true);

    try {
      const requestBody = {
        jobId,
        settings: {
          ...DEFAULT_SHARE_SETTINGS,
          ...settings,
          isPublic: true
        }
      };

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to create share link: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.shareUrl) {
        const newSettings: ShareSettings = {
          ...shareSettings,
          ...settings,
          isPublic: true,
          shareUrl: data.shareUrl,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
        };
        
        setShareSettings(newSettings);
        return data.shareUrl;
      } else {
        throw new Error(data.error || 'Failed to create share link');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create share link';
      setError(errorMessage);
      console.error('Error creating share link:', err);
      return null;
    } finally {
      setLoading(false);
      setIsSharing(false);
    }
  }, [jobId, shareSettings]);

  // Update share settings
  const updateShareSettings = useCallback(async (settings: Partial<ShareSettings>): Promise<void> => {
    if (!jobId) {
      setError('Job ID is required to update share settings');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update share settings: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShareSettings(prev => ({ ...prev, ...settings }));
      } else {
        throw new Error(data.error || 'Failed to update share settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update share settings';
      setError(errorMessage);
      console.error('Error updating share settings:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Revoke share link
  const revokeShareLink = useCallback(async (): Promise<void> => {
    if (!jobId) {
      setError('Job ID is required to revoke share link');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to revoke share link: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShareSettings({
          ...shareSettings,
          isPublic: false,
          shareUrl: undefined
        });
        setAnalytics(null);
      } else {
        throw new Error(data.error || 'Failed to revoke share link');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke share link';
      setError(errorMessage);
      console.error('Error revoking share link:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId, shareSettings]);

  // Copy share link to clipboard
  const copyShareLink = useCallback(async (): Promise<boolean> => {
    if (!shareUrl) {
      setError('No share link available to copy');
      return false;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return successful;
      }
    } catch (err) {
      console.error('Error copying share link:', err);
      setError('Failed to copy share link to clipboard');
      return false;
    }
  }, [shareUrl]);

  // Get share metadata for social media
  const getShareMetadata = useCallback((): ShareMetadata => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const defaultTitle = 'Analisis Dokumen Hukum - Open-LegisAI';
    const defaultDescription = 'Lihat hasil analisis dokumen hukum yang diproses dengan AI untuk pemahaman yang lebih mudah.';
    
    return {
      title: shareSettings.title || defaultTitle,
      description: shareSettings.description || defaultDescription,
      imageUrl: shareUrl ? `${baseUrl}/api/og?url=${encodeURIComponent(shareUrl)}` : `${baseUrl}/og-default.png`,
      canonicalUrl: shareUrl || '',
      type: 'article',
      siteName: 'Open-LegisAI'
    };
  }, [shareSettings.title, shareSettings.description, shareUrl]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(async (): Promise<void> => {
    if (!jobId || !shareSettings.isPublic) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/share/${jobId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analytics) {
          setAnalytics({
            viewCount: data.analytics.viewCount || 0,
            uniqueViewers: data.analytics.uniqueViewers || 0,
            lastViewed: data.analytics.lastViewed ? new Date(data.analytics.lastViewed) : undefined,
            referrers: data.analytics.referrers || {},
            countries: data.analytics.countries || {}
          });
        }
      }
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      // Don't set error for analytics failures
    } finally {
      setLoading(false);
    }
  }, [jobId, shareSettings.isPublic]);

  // Load initial share settings and analytics
  useEffect(() => {
    if (!jobId) {
      setShareSettings(DEFAULT_SHARE_SETTINGS);
      setAnalytics(null);
      return;
    }

    const loadShareData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/share/${jobId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.shareSettings) {
            const settings: ShareSettings = {
              isPublic: data.shareSettings.isPublic || false,
              shareUrl: data.shareSettings.shareUrl,
              expiresAt: data.shareSettings.expiresAt ? new Date(data.shareSettings.expiresAt) : undefined,
              allowDownload: data.shareSettings.allowDownload ?? true,
              showWatermark: data.shareSettings.showWatermark ?? true,
              title: data.shareSettings.title,
              description: data.shareSettings.description
            };
            
            setShareSettings(settings);
            
            // Load analytics if public
            if (settings.isPublic) {
              await refreshAnalytics();
            }
          } else {
            // No existing share settings, use defaults
            setShareSettings(DEFAULT_SHARE_SETTINGS);
          }
        } else if (response.status === 404) {
          // No share settings found, use defaults
          setShareSettings(DEFAULT_SHARE_SETTINGS);
        } else {
          throw new Error(`Failed to load share settings: ${response.statusText}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load share settings';
        setError(errorMessage);
        console.error('Error loading share settings:', err);
        // Still set defaults on error
        setShareSettings(DEFAULT_SHARE_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    loadShareData();
  }, [jobId, refreshAnalytics]);

  return {
    shareSettings,
    analytics,
    loading,
    error,
    isSharing,
    shareUrl,
    createShareLink,
    updateShareSettings,
    revokeShareLink,
    copyShareLink,
    getShareMetadata,
    refreshAnalytics
  };
};

// Utility hook for social media sharing
export const useSocialSharing = (shareUrl?: string, metadata?: ShareMetadata) => {
  const shareToFacebook = useCallback(() => {
    if (!shareUrl) return;
    
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }, [shareUrl]);

  const shareToTwitter = useCallback(() => {
    if (!shareUrl || !metadata) return;
    
    const text = `${metadata.title} - ${metadata.description}`;
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }, [shareUrl, metadata]);

  const shareToLinkedIn = useCallback(() => {
    if (!shareUrl) return;
    
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }, [shareUrl]);

  const shareToWhatsApp = useCallback(() => {
    if (!shareUrl || !metadata) return;
    
    const text = `${metadata.title}\n\n${metadata.description}\n\n${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [shareUrl, metadata]);

  const shareToTelegram = useCallback(() => {
    if (!shareUrl || !metadata) return;
    
    const text = `${metadata.title}\n\n${metadata.description}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [shareUrl, metadata]);

  const canShare = typeof navigator !== 'undefined' && navigator.share;
  
  const shareNative = useCallback(async () => {
    if (!canShare || !shareUrl || !metadata) return false;
    
    try {
      await navigator.share({
        title: metadata.title,
        text: metadata.description,
        url: shareUrl,
      });
      return true;
    } catch (err) {
      console.error('Error sharing:', err);
      return false;
    }
  }, [canShare, shareUrl, metadata]);

  return {
    shareToFacebook,
    shareToTwitter,
    shareToLinkedIn,
    shareToWhatsApp,
    shareToTelegram,
    shareNative,
    canShare
  };
};