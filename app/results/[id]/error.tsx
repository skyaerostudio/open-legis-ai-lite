'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertCircle, 
  RefreshCcw, 
  Home, 
  ChevronLeft,
  Bug,
  Wifi,
  Server,
  FileX
} from 'lucide-react';

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error details for debugging
    console.error('Results page error:', error);
  }, [error]);

  // Determine error type and provide appropriate messaging
  const getErrorInfo = () => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch failed')) {
      return {
        type: 'network',
        title: 'Masalah Koneksi',
        description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
        icon: Wifi,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }
    
    if (message.includes('timeout')) {
      return {
        type: 'timeout',
        title: 'Server Tidak Merespons',
        description: 'Server membutuhkan waktu terlalu lama untuk merespons. Coba lagi dalam beberapa saat.',
        icon: Server,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: 'not_found',
        title: 'Hasil Analisis Tidak Ditemukan',
        description: 'Hasil analisis yang Anda cari tidak dapat ditemukan atau sudah dihapus.',
        icon: FileX,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    
    if (message.includes('unauthorized') || message.includes('403')) {
      return {
        type: 'unauthorized',
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengakses hasil analisis ini.',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    
    // Default error
    return {
      type: 'general',
      title: 'Terjadi Kesalahan',
      description: 'Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah diberitahu tentang masalah ini.',
      icon: Bug,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

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

        {/* Error Display */}
        <div className="max-w-2xl mx-auto">
          <Card className={`${errorInfo.borderColor} border-2`}>
            <CardHeader className="text-center pb-4">
              <div className={`w-20 h-20 rounded-full ${errorInfo.bgColor} flex items-center justify-center mx-auto mb-4`}>
                <Icon className={`w-10 h-10 ${errorInfo.color}`} />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {errorInfo.title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <p className="text-gray-600 text-center leading-relaxed">
                {errorInfo.description}
              </p>

              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && (
                <details className="bg-gray-100 p-4 rounded-lg text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Detail Kesalahan (Development)
                  </summary>
                  <div className="space-y-2 text-gray-600">
                    <p><strong>Error:</strong> {error.message}</p>
                    {error.digest && (
                      <p><strong>Digest:</strong> {error.digest}</p>
                    )}
                    {error.stack && (
                      <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded border overflow-x-auto">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={reset}
                  className="flex items-center justify-center gap-2"
                  size="lg"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Coba Lagi
                </Button>
                
                <Button 
                  variant="outline" 
                  asChild
                  size="lg"
                >
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <Home className="w-4 h-4" />
                    Kembali ke Beranda
                  </Link>
                </Button>
              </div>

              {/* Additional help based on error type */}
              <div className={`p-4 ${errorInfo.bgColor} ${errorInfo.borderColor} border rounded-lg`}>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Saran Penyelesaian:
                </h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  {errorInfo.type === 'network' && (
                    <>
                      <li>• Periksa koneksi internet Anda</li>
                      <li>• Coba refresh halaman ini</li>
                      <li>• Nonaktifkan VPN jika sedang digunakan</li>
                    </>
                  )}
                  
                  {errorInfo.type === 'timeout' && (
                    <>
                      <li>• Tunggu beberapa saat dan coba lagi</li>
                      <li>• Periksa apakah server sedang dalam maintenance</li>
                      <li>• Coba akses dari browser yang berbeda</li>
                    </>
                  )}
                  
                  {errorInfo.type === 'not_found' && (
                    <>
                      <li>• Periksa URL yang Anda gunakan</li>
                      <li>• Hasil analisis mungkin sudah kedaluwarsa</li>
                      <li>• Buat analisis baru dari beranda</li>
                    </>
                  )}
                  
                  {errorInfo.type === 'unauthorized' && (
                    <>
                      <li>• Pastikan Anda menggunakan link yang benar</li>
                      <li>• Hasil analisis ini mungkin bersifat privat</li>
                      <li>• Hubungi pembuat analisis untuk akses</li>
                    </>
                  )}
                  
                  {errorInfo.type === 'general' && (
                    <>
                      <li>• Coba refresh halaman ini</li>
                      <li>• Tutup dan buka kembali browser</li>
                      <li>• Coba lagi dalam beberapa menit</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Contact support */}
              <div className="text-center text-sm text-gray-500">
                Masalah masih berlanjut? {' '}
                <a 
                  href="mailto:support@open-legisai.com" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Hubungi Tim Dukungan
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Utility function to handle async errors in server components
export function handleAsyncError(error: unknown): never {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('An unknown error occurred');
}