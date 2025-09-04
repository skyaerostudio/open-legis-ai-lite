import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Scale,
  AlertCircle
} from 'lucide-react';

interface ConflictsViewProps {
  conflicts: any[];
  document: any;
}

export default function ConflictsView({ conflicts, document }: ConflictsViewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-50';
    if (score >= 0.6) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Tinggi';
    if (score >= 0.6) return 'Sedang';
    return 'Rendah';
  };

  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  if (conflicts.length === 0) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Tidak ditemukan konflik</strong> - Dokumen ini tidak menunjukkan 
            tumpang tindih yang signifikan dengan peraturan yang sudah ada dalam basis data.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="text-center py-12">
            <Scale className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Analisis Konflik Selesai</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Sistem telah menganalisis dokumen <strong>{document.title}</strong> dan 
              tidak menemukan potensi konflik dengan peraturan yang sudah ada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Ditemukan {conflicts.length} potensi konflik</strong> dengan peraturan yang sudah ada. 
          Silakan tinjau setiap item untuk memahami area yang mungkin bermasalah.
        </AlertDescription>
      </Alert>

      {/* Conflicts List */}
      <div className="space-y-4">
        {conflicts.map((conflict, index) => (
          <Card key={conflict.id} className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg flex items-center">
                    <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                    Konflik #{index + 1}
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {conflict.law_ref}
                    </Badge>
                    <Badge 
                      className={`text-xs ${getScoreColor(conflict.overlap_score)}`}
                    >
                      Tingkat: {getScoreLabel(conflict.overlap_score)}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatScore(conflict.overlap_score)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Skor Kemiripan
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Conflicting Text Excerpt */}
              <div>
                <h4 className="font-medium text-sm mb-2">Bagian yang Berpotensi Konflik:</h4>
                <div className="bg-gray-50 border-l-4 border-l-orange-400 p-3 rounded-r">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {conflict.excerpt}
                  </p>
                </div>
              </div>

              {/* Citation Information */}
              {conflict.cite_json && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Referensi Hukum:</h4>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <div className="space-y-2">
                      {conflict.cite_json.title && (
                        <div className="text-sm">
                          <span className="font-medium">Judul:</span> {conflict.cite_json.title}
                        </div>
                      )}
                      
                      {conflict.cite_json.article && (
                        <div className="text-sm">
                          <span className="font-medium">Pasal:</span> {conflict.cite_json.article}
                        </div>
                      )}
                      
                      {conflict.cite_json.paragraph && (
                        <div className="text-sm">
                          <span className="font-medium">Ayat:</span> {conflict.cite_json.paragraph}
                        </div>
                      )}
                      
                      {conflict.cite_json.url && (
                        <div className="text-sm">
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto text-blue-600"
                            onClick={() => window.open(conflict.cite_json.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Lihat Sumber Asli
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Explanation */}
              <div>
                <h4 className="font-medium text-sm mb-2">Analisis:</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    Sistem AI mendeteksi kemiripan sebesar <strong>{formatScore(conflict.overlap_score)}</strong> 
                    antara bagian dokumen ini dengan peraturan yang sudah ada: <strong>{conflict.law_ref}</strong>.
                  </p>
                  
                  {conflict.overlap_score >= 0.8 && (
                    <div className="bg-red-50 border border-red-200 p-2 rounded">
                      <p className="text-red-800 text-xs">
                        <strong>Perhatian Tinggi:</strong> Kemiripan yang sangat tinggi menunjukkan 
                        potensi tumpang tindih atau konflik yang signifikan dengan peraturan yang sudah ada.
                      </p>
                    </div>
                  )}
                  
                  {conflict.overlap_score >= 0.6 && conflict.overlap_score < 0.8 && (
                    <div className="bg-orange-50 border border-orange-200 p-2 rounded">
                      <p className="text-orange-800 text-xs">
                        <strong>Perhatian Sedang:</strong> Ada kemungkinan tumpang tindih yang perlu 
                        ditinjau lebih lanjut untuk memastikan konsistensi hukum.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Methodology Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-sm mb-2 text-blue-900">Metodologi Deteksi Konflik</h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p>
              • Sistem menggunakan teknologi pemrosesan bahasa alami untuk menganalisis 
              kemiripan semantik antar dokumen hukum.
            </p>
            <p>
              • Skor kemiripan dihitung berdasarkan analisis vektor teks yang dioptimalkan 
              untuk bahasa Indonesia dan terminologi hukum.
            </p>
            <p>
              • Konflik potensial diidentifikasi ketika ada kemiripan tinggi yang menunjukkan 
              kemungkinan tumpang tindih atau kontradiksi.
            </p>
            <p className="font-medium">
              ⚠️ Hasil ini adalah bantuan analisis. Verifikasi manual tetap diperlukan untuk 
              keputusan hukum yang definitif.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}