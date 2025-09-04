import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import DocumentResults from '@/components/results/DocumentResults';
import ResultsLoading from '@/components/results/ResultsLoading';

interface PageProps {
  params: { id: string };
  searchParams: { version?: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/results/${params.id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return {
        title: 'Document Not Found | Open-LegisAI Lite',
        description: 'The requested document analysis could not be found.'
      };
    }
    
    const data = await response.json();
    
    return {
      title: `${data.document.title} - Analysis | Open-LegisAI Lite`,
      description: `AI-powered analysis of ${data.document.title} with ${data.analysis.clauses_count} clauses extracted and processed.`,
      keywords: ['legal', 'indonesia', 'document analysis', 'AI', 'regulation'],
      openGraph: {
        title: `${data.document.title} - Analysis`,
        description: `AI-powered legal document analysis with ${data.analysis.clauses_count} clauses processed.`,
        type: 'article'
      }
    };
  } catch {
    return {
      title: 'Document Analysis | Open-LegisAI Lite',
      description: 'AI-powered legal document analysis results.'
    };
  }
}

export default function ResultsPage({ params, searchParams }: PageProps) {
  const documentId = params.id;
  const versionId = searchParams.version;

  if (!documentId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<ResultsLoading />}>
          <DocumentResults 
            documentId={documentId} 
            versionId={versionId}
          />
        </Suspense>
      </div>
    </div>
  );
}