import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Calendar, 
  Hash, 
  BookOpen, 
  PieChart,
  Clock
} from 'lucide-react';

interface DocumentSummaryProps {
  document: any;
  analysis: any;
  versions: any[];
  currentVersion: any;
}

export default function DocumentSummary({ 
  document, 
  analysis, 
  versions, 
  currentVersion 
}: DocumentSummaryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getClauseDistribution = () => {
    const stats = analysis.clause_stats;
    const total = stats.total_clauses;
    
    return [
      { 
        type: 'Pasal', 
        count: stats.articles, 
        percentage: total > 0 ? (stats.articles / total) * 100 : 0,
        color: 'bg-blue-500'
      },
      { 
        type: 'Ayat', 
        count: stats.paragraphs, 
        percentage: total > 0 ? (stats.paragraphs / total) * 100 : 0,
        color: 'bg-green-500'
      },
      { 
        type: 'Huruf', 
        count: stats.points, 
        percentage: total > 0 ? (stats.points / total) * 100 : 0,
        color: 'bg-purple-500'
      },
      { 
        type: 'Bab', 
        count: stats.chapters, 
        percentage: total > 0 ? (stats.chapters / total) * 100 : 0,
        color: 'bg-orange-500'
      }
    ];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Document Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Ikhtisar Dokumen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">Judul</span>
              <span className="text-sm text-right max-w-xs">{document.title}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Jenis Dokumen</span>
              <Badge variant="secondary">{document.kind || 'Dokumen Hukum'}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Yurisdiksi</span>
              <span className="text-sm">{document.jurisdiction || 'Indonesia'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total Halaman</span>
              <span className="text-sm font-semibold">{analysis.pages_count}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Ukuran Teks</span>
              <span className="text-sm">{formatFileSize(analysis.text_length)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Diproses</span>
              <span className="text-sm">{formatDate(analysis.processing_date)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Statistik Pemrosesan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {analysis.clauses_count.toLocaleString('id-ID')}
            </div>
            <p className="text-sm text-muted-foreground">
              Total bagian yang berhasil diidentifikasi dan dianalisis
            </p>
          </div>
          
          <div className="space-y-3">
            {getClauseDistribution().map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.type}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Version Information */}
      {versions.length > 1 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Riwayat Versi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div 
                  key={version.id}
                  className={`p-3 rounded-lg border ${
                    version.id === currentVersion.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Badge variant={version.id === currentVersion.id ? "default" : "secondary"}>
                        {version.version_label}
                      </Badge>
                      {version.id === currentVersion.id && (
                        <span className="text-xs text-primary font-medium">(Saat ini)</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(version.created_at)} • {version.pages} halaman
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Summary */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Hash className="h-5 w-5 mr-2" />
            Ringkasan Analisis AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>
              Dokumen <strong>{document.title}</strong> telah berhasil dianalisis menggunakan teknologi AI. 
              Sistem telah mengidentifikasi dan memproses <strong>{analysis.clauses_count}</strong> bagian 
              dari dokumen yang terdiri dari <strong>{analysis.pages_count}</strong> halaman.
            </p>
            
            {analysis.clause_stats.articles > 0 && (
              <p>
                Struktur dokumen menunjukkan adanya <strong>{analysis.clause_stats.articles} pasal</strong>
                {analysis.clause_stats.paragraphs > 0 && ` dengan ${analysis.clause_stats.paragraphs} ayat`}
                {analysis.clause_stats.points > 0 && ` dan ${analysis.clause_stats.points} poin detail`}.
              </p>
            )}
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
              <p className="text-sm">
                <strong>Catatan:</strong> Analisis ini menggunakan teknologi pemrosesan bahasa alami 
                yang dioptimalkan untuk dokumen hukum Indonesia. Untuk penggunaan resmi, 
                selalu merujuk pada dokumen sumber asli.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}