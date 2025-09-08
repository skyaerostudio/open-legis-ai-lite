import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Home, 
  FileText, 
  Clock,
  ChevronLeft,
  Upload,
  Sparkles
} from 'lucide-react';

export default function ResultsNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Kembali ke Beranda
          </Link>
        </div>

        {/* 404 Display */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-2">
            <CardHeader className="text-center pb-6">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                Hasil Analisis Tidak Ditemukan
              </CardTitle>
              <p className="text-gray-600 text-lg">
                Hasil analisis yang Anda cari tidak dapat ditemukan atau sudah tidak tersedia.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-8">
              {/* Search functionality */}
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    type="text" 
                    placeholder="Cari berdasarkan ID analisis..." 
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Masukkan ID analisis untuk mencari hasil yang spesifik
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    Mulai Analisis Baru
                  </Link>
                </Button>
                
                <Button variant="outline" size="lg" asChild>
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <Home className="w-5 h-5" />
                    Kembali ke Beranda
                  </Link>
                </Button>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Ringkasan Bahasa Sederhana
                  </h3>
                  <p className="text-sm text-gray-600">
                    Dapatkan ringkasan dokumen hukum dalam bahasa yang mudah dipahami
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href="/?service=ringkasan">Coba Sekarang</Link>
                  </Button>
                </div>

                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Deteksi Perubahan
                  </h3>
                  <p className="text-sm text-gray-600">
                    Bandingkan dua versi dokumen untuk menemukan perubahan penting
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href="/?service=perubahan">Coba Sekarang</Link>
                  </Button>
                </div>

                <div className="text-center p-6 bg-orange-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Deteksi Konflik
                  </h3>
                  <p className="text-sm text-gray-600">
                    Temukan potensi konflik dengan peraturan yang sudah ada
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href="/?service=konflik">Coba Sekarang</Link>
                  </Button>
                </div>
              </div>

              {/* Recent results suggestion (this would be populated with actual data) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">
                    Analisis Terbaru
                  </h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Lihat beberapa contoh hasil analisis yang baru-baru ini dibuat:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded border hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          UU No. 8 Tahun 2024 - Ringkasan
                        </p>
                        <p className="text-xs text-gray-500">
                          2 jam yang lalu
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded border hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Perda DKI - Deteksi Perubahan
                        </p>
                        <p className="text-xs text-gray-500">
                          5 jam yang lalu
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded border hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Perpres 2024 - Deteksi Konflik
                        </p>
                        <p className="text-xs text-gray-500">
                          1 hari yang lalu
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded border hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          PP No. 15 - Ringkasan
                        </p>
                        <p className="text-xs text-gray-500">
                          2 hari yang lalu
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-3 text-center">
                  *Ini adalah contoh data. Hasil analisis sebenarnya bersifat privat.
                </p>
              </div>

              {/* Help section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Butuh Bantuan?
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Pastikan URL yang Anda gunakan sudah benar</p>
                  <p>• Hasil analisis mungkin sudah kedaluwarsa (7 hari)</p>
                  <p>• Coba buat analisis baru dengan dokumen yang sama</p>
                  <p>• Hubungi kami jika masalah terus berlanjut</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    Ada pertanyaan lain? {' '}
                    <a 
                      href="mailto:support@open-legisai.com" 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Hubungi Tim Dukungan
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}