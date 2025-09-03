import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  Tag, 
  ExternalLink, 
  Download,
  Share,
  AlertTriangle,
  Eye,
  GitCompare
} from 'lucide-react';
import DocumentSummary from '@/components/analysis/DocumentSummary';
import ConflictFlags from '@/components/analysis/ConflictFlags';
import { generateDocumentSummary, findConflicts } from '@/lib/rag-retriever';

interface PageProps {
  params: Promise<{
    document: string;
  }>;
  searchParams: Promise<{
    version?: string;
    view?: 'summary' | 'conflicts' | 'full';
  }>;
}

export default async function PublicDocumentPage({ params, searchParams }: PageProps) {
  const { document: documentId } = await params;
  const { version: versionParam, view = 'summary' } = await searchParams;

  if (!documentId) {
    notFound();
  }

  const supabase = createClient();

  // Get document information
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    notFound();
  }

  // Get document versions
  const { data: versions, error: versionsError } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .eq('processing_status', 'completed')
    .order('created_at', { ascending: false });

  if (versionsError || !versions || versions.length === 0) {
    return <DocumentNotProcessed document={document} />;
  }

  // Determine which version to display
  const targetVersion = versionParam 
    ? versions.find(v => v.id === versionParam || v.version_label === versionParam)
    : versions[0]; // Latest version

  if (!targetVersion) {
    notFound();
  }

  // Generate analysis based on view
  let analysisData = null;
  if (view === 'summary' || view === 'full') {
    try {
      analysisData = await generateDocumentSummary(targetVersion.id);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  }

  let conflictsData = null;
  if (view === 'conflicts' || view === 'full') {
    try {
      conflictsData = await findConflicts(targetVersion.id);
    } catch (error) {
      console.error('Failed to get conflicts:', error);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">{document.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Public Document Analysis
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <DocumentSidebar 
              document={document}
              versions={versions}
              currentVersion={targetVersion}
              currentView={view}
            />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <Suspense fallback={<AnalysisLoading />}>
              {view === 'summary' && analysisData && (
                <DocumentSummary 
                  summary={analysisData}
                  documentTitle={document.title}
                />
              )}
              
              {view === 'conflicts' && conflictsData && (
                <ConflictFlags 
                  conflicts={conflictsData}
                  documentTitle={document.title}
                />
              )}
              
              {view === 'full' && (
                <div className="space-y-8">
                  {analysisData && (
                    <DocumentSummary 
                      summary={analysisData}
                      documentTitle={document.title}
                    />
                  )}
                  
                  {conflictsData && (
                    <ConflictFlags 
                      conflicts={conflictsData}
                      documentTitle={document.title}
                    />
                  )}
                </div>
              )}
              
              {!analysisData && !conflictsData && (
                <AnalysisError />
              )}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>© 2025 Open-LegisAI Lite - AI-powered legal document analysis</p>
              <p className="mt-1">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                AI-generated analysis. Always verify with official sources.
              </p>
            </div>
            
            <div className="text-xs text-muted-foreground text-right">
              <p>Document ID: {document.id}</p>
              <p>Version: {targetVersion.version_label}</p>
              <p>Processed: {new Date(targetVersion.created_at).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Document Sidebar Component
function DocumentSidebar({ 
  document, 
  versions, 
  currentVersion, 
  currentView 
}: {
  document: any;
  versions: any[];
  currentVersion: any;
  currentView: string;
}) {
  return (
    <div className="space-y-6">
      {/* Document Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <span className="text-sm font-medium">Type:</span>
              <div className="flex items-center mt-1">
                <Tag className="h-4 w-4 mr-2" />
                <span className="text-sm capitalize">{document.kind || 'Document'}</span>
              </div>
            </div>
            
            {document.jurisdiction && (
              <div>
                <span className="text-sm font-medium">Jurisdiction:</span>
                <div className="text-sm mt-1 capitalize">{document.jurisdiction}</div>
              </div>
            )}
            
            <div>
              <span className="text-sm font-medium">Created:</span>
              <div className="flex items-center mt-1">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  {new Date(document.created_at).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>
            
            {document.source_url && (
              <div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={document.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Original
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Version Selector */}
      {versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((version) => (
                <Button
                  key={version.id}
                  variant={version.id === currentVersion.id ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={`/${document.id}?version=${version.id}&view=${currentView}`}>
                    {version.version_label}
                    {version.id === currentVersion.id && ' (Current)'}
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis Views</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant={currentView === 'summary' ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <a href={`/${document.id}?version=${currentVersion.id}&view=summary`}>
                <Eye className="mr-2 h-4 w-4" />
                Summary
              </a>
            </Button>
            
            <Button
              variant={currentView === 'conflicts' ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <a href={`/${document.id}?version=${currentVersion.id}&view=conflicts`}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Conflicts
              </a>
            </Button>
            
            <Button
              variant={currentView === 'full' ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <a href={`/${document.id}?version=${currentVersion.id}&view=full`}>
                <FileText className="mr-2 h-4 w-4" />
                Full Analysis
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version Comparison */}
      {versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compare Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              <GitCompare className="mr-2 h-4 w-4" />
              Compare with Previous
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading Component
function AnalysisLoading() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Error Component
function AnalysisError() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Analysis Unavailable</h3>
          <p className="text-sm text-red-700">
            Unable to load document analysis. The document may still be processing or there may be an error.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Document Not Processed Component
function DocumentNotProcessed({ document }: { document: any }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Document Not Processed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              "{document.title}" has not been processed yet or processing failed.
            </p>
            <p className="text-xs text-muted-foreground">
              Document ID: {document.id}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { document: documentId } = await params;
  const supabase = createClient();
  
  const { data: document } = await supabase
    .from('documents')
    .select('title, kind')
    .eq('id', documentId)
    .single();

  if (!document) {
    return {
      title: 'Document Not Found',
    };
  }

  return {
    title: `${document.title} - Open-LegisAI Analysis`,
    description: `AI-powered analysis of ${document.title}. Plain language summary, change detection, and conflict analysis for Indonesian legal documents.`,
    keywords: ['legal', 'document', 'analysis', 'AI', 'Indonesia', document.kind].filter(Boolean),
    openGraph: {
      title: document.title,
      description: `AI-powered legal document analysis`,
      type: 'article',
    },
  };
}