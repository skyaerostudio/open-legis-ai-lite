'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle,
  Scale,
  Shield,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  Filter,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Gavel,
  BookOpen
} from 'lucide-react';
import type { AIAnalysisResult, ConflictDetection as ConflictDetectionType, ConflictFlag } from '@/types/analysis';

interface ConflictDetectionProps {
  result: AIAnalysisResult;
  className?: string;
  onConflictSelect?: (conflict: ConflictFlag) => void;
}

interface ConflictFilter {
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  type: 'all' | 'contradiction' | 'overlap' | 'gap' | 'inconsistency';
  confidence: 'all' | 'high' | 'medium' | 'low';
  showDetails: boolean;
}

const DEFAULT_FILTERS: ConflictFilter = {
  severity: 'all',
  type: 'all',
  confidence: 'all',
  showDetails: true
};

export default function ConflictDetection({
  result,
  className = '',
  onConflictSelect
}: ConflictDetectionProps) {
  // Extract the conflict data from the AI analysis result
  const conflictData = result.results as ConflictDetectionType;
  const [filters, setFilters] = useState<ConflictFilter>(DEFAULT_FILTERS);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);

  const updateFilter = (key: keyof ConflictFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleExpand = (conflictId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedItems(newExpanded);
  };

  const getFilteredConflicts = () => {
    return conflictData.conflicts.filter(conflict => {
      // Severity filter
      if (filters.severity !== 'all' && conflict.severity !== filters.severity) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && conflict.conflict_type !== filters.type) {
        return false;
      }

      // Confidence filter
      if (filters.confidence !== 'all') {
        const confidenceLevel = getConfidenceLevel(conflict.confidence_score);
        if (confidenceLevel !== filters.confidence) {
          return false;
        }
      }

      return true;
    });
  };

  const getConfidenceLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };

  const getRiskColor = (risk: ConflictDetectionType['risk_assessment']) => {
    switch (risk) {
      case 'critical':
        return 'text-red-700 bg-red-100';
      case 'high':
        return 'text-orange-700 bg-orange-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'low':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getRiskIcon = (risk: ConflictDetectionType['risk_assessment']) => {
    switch (risk) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      case 'high':
        return <AlertCircle className="h-5 w-5" />;
      case 'medium':
        return <Info className="h-5 w-5" />;
      case 'low':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getSeverityBadge = (severity: ConflictFlag['severity']) => {
    const config = {
      critical: { label: 'Kritis', variant: 'destructive' as const },
      high: { label: 'Tinggi', variant: 'default' as const },
      medium: { label: 'Sedang', variant: 'secondary' as const },
      low: { label: 'Rendah', variant: 'outline' as const }
    };
    
    const { label, variant } = config[severity];
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const getConflictTypeLabel = (type: ConflictFlag['conflict_type']) => {
    switch (type) {
      case 'contradiction':
        return 'Kontradiksi';
      case 'overlap':
        return 'Tumpang Tindih';
      case 'gap':
        return 'Kesenjangan';
      case 'inconsistency':
        return 'Inkonsistensi';
      default:
        return type;
    }
  };

  const getConflictTypeIcon = (type: ConflictFlag['conflict_type']) => {
    switch (type) {
      case 'contradiction':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'overlap':
        return <Scale className="h-4 w-4 text-orange-600" />;
      case 'gap':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'inconsistency':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderConflictCard = (conflict: ConflictFlag) => {
    const isExpanded = expandedItems.has(conflict.id);
    
    return (
      <Card
        key={conflict.id}
        className={`cursor-pointer transition-all ${
          selectedConflict === conflict.id ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => {
          setSelectedConflict(conflict.id);
          onConflictSelect?.(conflict);
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getConflictTypeIcon(conflict.conflict_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-sm truncate">
                    {conflict.conflicting_law_title}
                  </h3>
                  {conflict.conflicting_law_ref && (
                    <Badge variant="outline" className="text-xs">
                      {conflict.conflicting_law_ref}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getConflictTypeLabel(conflict.conflict_type)} • 
                  Skor kemiripan: {(conflict.overlap_score * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getSeverityBadge(conflict.severity)}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(conflict.id);
                }}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Quick Summary */}
          {!isExpanded && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 line-clamp-2">
                {conflict.explanation}
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence: {(conflict.confidence_score * 100).toFixed(0)}%</span>
                <span>Click untuk detail</span>
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-4">
              {/* Explanation */}
              <div>
                <h4 className="text-sm font-medium mb-2">Penjelasan Konflik</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {conflict.explanation}
                </p>
              </div>

              {/* Text Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-3 w-3 text-blue-600" />
                    <span className="text-sm font-medium">Dokumen yang Dianalisis</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap font-sans text-blue-900">
                      {conflict.excerpt_original}
                    </pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Gavel className="h-3 w-3 text-orange-600" />
                    <span className="text-sm font-medium">Peraturan yang Berkonflik</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap font-sans text-orange-900">
                      {conflict.excerpt_conflicting}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Citation Information */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-sm font-medium">Informasi Sumber Hukum</h4>
                <div className="bg-gray-50 border rounded p-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="font-medium">Judul:</span> {conflict.citation_data.title}
                    </div>
                    <div>
                      <span className="font-medium">Jenis:</span> {conflict.citation_data.type}
                    </div>
                    <div>
                      <span className="font-medium">Nomor:</span> {conflict.citation_data.number}
                    </div>
                    <div>
                      <span className="font-medium">Tahun:</span> {conflict.citation_data.year}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <Badge 
                        variant={conflict.citation_data.status === 'active' ? 'default' : 'secondary'}
                        className="ml-1 text-xs"
                      >
                        {conflict.citation_data.status === 'active' ? 'Aktif' :
                         conflict.citation_data.status === 'amended' ? 'Diubah' :
                         conflict.citation_data.status === 'repealed' ? 'Dicabut' :
                         conflict.citation_data.status === 'suspended' ? 'Ditangguhkan' :
                         conflict.citation_data.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Yurisdiksi:</span> 
                      {conflict.citation_data.jurisdiction === 'national' ? 'Nasional' :
                       conflict.citation_data.jurisdiction === 'provincial' ? 'Provinsi' :
                       conflict.citation_data.jurisdiction === 'municipal' ? 'Daerah' :
                       conflict.citation_data.jurisdiction}
                    </div>
                  </div>
                  
                  {conflict.citation_data.url && (
                    <div className="mt-3 pt-3 border-t">
                      <a 
                        href={conflict.citation_data.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Lihat sumber asli
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Suggestion */}
              {conflict.resolution_suggestion && (
                <div className="space-y-2 pt-3 border-t">
                  <h4 className="text-sm font-medium text-green-700">Saran Penyelesaian</h4>
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                    {conflict.resolution_suggestion}
                  </div>
                </div>
              )}

              {/* Legal Precedent */}
              {conflict.legal_precedent && (
                <div className="space-y-2 pt-3 border-t">
                  <h4 className="text-sm font-medium text-purple-700">Preseden Hukum</h4>
                  <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-800">
                    {conflict.legal_precedent}
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <span className="text-xs text-muted-foreground">Tingkat Kemiripan</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Progress value={conflict.overlap_score * 100} className="flex-1 h-2" />
                    <span className="text-xs font-medium">
                      {(conflict.overlap_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Confidence Score</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Progress value={conflict.confidence_score * 100} className="flex-1 h-2" />
                    <span className="text-xs font-medium">
                      {(conflict.confidence_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const filteredConflicts = getFilteredConflicts();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Risk Assessment */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getRiskColor(conflictData.risk_assessment)}`}>
              {getRiskIcon(conflictData.risk_assessment)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Deteksi Konflik Hukum</h2>
              <p className="text-sm text-muted-foreground">
                {conflictData.conflicts.length} potensi konflik ditemukan • 
                Risiko: <span className="font-medium capitalize">{conflictData.risk_assessment}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Risk Assessment Alert */}
        <Alert className={`${
          conflictData.risk_assessment === 'critical' ? 'border-red-200 bg-red-50' :
          conflictData.risk_assessment === 'high' ? 'border-orange-200 bg-orange-50' :
          conflictData.risk_assessment === 'medium' ? 'border-yellow-200 bg-yellow-50' :
          'border-green-200 bg-green-50'
        }`}>
          {getRiskIcon(conflictData.risk_assessment)}
          <AlertDescription className={
            conflictData.risk_assessment === 'critical' ? 'text-red-800' :
            conflictData.risk_assessment === 'high' ? 'text-orange-800' :
            conflictData.risk_assessment === 'medium' ? 'text-yellow-800' :
            'text-green-800'
          }>
            <strong>Penilaian Risiko:</strong> {conflictData.summary}
            <br />
            <strong>Skor Kompatibilitas:</strong> {(conflictData.overall_compatibility_score * 100).toFixed(1)}%
          </AlertDescription>
        </Alert>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Filter className="h-4 w-4 mr-2" />
            Filter Konflik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tingkat Keparahan</label>
              <Select
                value={filters.severity}
                onValueChange={(value) => updateFilter('severity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tingkat</SelectItem>
                  <SelectItem value="critical">Kritis</SelectItem>
                  <SelectItem value="high">Tinggi</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="low">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Konflik</label>
              <Select
                value={filters.type}
                onValueChange={(value) => updateFilter('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="contradiction">Kontradiksi</SelectItem>
                  <SelectItem value="overlap">Tumpang Tindih</SelectItem>
                  <SelectItem value="gap">Kesenjangan</SelectItem>
                  <SelectItem value="inconsistency">Inkonsistensi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confidence Level</label>
              <Select
                value={filters.confidence}
                onValueChange={(value) => updateFilter('confidence', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Level</SelectItem>
                  <SelectItem value="high">Tinggi (80%+)</SelectItem>
                  <SelectItem value="medium">Sedang (60%+)</SelectItem>
                  <SelectItem value="low">Rendah (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Detail</label>
              <Button
                variant="outline"
                onClick={() => updateFilter('showDetails', !filters.showDetails)}
                className="w-full justify-start"
              >
                {filters.showDetails ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Tampilkan Detail
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Sembunyikan Detail
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Daftar Konflik ({filteredConflicts.length})
          </h3>
          
          {filteredConflicts.length !== conflictData.conflicts.length && (
            <Badge variant="secondary" className="text-xs">
              {filteredConflicts.length} dari {conflictData.conflicts.length}
            </Badge>
          )}
        </div>

        {filteredConflicts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Tidak ada konflik yang sesuai dengan filter yang dipilih.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredConflicts
              .sort((a, b) => {
                // Sort by severity first, then by confidence score
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
                if (severityDiff !== 0) return severityDiff;
                return b.confidence_score - a.confidence_score;
              })
              .map(renderConflictCard)}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {conflictData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <BookOpen className="h-4 w-4 mr-2" />
              Rekomendasi ({conflictData.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {conflictData.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Processing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Info className="h-4 w-4 mr-2" />
            Informasi Pemrosesan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Dokumen Dicari:</span>
              <div className="font-medium">{conflictData.processing_info.corpus_searched.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Threshold Kemiripan:</span>
              <div className="font-medium">{(conflictData.processing_info.similarity_threshold * 100).toFixed(0)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Waktu Pemrosesan:</span>
              <div className="font-medium">{conflictData.processing_info.processing_time_seconds}s</div>
            </div>
            <div>
              <span className="text-muted-foreground">Dihasilkan:</span>
              <div className="font-medium">
                {new Date(conflictData.processing_info.generated_at).toLocaleDateString('id-ID')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}