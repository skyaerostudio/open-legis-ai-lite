'use client';

import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import ExampleDemo from '@/components/demo/ExampleDemo'
import { sampleAnalysis } from '@/lib/demo-data'
import { useState } from 'react'
import ServiceSelector from '@/components/home/ServiceSelector'
import DynamicUploadArea from '@/components/home/DynamicUploadArea'
import DynamicWorkflow from '@/components/home/DynamicWorkflow'
import { useServiceSelection } from '@/hooks/useServiceSelection'
import { serviceConfigs } from '@/components/home/serviceConfig'

export default function HomePage() {
  const [showDemo, setShowDemo] = useState(false);
  const { selectedService, setSelectedService } = useServiceSelection();
  
  const selectedServiceConfig = serviceConfigs.find(config => config.id === selectedService);

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

      {/* Interactive Service Selector */}
      <div className="mx-auto mt-16 max-w-6xl">
        <ServiceSelector 
          services={serviceConfigs}
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
        />
      </div>


      {/* Demo Modal */}
      {showDemo && (
        <ExampleDemo 
          isOpen={showDemo}
          onClose={() => setShowDemo(false)}
          demoData={sampleAnalysis}
        />
      )}
      
      {/* Dynamic Upload Area */}
      <DynamicUploadArea 
        selectedService={selectedService}
        serviceConfig={selectedServiceConfig}
      />

      {/* Dynamic Workflow */}
      <DynamicWorkflow 
        selectedService={selectedService}
        serviceConfig={selectedServiceConfig}
      />
    </div>
  )
}