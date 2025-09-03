'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FileDropZone from '@/components/upload/FileDropZone';
import type { ServiceType, ServiceConfig } from './types';

interface DynamicUploadAreaProps {
  selectedService: ServiceType | null;
  serviceConfig?: ServiceConfig;
}

export default function DynamicUploadArea({ selectedService, serviceConfig }: DynamicUploadAreaProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Clear uploaded files when service changes
  useEffect(() => {
    setUploadedFiles([]);
  }, [selectedService]);

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files);
    console.log('Files selected:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
  };

  if (!selectedService || !serviceConfig) {
    return (
      <div className="mx-auto mt-16 max-w-4xl scroll-mt-12 md:scroll-mt-18" id="upload-section">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Unggah Dokumen</CardTitle>
            <CardDescription className="text-center">
              Pilih layanan terlebih dahulu untuk mengunggah dokumen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                Silakan pilih salah satu layanan di atas
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Setiap layanan memiliki kebutuhan dokumen yang berbeda
              </p>
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
    );
  }

  const getServiceSpecificInstructions = () => {
    switch (selectedService) {
      case 'ringkasan':
        return 'Unggah 1 dokumen hukum untuk mendapatkan ringkasan dalam bahasa sederhana';
      case 'perubahan':
        return 'Unggah 2 versi dokumen untuk membandingkan perubahan secara visual';
      case 'konflik':
        return 'Unggah 1 dokumen untuk mendeteksi konflik dengan peraturan yang ada';
      default:
        return 'Mendukung file PDF dan HTML hingga 50MB';
    }
  };

  const getServiceSpecificDescription = () => {
    switch (selectedService) {
      case 'ringkasan':
        return 'Dokumen akan diproses untuk menghasilkan ringkasan yang mudah dipahami';
      case 'perubahan':
        return 'Kedua versi dokumen akan dibandingkan untuk mendeteksi perubahan';
      case 'konflik':
        return 'Dokumen akan dicek terhadap database peraturan yang ada';
      default:
        return 'Mendukung file PDF dan HTML hingga 50MB';
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-4xl scroll-mt-12 md:scroll-mt-18" id="upload-section">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Unggah Dokumen</CardTitle>
          <CardDescription className="text-center">
            {getServiceSpecificDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            maxFiles={serviceConfig.maxFiles}
            acceptedTypes={['pdf', 'html']}
            maxFileSize={50 * 1024 * 1024} // 50MB
            uploadInstructions={getServiceSpecificInstructions()}
          />
          
          {uploadedFiles.length > 0 && (
            <div className="rounded-lg bg-green-50 p-4">
              <p className="font-medium text-green-800">✅ File berhasil dipilih:</p>
              <ul className="mt-2 space-y-1 text-green-700">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="text-sm">
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}
          
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
  );
}