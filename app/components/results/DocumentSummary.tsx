import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Calendar, 
  Hash, 
  BookOpen, 
  PieChart,
  Clock,
  Globe,
  Scale,
  Star,
  TrendingUp,
  Info,
  Download
} from 'lucide-react';
import type { AIAnalysisResult, DocumentSummary as DocumentSummaryType } from '@/types/analysis';

interface DocumentSummaryProps {
  result: AIAnalysisResult;
  className?: string;
}

export default function DocumentSummary({ 
  result,
  className = ''
}: DocumentSummaryProps) {
  // Safe check and extract the summary data from the AI analysis result
  if (!result || !result.results) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No results available</p>
      </div>
    );
  }

  const summary = result.results as DocumentSummaryType;
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getServiceTypeLabel = () => {
    switch (result.service_type) {
      case 'ringkasan':
        return 'Ringkasan Bahasa Sederhana';
      case 'perubahan':
        return 'Deteksi Perubahan';
      case 'konflik':
        return 'Deteksi Konflik';
      default:
        return 'Analisis Dokumen';
    }
  };

  const getServiceIcon = () => {
    switch (result.service_type) {
      case 'ringkasan':
        return <FileText className="h-5 w-5" />;
      case 'perubahan':
        return <TrendingUp className="h-5 w-5" />;
      case 'konflik':
        return <Scale className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getKeyMetrics = () => {
    const metrics = [];
    
    if (summary?.metadata?.reading_time_minutes) {
      metrics.push({
        label: 'Waktu Membaca',
        value: `${summary.metadata.reading_time_minutes} menit`,
        icon: <Clock className="h-4 w-4" />
      });
    }
    
    if (summary?.metadata?.complexity_score) {
      metrics.push({
        label: 'Tingkat Kompleksitas',
        value: `${summary.metadata.complexity_score}/5`,
        icon: <Star className="h-4 w-4" />
      });
    }
    
    if (summary?.metadata?.language_level) {
      metrics.push({
        label: 'Level Bahasa',
        value: summary.metadata.language_level === 'elementary' ? 'Dasar' :
               summary.metadata.language_level === 'intermediate' ? 'Menengah' : 'Lanjut',
        icon: <Globe className="h-4 w-4" />
      });
    }
    
    if (summary?.metadata?.word_count) {
      metrics.push({
        label: 'Jumlah Kata',
        value: summary.metadata.word_count.toLocaleString('id-ID'),
        icon: <Hash className="h-4 w-4" />
      });
    }

    return metrics;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Service Type */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {getServiceIcon()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getServiceTypeLabel()}</h2>
            <p className="text-sm text-muted-foreground">
              Hasil analisis • Job ID: <span className="font-mono text-xs">{result.job_id}</span>
            </p>
          </div>
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Unduh Hasil
        </Button>
      </div>

      {/* Document Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Informasi Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                  {result.status === 'completed' ? 'Selesai' : 
                   result.status === 'failed' ? 'Gagal' : 'Memproses'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Service</span>
                <Badge variant="outline">
                  {getServiceTypeLabel()}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Confidence Score</span>
                <span className="text-sm font-medium">
                  {(result.confidence_score * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Klausa Diproses</span>
                <span className="text-sm">{result.processing_metadata?.total_clauses_processed?.toLocaleString('id-ID') || 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Dihasilkan</span>
                <span className="text-sm">{formatDate(summary.processing_info?.generated_at || '')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Metrik Utama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {getKeyMetrics().map((metric, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-center mb-2 text-muted-foreground">
                    {metric.icon}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {metric.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Summary Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Hash className="h-5 w-5 mr-2" />
            Ringkasan Utama
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none text-gray-700">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <p className="text-blue-900 leading-relaxed">
                {summary.summary}
              </p>
            </div>
            
            {summary?.key_points?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Poin-Poin Penting:</h4>
                <ul className="space-y-2">
                  {summary.key_points.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Glossary */}
      {summary?.glossary?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Glosarium Istilah ({summary.glossary.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.glossary.map((term, index) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{term.term}</h5>
                    {term.category && (
                      <Badge variant="outline" className="text-xs">
                        {term.category === 'legal' ? 'Hukum' :
                         term.category === 'technical' ? 'Teknis' :
                         term.category === 'administrative' ? 'Administrasi' :
                         term.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{term.definition}</p>
                  {term.context && (
                    <p className="text-xs text-blue-600 mt-1 italic">Konteks: {term.context}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2" />
            Indikator Kualitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Kualitas Ekstraksi Teks</span>
                <span className="text-sm font-medium">{((result.quality_indicators?.text_extraction_quality || 0) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(result.quality_indicators?.text_extraction_quality || 0) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Akurasi Analisis AI</span>
                <span className="text-sm font-medium">{((result.quality_indicators?.ai_analysis_confidence || 0) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(result.quality_indicators?.ai_analysis_confidence || 0) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Pengenalan Struktur</span>
                <span className="text-sm font-medium">{((result.quality_indicators?.structure_recognition_accuracy || 0) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(result.quality_indicators?.structure_recognition_accuracy || 0) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Kelengkapan</span>
                <span className="text-sm font-medium">{((result.quality_indicators?.completeness_score || 0) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(result.quality_indicators?.completeness_score || 0) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Informasi Pemrosesan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Model AI</div>
              <div className="font-medium">{summary.processing_info.model_used}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Waktu Proses</div>
              <div className="font-medium">{summary.processing_info.processing_time_seconds}s</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Versi Sistem</div>
              <div className="font-medium">{summary.processing_info.version}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Dihasilkan</div>
              <div className="font-medium">{formatDate(summary.processing_info.generated_at)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {result.warnings?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <Info className="h-5 w-5 mr-2" />
              Peringatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.warnings.map((warning, index) => (
                <li key={index} className="flex items-start space-x-2 text-orange-700">
                  <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <span className="text-sm">{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Limitations */}
      {result.limitations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-600">
              <Info className="h-5 w-5 mr-2" />
              Keterbatasan Analisis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.limitations.map((limitation, index) => (
                <li key={index} className="flex items-start space-x-2 text-gray-600">
                  <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                  <span className="text-sm">{limitation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Alert className="border-orange-200 bg-orange-50">
        <Info className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Disclaimer:</strong> Hasil analisis ini dibuat dengan bantuan AI dan hanya untuk referensi. 
          Selalu verifikasi dengan sumber hukum resmi sebelum mengambil keputusan.
        </AlertDescription>
      </Alert>
    </div>
  );
}