'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Search, Share2 } from 'lucide-react'
import ExampleDemo from '@/components/demo/ExampleDemo'
import { sampleAnalysis } from '@/lib/demo-data'
import { useState } from 'react'

export default function HomePage() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="container py-8 md:py-12 lg:py-16">
      {/* Hero Section */}
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
          Analisis Dokumen Hukum
          <br />
          <span className="text-primary">Berbasis AI</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Unggah peraturan perundang-undangan Indonesia dan dapatkan ringkasan dalam bahasa yang mudah dipahami, 
          perbandingan perubahan, dan deteksi potensi konflik dengan hukum yang ada.
        </p>
        
        <div className="mt-8">
          <Button size="lg" className="mr-4" onClick={() => {
            const uploadSection = document.getElementById('upload-section');
            if (uploadSection) {
              uploadSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start',

              });
            }
          }}>
            <Upload className="mr-2 h-5 w-5" />
            Mulai Analisis Dokumen
          </Button>
          <Button variant="outline" size="lg" onClick={() => setShowDemo(true)}>
            Lihat Contoh
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto mt-16 max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Ringkasan Bahasa Sederhana</CardTitle>
              <CardDescription>
                AI menghasilkan ringkasan 600-900 kata dalam Bahasa Indonesia yang mudah dipahami 
                dengan glosarium istilah hukum.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Deteksi Perubahan</CardTitle>
              <CardDescription>
                Bandingkan versi dokumen secara visual dengan navigasi "lompat ke perubahan" 
                dan highlight pada tingkat pasal.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Deteksi Konflik</CardTitle>
              <CardDescription>
                Identifikasi potensi tumpang tindih dengan peraturan yang ada menggunakan 
                pencarian semantik dengan kutipan dan referensi.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>


      {/* Demo Modal */}
      {showDemo && (
        <ExampleDemo 
          isOpen={showDemo}
          onClose={() => setShowDemo(false)}
          demoData={sampleAnalysis}
        />
      )}
      
      <div className="mx-auto mt-16 max-w-4xl scroll-mt-12 md:scroll-mt-18" id="upload-section">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Unggah Dokumen</CardTitle>
            <CardDescription className="text-center">
              Mendukung file PDF dan HTML hingga 50MB
            </CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">
                  Seret dan lepas file di sini atau klik untuk pilih
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Format yang didukung: PDF, HTML (maksimal 50MB)
                </p>
                <Button className="mt-4" variant="outline" onClick={() => {
                  // This could trigger a file picker dialog or other upload functionality
                }}>
                  Pilih File
                </Button>
              </div>
              
              <div className="rounded-lg bg-orange-50 p-4 text-sm">
                <p className="font-medium text-orange-800">⚠️ Disclaimer Penting:</p>
                <p className="text-orange-700">
                  Ringkasan dan analisis dibuat menggunakan AI. Selalu verifikasi dengan sumber hukum resmi 
                  sebelum mengambil keputusan berdasarkan hasil analisis ini.
                </p>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Process Overview */}
      <div className="mx-auto mt-16 max-w-4xl">
        <h2 className="text-center text-2xl font-bold">Cara Kerja</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <h3 className="mt-4 font-semibold">Unggah</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Unggah 1-2 versi dokumen hukum
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              2
            </div>
            <h3 className="mt-4 font-semibold">Proses</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI mengekstrak dan menganalisis teks
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <h3 className="mt-4 font-semibold">Analisis</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lihat ringkasan, perubahan, dan konflik
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              4
            </div>
            <h3 className="mt-4 font-semibold">Bagikan</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bagikan link publik untuk transparansi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}