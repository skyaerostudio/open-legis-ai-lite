'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, AlertTriangle } from 'lucide-react';
import type { DemoDocument } from '@/lib/demo-data';

interface ExampleDemoProps {
  isOpen: boolean;
  onClose: () => void;
  demoData: DemoDocument;
}

export default function ExampleDemo({ isOpen, onClose, demoData }: ExampleDemoProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-4xl w-full mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Contoh Analisis Dokumen</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Document Title */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{demoData.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{demoData.summary}</p>
            </CardContent>
          </Card>

          {/* Changes Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Perubahan Terdeteksi</CardTitle>
              <CardDescription>
                {demoData.changes.length} perubahan ditemukan dalam dokumen ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoData.changes.map((change, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg mb-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    change.type === 'added' ? 'bg-green-100 text-green-800' :
                    change.type === 'modified' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {change.type === 'added' ? 'Ditambah' :
                     change.type === 'modified' ? 'Diubah' : 'Dihapus'}
                  </span>
                  <div>
                    <p className="font-medium">{change.clause}</p>
                    <p className="text-sm text-muted-foreground">{change.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Conflicts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Potensi Konflik</span>
              </CardTitle>
              <CardDescription>
                {demoData.conflicts.length} potensi konflik dengan peraturan yang ada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoData.conflicts.map((conflict, index) => (
                <div key={index} className="p-3 border rounded-lg mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{conflict.law}</p>
                      <p className="text-sm text-muted-foreground">{conflict.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
                      conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {conflict.severity === 'high' ? 'Tinggi' :
                       conflict.severity === 'medium' ? 'Sedang' : 'Rendah'}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Ini adalah contoh analisis. Unggah dokumen untuk analisis sesungguhnya.
            </p>
            <Button onClick={onClose}>
              Mulai Analisis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}