'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText,
  BarChart3,
  ArrowRightLeft,
  Scale,
  AlertTriangle,
  CheckCircle,
  Info,
  Share2,
  Download,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import type { ServiceJob } from '@/types/processing';
import type { 
  DocumentSummary as DocumentSummaryType, 
  DocumentComparison as DocumentComparisonType, 
  ConflictDetection as ConflictDetectionType 
} from '@/types/analysis';

// Import the result components
import DocumentSummary from './DocumentSummary';
import DocumentComparison from './DocumentComparison';
import ConflictDetection from './ConflictDetection';
import ProcessingProgress from './ProcessingProgress';

interface ResultsNavigationProps {
  jobId: string;
  serviceType: ServiceJob['service_type'];
  status: ServiceJob['status'];
  results?: {
    summary?: DocumentSummaryType;
    comparison?: DocumentComparisonType;
    conflicts?: ConflictDetectionType;
  };
  className?: string;
  onShare?: () => void;
  onExport?: (format: 'pdf' | 'docx') => void;
  onBack?: () => void;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  description?: string;
  available: boolean;
  primary?: boolean;
}

export default function ResultsNavigation({
  jobId,
  serviceType,
  status,
  results,
  className = '',
  onShare,
  onExport,
  onBack
}: ResultsNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Tab configuration based on service type
  const getTabConfig = (): TabConfig[] => {
    const baseTabs: TabConfig[] = [];
    
    // Processing tab (always available when processing)
    if (status === 'processing') {
      baseTabs.push({
        id: 'processing',
        label: 'Pemrosesan',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        description: 'Status pemrosesan real-time',
        available: true,
        primary: true
      });
    }

    // Service-specific tabs
    switch (serviceType) {
      case 'ringkasan':
        baseTabs.push({
          id: 'summary',
          label: 'Ringkasan',
          icon: <FileText className="h-4 w-4" />,
          description: 'Ringkasan bahasa sederhana',
          available: status === 'completed' && !!results?.summary,
          primary: status === 'completed'
        });
        
        baseTabs.push({
          id: 'statistics',
          label: 'Statistik',
          icon: <BarChart3 className="h-4 w-4" />,
          badge: results?.summary?.key_points.length || 0,
          description: 'Metrik dan analisis dokumen',
          available: status === 'completed' && !!results?.summary
        });
        break;

      case 'perubahan':
        baseTabs.push({
          id: 'comparison',
          label: 'Perbandingan',
          icon: <ArrowRightLeft className="h-4 w-4" />,
          badge: results?.comparison?.statistics.total_changes || 0,
          description: 'Deteksi perubahan dokumen',
          available: status === 'completed' && !!results?.comparison,
          primary: status === 'completed'
        });
        
        baseTabs.push({
          id: 'changes',
          label: 'Daftar Perubahan',
          icon: <BarChart3 className="h-4 w-4" />,
          badge: results?.comparison?.changes.length || 0,
          description: 'Rincian setiap perubahan',
          available: status === 'completed' && !!results?.comparison
        });
        break;

      case 'konflik':
        baseTabs.push({
          id: 'conflicts',
          label: 'Deteksi Konflik',
          icon: <Scale className="h-4 w-4" />,
          badge: results?.conflicts?.conflicts.length || 0,
          description: 'Potensi konflik hukum',
          available: status === 'completed' && !!results?.conflicts,
          primary: status === 'completed'
        });
        
        baseTabs.push({
          id: 'risk',
          label: 'Penilaian Risiko',
          icon: results?.conflicts?.risk_assessment === 'critical' ? 
            <AlertTriangle className="h-4 w-4" /> :
            results?.conflicts?.risk_assessment === 'low' ?
            <CheckCircle className="h-4 w-4" /> :
            <Info className="h-4 w-4" />,
          description: `Risiko: ${results?.conflicts?.risk_assessment || 'Tidak diketahui'}`,
          available: status === 'completed' && !!results?.conflicts
        });
        break;

      default:
        // Generic tabs for unknown service types
        baseTabs.push({
          id: 'results',
          label: 'Hasil',
          icon: <FileText className="h-4 w-4" />,
          description: 'Hasil analisis',
          available: status === 'completed',
          primary: true
        });
    }

    return baseTabs.filter(tab => tab.available);
  };

  const tabs = getTabConfig();

  // Set initial active tab
  useEffect(() => {
    if (tabs.length === 0) return;
    
    // Check URL parameter first
    const urlTab = searchParams.get('tab');
    if (urlTab && tabs.some(tab => tab.id === urlTab)) {
      setActiveTab(urlTab);
      return;
    }

    // Otherwise use the primary tab or first available
    const primaryTab = tabs.find(tab => tab.primary);
    const defaultTab = primaryTab || tabs[0];
    setActiveTab(defaultTab.id);
  }, [tabs.length, searchParams, serviceType, status]);

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL without page refresh
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url.toString());
  };

  const getServiceTypeLabel = () => {
    switch (serviceType) {
      case 'ringkasan':
        return 'Ringkasan Bahasa Sederhana';
      case 'perubahan':
        return 'Deteksi Perubahan Dokumen';
      case 'konflik':
        return 'Deteksi Konflik Hukum';
      default:
        return 'Analisis Dokumen';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Selesai</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-600 text-white">Memproses</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      case 'pending':
        return <Badge variant="outline">Menunggu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'processing':
        return (
          <ProcessingProgress 
            jobId={jobId}
            serviceType={serviceType}
            onComplete={() => {
              setIsLoading(true);
              // Refresh the page to get results
              window.location.reload();
            }}
            onError={(error) => {
              console.error('Processing error:', error);
            }}
          />
        );

      case 'summary':
        if (!results?.summary) {
          return <div className="text-center py-8 text-muted-foreground">Tidak ada data ringkasan</div>;
        }
        return (
          <DocumentSummary 
            document={{} as any} // This would be passed from parent
            summary={results.summary}
            serviceType={serviceType}
          />
        );

      case 'statistics':
        if (!results?.summary) {
          return <div className="text-center py-8 text-muted-foreground">Tidak ada data statistik</div>;
        }
        return (
          <div className="space-y-6">
            {/* Statistics view of the summary */}
            <DocumentSummary 
              document={{} as any}
              summary={results.summary}
              serviceType={serviceType}
            />
          </div>
        );

      case 'comparison':
      case 'changes':
        if (!results?.comparison) {
          return <div className="text-center py-8 text-muted-foreground">Tidak ada data perbandingan</div>;
        }
        return <DocumentComparison comparison={results.comparison} />;

      case 'conflicts':
      case 'risk':
        if (!results?.conflicts) {
          return <div className="text-center py-8 text-muted-foreground">Tidak ada data konflik</div>;
        }
        return <ConflictDetection conflictData={results.conflicts} />;

      case 'results':
      default:
        return (
          <div className="text-center py-8">
            <Info className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hasil Analisis</h3>
            <p className="text-muted-foreground">
              {status === 'completed' ? 
                'Hasil analisis siap ditampilkan' :
                status === 'processing' ?
                'Sedang memproses dokumen...' :
                'Menunggu hasil pemrosesan'
              }
            </p>
          </div>
        );
    }
  };

  if (tabs.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {status === 'processing' ? 
              'Sedang memproses dokumen. Silakan tunggu...' :
              'Belum ada hasil yang tersedia untuk ditampilkan.'
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {getServiceTypeLabel()}
            </h1>
            {getStatusBadge()}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Job ID: {jobId.slice(-8)} • 
            {tabs.length} tab tersedia
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          {onShare && status === 'completed' && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Bagikan
            </Button>
          )}
          
          {onExport && status === 'completed' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onExport('pdf')}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Memproses...' : 'Unduh'}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center space-x-2 text-xs md:text-sm"
              aria-label={tab.description}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Contents */}
        {tabs.map((tab) => (
          <TabsContent 
            key={tab.id} 
            value={tab.id} 
            className="space-y-4 focus-visible:outline-none"
          >
            <div className="min-h-[200px]" role="tabpanel" aria-label={tab.description}>
              {renderTabContent(tab.id)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Status Footer */}
      {status === 'failed' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Pemrosesan Gagal:</strong> Terjadi kesalahan saat memproses dokumen. 
            Silakan coba lagi atau hubungi dukungan teknis.
          </AlertDescription>
        </Alert>
      )}
      
      {status === 'processing' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            <strong>Sedang Memproses:</strong> Dokumen sedang dianalisis. 
            Halaman akan diperbarui secara otomatis ketika selesai.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}