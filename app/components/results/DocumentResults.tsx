'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, AlertTriangle, BarChart3, Clock, Users, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import DocumentSummary from './DocumentSummary';
import ClausesView from './ClausesView';
import ConflictsView from './ConflictsView';
import ResultsLoading from './ResultsLoading';

interface DocumentResultsProps {
  documentId: string;
  versionId?: string;
}

export default function DocumentResults({ documentId, versionId }: DocumentResultsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchResults();
  }, [documentId, versionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `/api/results/${documentId}${versionId ? `?version_id=${versionId}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch results');
      }

      const results = await response.json();
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ResultsLoading />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/')} 
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => router.push('/')} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">
            {data.document.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              {data.summary.document_type}
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Diproses {formatDate(data.analysis.processing_date)}
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {data.summary.jurisdiction}
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Bagikan
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Unduh
          </Button>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.summary.key_statistics.map((stat: any, index: number) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stat.value.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts for conflicts */}
      {data.has_conflicts && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Perhatian:</strong> Ditemukan {data.conflicts.length} potensi konflik 
            dengan peraturan yang sudah ada. Lihat tab "Deteksi Konflik" untuk detail.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ringkasan
          </TabsTrigger>
          <TabsTrigger value="clauses" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Pasal-Pasal ({data.analysis.clauses_count})
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Deteksi Konflik ({data.conflicts.length})
            {data.has_conflicts && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                !
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <DocumentSummary 
            document={data.document}
            analysis={data.analysis}
            versions={data.versions}
            currentVersion={data.version}
          />
        </TabsContent>

        <TabsContent value="clauses" className="space-y-6">
          <ClausesView 
            clauses={data.clauses}
            document={data.document}
            analysis={data.analysis}
          />
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-6">
          <ConflictsView 
            conflicts={data.conflicts}
            document={data.document}
          />
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
        <p className="text-sm text-orange-800">
          <strong>⚠️ Disclaimer:</strong> Hasil analisis ini dibuat dengan bantuan AI dan hanya untuk referensi. 
          Selalu verifikasi dengan sumber hukum resmi sebelum mengambil keputusan.
        </p>
      </div>
    </div>
  );
}