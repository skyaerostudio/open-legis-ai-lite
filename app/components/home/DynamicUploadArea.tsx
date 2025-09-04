'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UploadWorkflowManager from './UploadWorkflowManager';
import type { ServiceType, ServiceConfig } from './types';

interface DynamicUploadAreaProps {
  selectedService: ServiceType | null;
  serviceConfig?: ServiceConfig;
}

export default function DynamicUploadArea({ selectedService, serviceConfig }: DynamicUploadAreaProps) {

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
          <UploadWorkflowManager
            selectedService={selectedService}
            serviceConfig={serviceConfig}
          />
          
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