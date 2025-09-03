'use client';

import type { ServiceType, ServiceConfig } from './types';

interface DynamicWorkflowProps {
  selectedService: ServiceType | null;
  serviceConfig?: ServiceConfig;
}

export default function DynamicWorkflow({ selectedService, serviceConfig }: DynamicWorkflowProps) {
  // Default workflow steps when no service is selected
  const defaultWorkflowSteps = [
    { number: 1, title: 'Unggah', description: 'Unggah 1-2 versi dokumen hukum' },
    { number: 2, title: 'Proses', description: 'AI mengekstrak dan menganalisis teks' },
    { number: 3, title: 'Analisis', description: 'Lihat ringkasan, perubahan, dan konflik' },
    { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
  ];

  const workflowSteps = serviceConfig?.workflowSteps || defaultWorkflowSteps;

  return (
    <div className="mx-auto mt-16 max-w-4xl">
      <h2 className="text-center text-2xl font-bold">
        {selectedService ? `Cara Kerja - ${serviceConfig?.title}` : 'Cara Kerja'}
      </h2>
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        {workflowSteps.map((step) => (
          <div key={step.number} className="text-center">
            <div 
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300"
            >
              {step.number}
            </div>
            <h3 className="mt-4 font-semibold transition-all duration-300">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground transition-all duration-300">
              {step.description}
            </p>
          </div>
        ))}
      </div>
      
      {selectedService && (
        <div className="mt-8 text-center">
          <div className="rounded-lg bg-blue-50 p-4 text-sm">
            <p className="font-medium text-blue-800">💡 Tips untuk {serviceConfig?.title}:</p>
            <p className="text-blue-700">
              {selectedService === 'ringkasan' && 
                'Pastikan dokumen berbahasa Indonesia dan berformat PDF yang jelas untuk hasil terbaik.'}
              {selectedService === 'perubahan' && 
                'Unggah versi lama terlebih dahulu, kemudian versi baru untuk perbandingan yang akurat.'}
              {selectedService === 'konflik' && 
                'Dokumen akan dicek terhadap database peraturan yang terus diperbarui untuk hasil yang akurat.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}