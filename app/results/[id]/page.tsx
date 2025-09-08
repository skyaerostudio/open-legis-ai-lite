import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ResultsNavigation from '@/components/results/ResultsNavigation';
import ProcessingProgress from '@/components/results/ProcessingProgress';
import DocumentSummary from '@/components/results/DocumentSummary';
import DocumentComparison from '@/components/results/DocumentComparison';
import ConflictDetection from '@/components/results/ConflictDetection';
import ExportButton from '@/components/results/ExportButton';
import { SERVICE_JOB_CONFIGS } from '@/types/processing';
import type { AIAnalysisResult } from '@/types/analysis';
import type { ServiceJob } from '@/types/processing';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// Server-side data fetching for job results
async function getJobResults(jobId: string): Promise<{
  job: ServiceJob | null;
  result: AIAnalysisResult | null;
  error?: string;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Fetch job details and results
    const [jobResponse, resultResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/jobs/${jobId}`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/results/${jobId}`, { cache: 'no-store' })
    ]);

    let job: ServiceJob | null = null;
    let result: AIAnalysisResult | null = null;

    // Process job response
    if (jobResponse.status === 'fulfilled' && jobResponse.value.ok) {
      const jobData = await jobResponse.value.json();
      if (jobData.success) {
        job = jobData.job;
      }
    }

    // Process result response
    if (resultResponse.status === 'fulfilled' && resultResponse.value.ok) {
      const resultData = await resultResponse.value.json();
      if (resultData.success) {
        result = resultData.result;
      }
    }

    return { job, result };
  } catch (error) {
    console.error('Error fetching job results:', error);
    return { 
      job: null, 
      result: null, 
      error: 'Failed to load job results' 
    };
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { job, result } = await getJobResults(id);
  
  if (!job) {
    return {
      title: 'Analysis Results Not Found | Open-LegisAI',
      description: 'The requested document analysis could not be found.',
      robots: { index: false, follow: false }
    };
  }

  const serviceConfig = SERVICE_JOB_CONFIGS[job.service_type];
  const title = result?.results?.title || `${serviceConfig.display_name} Analysis`;
  
  return {
    title: `${title} - Results | Open-LegisAI`,
    description: `${serviceConfig.description}. Status: ${job.status === 'completed' ? 'Completed' : 'In Progress'}.`,
    keywords: ['legal analysis', 'indonesia', 'document processing', 'AI', 'regulation', job.service_type],
    robots: { index: false, follow: false }, // Private results should not be indexed
    openGraph: {
      title: `${title} - Analysis Results`,
      description: `${serviceConfig.description}`,
      type: 'article',
      siteName: 'Open-LegisAI',
      locale: 'id_ID',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Analysis Results`,
      description: `${serviceConfig.description}`,
    }
  };
}

// Results content component with real-time updates
function ResultsContent({ jobId, initialJob, initialResult, activeTab }: {
  jobId: string;
  initialJob: ServiceJob | null;
  initialResult: AIAnalysisResult | null;
  activeTab: string;
}) {
  // If job is still processing, show progress
  if (initialJob && initialJob.status !== 'completed') {
    return (
      <div className="space-y-6">
        <ProcessingProgress 
          jobId={jobId}
          initialStatus={initialJob.status}
          initialProgress={initialJob.progress}
        />
      </div>
    );
  }

  // If job failed, show error state
  if (initialJob && initialJob.status === 'failed') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Analisis Gagal
        </h2>
        <p className="text-gray-600 mb-6">
          {initialJob.error_message || 'Terjadi kesalahan saat memproses dokumen'}
        </p>
        <Link 
          href="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // If no result yet, show not found
  if (!initialResult) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Hasil Tidak Ditemukan
        </h2>
        <p className="text-gray-600 mb-6">
          Hasil analisis belum tersedia atau tidak dapat ditemukan
        </p>
        <Link 
          href="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Show results based on service type and active tab
  const serviceType = initialResult.service_type;
  
  return (
    <div className="space-y-6">
      {/* Navigation and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <ResultsNavigation 
          serviceType={serviceType}
          activeTab={activeTab}
        />
        <ExportButton 
          jobId={jobId}
          serviceType={serviceType}
          result={initialResult}
        />
      </div>

      {/* Results Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        {serviceType === 'ringkasan' && (
          <DocumentSummary result={initialResult} />
        )}
        
        {serviceType === 'perubahan' && (
          <DocumentComparison result={initialResult} />
        )}
        
        {serviceType === 'konflik' && (
          <ConflictDetection result={initialResult} />
        )}
      </div>
    </div>
  );
}

export default async function ResultsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const jobId = id;
  const activeTab = tab || 'summary';

  if (!jobId) {
    notFound();
  }

  // Server-side data fetching
  const { job, result, error } = await getJobResults(jobId);

  if (error && !job) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Kembali ke Beranda
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">
            Hasil Analisis Dokumen
          </h1>
          
          {job && (
            <p className="text-gray-600 mt-2">
              {SERVICE_JOB_CONFIGS[job.service_type].display_name}
            </p>
          )}
        </div>

        {/* Results Content with Suspense */}
        <Suspense fallback={
          <div className="space-y-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
          </div>
        }>
          <ResultsContent 
            jobId={jobId}
            initialJob={job}
            initialResult={result}
            activeTab={activeTab}
          />
        </Suspense>
      </div>
    </div>
  );
}