'use client';

import { useState, useCallback } from 'react';
import type { ServiceType } from '@/components/home/types';

export function useServiceSelection() {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  
  const selectService = useCallback((service: ServiceType) => {
    setSelectedService(service);
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedService(null);
  }, []);
  
  return { selectedService, selectService, clearSelection };
}