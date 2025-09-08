import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Share2, 
  Download, 
  Eye,
  Clock,
  ChevronLeft,
  ExternalLink,
  Shield,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentSummary } from '@/components/results/DocumentSummary';
import { DocumentComparison } from '@/components/results/DocumentComparison';
import { ConflictDetection } from '@/components/results/ConflictDetection';
import { SERVICE_JOB_CONFIGS } from '@/types/processing';
import type { AIAnalysisResult } from '@/types/analysis';
import type { ServiceJob } from '@/types/processing';

interface PageProps {
  params: { id: string };
  searchParams: { 
    preview?: 'true';
    print?: 'true';
  };
}

// Server-side data fetching for shared results
async function getSharedResults(shareId: string): Promise<{
  job: ServiceJob | null;
  result: AIAnalysisResult | null;
  shareSettings: any | null;
  error?: string;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/shared/${shareId}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Open-LegisAI-Server/1.0',
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { job: null, result: null, shareSettings: null };
      }
      throw new Error(`Failed to fetch shared results: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load shared results');
    }

    return {
      job: data.job || null,
      result: data.result || null,
      shareSettings: data.shareSettings || null
    };
  } catch (error) {
    console.error('Error fetching shared results:', error);
    return { 
      job: null, 
      result: null, 
      shareSettings: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Generate metadata for SEO and social media
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { job, result, shareSettings } = await getSharedResults(params.id);
  
  if (!job || !result || !shareSettings?.isPublic) {
    return {
      title: 'Shared Analysis Not Found | Open-LegisAI',
      description: 'The shared document analysis could not be found or is no longer available.',
      robots: { index: false, follow: false }
    };
  }

  const serviceConfig = SERVICE_JOB_CONFIGS[job.service_type];
  const title = shareSettings.title || result.results?.title || `${serviceConfig.display_name} Analysis`;
  const description = shareSettings.description || `${serviceConfig.description} - Shared publicly for review.`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonicalUrl = `${baseUrl}/shared/${params.id}`;
  const ogImageUrl = `${baseUrl}/api/og/${params.id}`;

  return {
    title: `${title} | Open-LegisAI`,
    description,
    keywords: [
      'legal analysis', 
      'indonesia', 
      'document processing', 
      'AI', 
      'regulation', 
      job.service_type,
      'public',
      'shared'
    ],
    robots: { index: true, follow: true }, // Public shares can be indexed
    canonical: canonicalUrl,
    openGraph: {
      title: `${title} - Open-LegisAI Analysis`,
      description,
      url: canonicalUrl,
      siteName: 'Open-LegisAI',
      type: 'article',
      locale: 'id_ID',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${title} - Analysis Preview`,
        },
      ],
      publishedTime: job.created_at,
      modifiedTime: job.updated_at,
      authors: ['Open-LegisAI'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Analysis Results`,
      description,
      images: [ogImageUrl],
      creator: '@OpenLegisAI',
    },
    other: {
      'article:author': 'Open-LegisAI',
      'article:section': 'Legal Analysis',
      'article:tag': [job.service_type, 'legal', 'indonesia'].join(','),
    }
  };
}

// Social sharing component
function SocialShareButtons({ 
  shareUrl, 
  title, 
  description 
}: { 
  shareUrl: string; 
  title: string; 
  description: string; 
}) {
  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const text = `${title} - ${description}`;
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={shareToFacebook}>
        Facebook
      </Button>
      <Button variant="outline" size="sm" onClick={shareToTwitter}>
        Twitter
      </Button>
      <Button variant="outline" size="sm" onClick={shareToLinkedIn}>
        LinkedIn
      </Button>
      <Button variant="outline" size="sm" onClick={copyToClipboard}>
        Copy Link
      </Button>
    </div>
  );
}

// Watermark component
function Watermark() {
  return (
    <div className="print-watermark fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-6xl font-bold text-gray-100 rotate-45 select-none">
          OPEN-LEGISAI
        </div>
      </div>
    </div>
  );
}

// Results display component with watermark
function SharedResultsContent({ 
  result, 
  job, 
  shareSettings 
}: {
  result: AIAnalysisResult;
  job: ServiceJob;
  shareSettings: any;
}) {
  const serviceType = result.service_type;
  
  return (
    <div className="relative">
      {shareSettings.showWatermark && <Watermark />}
      
      <div className="relative z-10 space-y-6">
        {/* Results Content */}
        <Card>
          <CardContent className="p-6">
            {serviceType === 'ringkasan' && (
              <DocumentSummary result={result} readOnly />
            )}
            
            {serviceType === 'perubahan' && (
              <DocumentComparison result={result} readOnly />
            )}
            
            {serviceType === 'konflik' && (
              <ConflictDetection result={result} readOnly />
            )}
          </CardContent>
        </Card>
        
        {/* Attribution */}
        <div className="text-center text-sm text-gray-500 mt-8 print:mt-4">
          <p>
            Dianalisis menggunakan <strong>Open-LegisAI</strong> • {' '}
            <time dateTime={job.created_at}>
              {new Date(job.created_at).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </time>
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function SharedPage({ params, searchParams }: PageProps) {
  const shareId = params.id;
  const isPreview = searchParams.preview === 'true';
  const isPrint = searchParams.print === 'true';

  if (!shareId) {
    notFound();
  }

  // Server-side data fetching
  const { job, result, shareSettings, error } = await getSharedResults(shareId);

  if (error || !job || !result || !shareSettings?.isPublic) {
    notFound();
  }

  const serviceConfig = SERVICE_JOB_CONFIGS[job.service_type];
  const title = shareSettings.title || result.results?.title || `${serviceConfig.display_name} Analysis`;
  const description = shareSettings.description || serviceConfig.description;
  const currentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/shared/${shareId}`;

  // Track view (in a real implementation, you'd log this)
  // await trackView(shareId);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AnalysisDocument',
            name: title,
            description: description,
            dateCreated: job.created_at,
            dateModified: job.updated_at,
            author: {
              '@type': 'Organization',
              name: 'Open-LegisAI',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
            },
            about: {
              '@type': 'LegalDocument',
              legislationType: job.service_type
            },
            isPublic: true,
            inLanguage: 'id-ID',
            publisher: {
              '@type': 'Organization',
              name: 'Open-LegisAI'
            }
          })
        }}
      />

      <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-white ${isPrint ? 'print-layout' : ''}`}>
        <div className="container mx-auto px-4 py-8">
          {/* Header - Hidden in print */}
          {!isPrint && (
            <div className="mb-8 print:hidden">
              <div className="flex items-center justify-between mb-6">
                <Link 
                  href="/"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Open-LegisAI
                </Link>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Eye className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                  <Badge variant="outline">
                    <Shield className="w-3 h-3 mr-1" />
                    Shared
                  </Badge>
                </div>
              </div>
              
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
                <p className="text-gray-600">
                  {description}
                </p>
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <Clock className="w-4 h-4 mr-1" />
                  Dibagikan {new Date(job.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                <SocialShareButtons 
                  shareUrl={currentUrl}
                  title={title}
                  description={description}
                />
                
                <div className="flex gap-2">
                  {shareSettings.allowDownload && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  
                  <Button size="sm" asChild>
                    <Link href="/">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Try Analysis
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Print Header */}
          <div className="hidden print:block mb-8">
            <div className="text-center border-b pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {title}
              </h1>
              <p className="text-gray-600 text-sm">
                {description}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Dianalisis dengan Open-LegisAI • {new Date(job.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          {/* Results Content */}
          <Suspense fallback={
            <div className="space-y-6">
              <div className="h-96 bg-gray-200 rounded animate-pulse" />
            </div>
          }>
            <SharedResultsContent 
              result={result}
              job={job}
              shareSettings={shareSettings}
            />
          </Suspense>

          {/* Footer - Hidden in print */}
          {!isPrint && (
            <div className="mt-12 pt-8 border-t border-gray-200 text-center print:hidden">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Buat Analisis Sendiri
                </h3>
                <p className="text-gray-600 mb-6">
                  Dapatkan analisis dokumen hukum yang akurat dan mudah dipahami dengan teknologi AI.
                </p>
                <Button size="lg" asChild>
                  <Link href="/">
                    Mulai Analisis Gratis
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}