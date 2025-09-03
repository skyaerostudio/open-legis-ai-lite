'use client';

import { Card, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ServiceType, ServiceConfig } from './types';

interface ServiceSelectorProps {
  services: ServiceConfig[];
  selectedService: ServiceType | null;
  onServiceSelect: (service: ServiceType) => void;
}

export default function ServiceSelector({ services, selectedService, onServiceSelect }: ServiceSelectorProps) {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {services.map((service) => (
        <Card 
          key={service.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-lg",
            selectedService === service.id 
              ? "ring-2 ring-primary shadow-lg" 
              : "hover:shadow-md"
          )}
          onClick={() => onServiceSelect(service.id)}
          tabIndex={0}
          role="button"
          aria-pressed={selectedService === service.id}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onServiceSelect(service.id);
            }
          }}
        >
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <service.icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">{service.title}</CardTitle>
            <CardDescription>
              {service.description}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}