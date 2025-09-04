'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProcessingStatus from '@/components/upload/ProcessingStatus';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const versionId = params.versionId as string;

  const handleComplete = (result: any) => {
    // Navigate to results page when processing completes
    if (result.documentId) {
      router.push(`/results/${result.documentId}?version=${versionId}`);
    }
  };

  const handleError = (error: string) => {
    console.error('Processing error:', error);
    // Could show a toast or redirect to error page
  };

  const handleGoBack = () => {
    router.push('/');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (!versionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Processing ID</h1>
          <p className="text-gray-600 mb-6">The processing ID provided is invalid or missing.</p>
          <Button onClick={handleGoHome} className="flex items-center space-x-2">
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mb-4 flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Document Processing
            </h1>
            <p className="text-lg text-gray-600">
              Your document is being analyzed and processed
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Processing ID: {versionId}
            </p>
          </div>
        </div>

        {/* Processing Status */}
        <div className="max-w-3xl mx-auto">
          <ProcessingStatus
            versionId={versionId}
            onComplete={handleComplete}
            onError={handleError}
            className="shadow-lg"
          />
        </div>

        {/* Additional Information */}
        <div className="max-w-3xl mx-auto mt-8 space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-lg mb-4">What's Happening?</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Text Extraction</h4>
                <p className="text-sm text-gray-600">
                  We&rsquo;re extracting and analyzing the text content from your legal document, 
                  identifying key clauses and structural elements.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">AI Analysis</h4>
                <p className="text-sm text-gray-600">
                  Our AI is generating semantic embeddings and preparing your document 
                  for intelligent search and analysis capabilities.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Database Integration</h4>
                <p className="text-sm text-gray-600">
                  The processed data is being securely stored in our database with 
                  proper indexing for fast retrieval and analysis.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Quality Assurance</h4>
                <p className="text-sm text-gray-600">
                  We&rsquo;re running final quality checks to ensure the accuracy and 
                  completeness of the processed document data.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Processing Time</h3>
            <p className="text-sm text-blue-800">
              Document processing typically takes 2-5 minutes depending on document length and complexity. 
              You can safely leave this page and return later - we&rsquo;ll save your progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}