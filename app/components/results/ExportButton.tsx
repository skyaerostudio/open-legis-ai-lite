'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  FileText, 
  File, 
  Globe, 
  Printer,
  Settings,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Palette,
  Type,
  Share2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ExportConfiguration } from '@/types/analysis';
import type { ServiceJob } from '@/types/processing';

interface ExportButtonProps {
  jobId: string;
  serviceType: ServiceJob['service_type'];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'lg';
  className?: string;
  onExportStart?: (format: ExportConfiguration['format']) => void;
  onExportComplete?: (downloadUrl: string) => void;
  onExportError?: (error: string) => void;
}

const DEFAULT_CONFIG: ExportConfiguration = {
  format: 'pdf',
  sections: {
    include_summary: true,
    include_detailed_changes: true,
    include_conflicts: true,
    include_citations: true,
    include_glossary: true,
    include_metadata: false
  },
  styling: {
    language: 'indonesian',
    color_scheme: 'default',
    font_size: 'medium',
    include_logo: true
  },
  accessibility: {
    alt_text_for_images: true,
    high_contrast_mode: false,
    screen_reader_optimized: false
  }
};

export default function ExportButton({
  jobId,
  serviceType,
  variant = 'outline',
  size = 'sm',
  className = '',
  onExportStart,
  onExportComplete,
  onExportError
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [config, setConfig] = useState<ExportConfiguration>(DEFAULT_CONFIG);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const updateConfig = (key: keyof ExportConfiguration, value: any) => {
    if (typeof value === 'object' && value !== null) {
      setConfig(prev => ({
        ...prev,
        [key]: { ...(prev[key] as object), ...value }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const getFormatIcon = (format: ExportConfiguration['format']) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'docx':
        return <File className="h-4 w-4" />;
      case 'html':
        return <Globe className="h-4 w-4" />;
      case 'json':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileText className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: ExportConfiguration['format']) => {
    switch (format) {
      case 'pdf':
        return 'PDF Document';
      case 'docx':
        return 'Microsoft Word';
      case 'html':
        return 'Web Page';
      case 'json':
        return 'JSON Data';
      case 'csv':
        return 'CSV Spreadsheet';
      default:
        return (format as string).toUpperCase();
    }
  };

  const getServiceSpecificSections = () => {
    const baseSections = [
      { key: 'include_summary', label: 'Ringkasan Utama', description: 'Ringkasan hasil analisis' },
      { key: 'include_citations', label: 'Daftar Sitasi', description: 'Referensi dan sumber hukum' },
      { key: 'include_metadata', label: 'Metadata', description: 'Informasi teknis pemrosesan' }
    ];

    switch (serviceType) {
      case 'ringkasan':
        return [
          ...baseSections,
          { key: 'include_glossary', label: 'Glosarium', description: 'Istilah hukum dan definisi' }
        ];
      
      case 'perubahan':
        return [
          ...baseSections,
          { key: 'include_detailed_changes', label: 'Rincian Perubahan', description: 'Daftar lengkap semua perubahan' }
        ];
      
      case 'konflik':
        return [
          ...baseSections,
          { key: 'include_conflicts', label: 'Detail Konflik', description: 'Analisis lengkap potensi konflik' }
        ];
      
      default:
        return baseSections;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    onExportStart?.(config.format);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          service_type: serviceType,
          config: config
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Async export - get download URL later
        const result = await response.json();
        setLastExport(result.download_url);
        onExportComplete?.(result.download_url);
        
        // Show success message
        setIsOpen(false);
      } else {
        // Direct download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `open-legis-ai-${serviceType}-${jobId.slice(-8)}.${config.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        setLastExport(url);
        onExportComplete?.(url);
        setIsOpen(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      onExportError?.(errorMessage);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getEstimatedFileSize = () => {
    // Rough estimation based on service type and included sections
    let baseSize = 0.5; // MB
    
    if (config.sections.include_summary) baseSize += 0.3;
    if (config.sections.include_detailed_changes) baseSize += 0.8;
    if (config.sections.include_conflicts) baseSize += 0.6;
    if (config.sections.include_citations) baseSize += 0.2;
    if (config.sections.include_glossary) baseSize += 0.4;
    if (config.sections.include_metadata) baseSize += 0.1;
    
    // Format multipliers
    const formatMultiplier = {
      pdf: 1.0,
      docx: 0.7,
      html: 0.3,
      json: 0.2,
      csv: 0.1
    };
    
    const finalSize = baseSize * (formatMultiplier[config.format] || 1.0);
    
    return finalSize < 1 ? 
      `${Math.round(finalSize * 1000)} KB` : 
      `${finalSize.toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Download className="h-4 w-4 mr-2" />
          Unduh Hasil
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Ekspor Hasil Analisis
          </DialogTitle>
          <DialogDescription>
            Konfigurasi format dan konten yang akan diekspor dari hasil analisis {serviceType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format File</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(['pdf', 'docx', 'html', 'json', 'csv'] as const).map((format) => (
                <Button
                  key={format}
                  variant={config.format === format ? 'default' : 'outline'}
                  onClick={() => updateConfig('format', format)}
                  className="justify-start h-auto p-3"
                >
                  <div className="flex items-center space-x-2">
                    {getFormatIcon(format)}
                    <div className="text-left">
                      <div className="font-medium text-xs">{format.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">
                        {getFormatLabel(format)}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Konten yang Disertakan</Label>
            <div className="grid grid-cols-1 gap-3">
              {getServiceSpecificSections().map((section) => (
                <div key={section.key} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={section.key}
                    checked={config.sections[section.key as keyof typeof config.sections]}
                    onCheckedChange={(checked) => 
                      updateConfig('sections', { [section.key]: checked })
                    }
                  />
                  <div className="space-y-1">
                    <Label 
                      htmlFor={section.key} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {section.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Styling Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              Pengaturan Tampilan
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bahasa</Label>
                <Select
                  value={config.styling.language}
                  onValueChange={(value) => updateConfig('styling', { language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indonesian">Bahasa Indonesia</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Skema Warna</Label>
                <Select
                  value={config.styling.color_scheme}
                  onValueChange={(value) => updateConfig('styling', { color_scheme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="high_contrast">Kontras Tinggi</SelectItem>
                    <SelectItem value="print_friendly">Ramah Cetak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ukuran Font</Label>
                <Select
                  value={config.styling.font_size}
                  onValueChange={(value) => updateConfig('styling', { font_size: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Kecil</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="large">Besar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_logo"
                    checked={config.styling.include_logo}
                    onCheckedChange={(checked) => 
                      updateConfig('styling', { include_logo: checked })
                    }
                  />
                  <Label htmlFor="include_logo" className="text-xs cursor-pointer">
                    Sertakan Logo
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Aksesibilitas
            </Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alt_text"
                  checked={config.accessibility.alt_text_for_images}
                  onCheckedChange={(checked) => 
                    updateConfig('accessibility', { alt_text_for_images: checked })
                  }
                />
                <Label htmlFor="alt_text" className="text-sm cursor-pointer">
                  Alt text untuk gambar
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="high_contrast"
                  checked={config.accessibility.high_contrast_mode}
                  onCheckedChange={(checked) => 
                    updateConfig('accessibility', { high_contrast_mode: checked })
                  }
                />
                <Label htmlFor="high_contrast" className="text-sm cursor-pointer">
                  Mode kontras tinggi
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="screen_reader"
                  checked={config.accessibility.screen_reader_optimized}
                  onCheckedChange={(checked) => 
                    updateConfig('accessibility', { screen_reader_optimized: checked })
                  }
                />
                <Label htmlFor="screen_reader" className="text-sm cursor-pointer">
                  Dioptimalkan untuk screen reader
                </Label>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <Alert className="border-blue-200 bg-blue-50">
            <Settings className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex justify-between items-center">
                <span>
                  <strong>Format:</strong> {getFormatLabel(config.format)} • 
                  <strong>Perkiraan ukuran:</strong> {getEstimatedFileSize()}
                </span>
                <Badge variant="outline" className="text-blue-700">
                  {Object.values(config.sections).filter(Boolean).length} bagian
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Last Export Info */}
          {lastExport && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Ekspor terakhir berhasil!</strong> File telah diunduh ke perangkat Anda.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Batal
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setConfig(DEFAULT_CONFIG)}
              disabled={isExporting}
            >
              Reset
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[120px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  {getFormatIcon(config.format)}
                  <span className="ml-2">Unduh {config.format.toUpperCase()}</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}