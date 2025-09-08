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
  ArrowRightLeft,
  Plus,
  Minus,
  Edit,
  Move,
  Filter,
  BarChart3,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import type { AIAnalysisResult, DocumentComparison as DocumentComparisonType, DocumentDiff } from '@/types/analysis';

interface DocumentComparisonProps {
  result: AIAnalysisResult;
  className?: string;
  onChangeFilter?: (filters: ChangeFilter[]) => void;
}

interface ChangeFilter {
  type: 'all' | 'added' | 'deleted' | 'modified' | 'moved';
  significance: 'all' | 'critical' | 'major' | 'minor' | 'trivial';
  showContext: boolean;
}

const DEFAULT_FILTERS: ChangeFilter = {
  type: 'all',
  significance: 'all',
  showContext: true
};

export default function DocumentComparison({
  result,
  className = '',
  onChangeFilter
}: DocumentComparisonProps) {
  // Extract the comparison data from the AI analysis result
  const comparison = result.results as DocumentComparisonType;
  const [filters, setFilters] = useState<ChangeFilter>(DEFAULT_FILTERS);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  
  const updateFilter = (key: keyof ChangeFilter, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onChangeFilter?.([newFilters]);
  };

  const toggleExpand = (changeId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId);
    } else {
      newExpanded.add(changeId);
    }
    setExpandedItems(newExpanded);
  };

  const getFilteredChanges = () => {
    return comparison.changes.filter(change => {
      // Type filter
      if (filters.type !== 'all' && change.change_type !== filters.type) {
        return false;
      }

      // Significance filter
      if (filters.significance !== 'all') {
        const significanceLevel = getSignificanceLevel(change.significance_score);
        if (significanceLevel !== filters.significance) {
          return false;
        }
      }

      return true;
    });
  };

  const getSignificanceLevel = (score: number): 'critical' | 'major' | 'minor' | 'trivial' => {
    if (score >= 4) return 'critical';
    if (score >= 3) return 'major';
    if (score >= 2) return 'minor';
    return 'trivial';
  };

  const getChangeIcon = (type: DocumentDiff['change_type']) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'deleted':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'moved':
        return <Move className="h-4 w-4 text-purple-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeColor = (type: DocumentDiff['change_type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'deleted':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'modified':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'moved':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSignificanceBadge = (score: number) => {
    const level = getSignificanceLevel(score);
    const config = {
      critical: { label: 'Kritis', variant: 'destructive' as const },
      major: { label: 'Besar', variant: 'default' as const },
      minor: { label: 'Kecil', variant: 'secondary' as const },
      trivial: { label: 'Trivial', variant: 'outline' as const }
    };
    
    const { label, variant } = config[level];
    return (
      <Badge variant={variant} className="text-xs">
        {label} ({score.toFixed(1)})
      </Badge>
    );
  };

  const renderDiffView = (change: DocumentDiff) => {
    const isExpanded = expandedItems.has(change.id);
    
    return (
      <div
        key={change.id}
        className={`border rounded-lg p-4 ${getChangeColor(change.change_type)} ${
          selectedChange === change.id ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => setSelectedChange(change.id)}
      >
        {/* Change Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getChangeIcon(change.change_type)}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm capitalize">
                  {change.change_type === 'added' ? 'Ditambahkan' :
                   change.change_type === 'deleted' ? 'Dihapus' :
                   change.change_type === 'modified' ? 'Diubah' :
                   change.change_type === 'moved' ? 'Dipindahkan' :
                   change.change_type}
                </span>
                {change.clause_ref && (
                  <Badge variant="outline" className="text-xs">
                    {change.clause_ref}
                  </Badge>
                )}
              </div>
              
              {change.explanation && (
                <p className="text-xs opacity-75 mt-1">
                  {change.explanation}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getSignificanceBadge(change.significance_score)}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(change.id);
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

        {/* Quick Preview */}
        {!isExpanded && (
          <div className="text-xs space-y-1 opacity-75">
            {change.old_text && (
              <div className="truncate">
                <span className="text-red-600">- </span>
                {change.old_text.substring(0, 100)}
                {change.old_text.length > 100 && '...'}
              </div>
            )}
            {change.new_text && (
              <div className="truncate">
                <span className="text-green-600">+ </span>
                {change.new_text.substring(0, 100)}
                {change.new_text.length > 100 && '...'}
              </div>
            )}
          </div>
        )}

        {/* Expanded Detail View */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Old Text */}
              {change.old_text && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Minus className="h-3 w-3 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Teks Lama</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap font-sans text-red-900">
                      {change.old_text}
                    </pre>
                  </div>
                </div>
              )}

              {/* New Text */}
              {change.new_text && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-3 w-3 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Teks Baru</span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap font-sans text-green-900">
                      {change.new_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Context */}
            {filters.showContext && (change.context.before || change.context.after) && (
              <div className="space-y-2 pt-2 border-t">
                <h5 className="text-xs font-medium text-gray-600">Konteks</h5>
                {change.context.before && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>Sebelum:</strong> {change.context.before}
                  </div>
                )}
                {change.context.after && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>Sesudah:</strong> {change.context.after}
                  </div>
                )}
              </div>
            )}

            {/* Legal Implications */}
            {change.legal_implications && change.legal_implications.length > 0 && (
              <div className="pt-2 border-t">
                <h5 className="text-xs font-medium text-gray-600 mb-2">Implikasi Hukum</h5>
                <ul className="space-y-1">
                  {change.legal_implications.map((implication, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="text-amber-600 mr-1">•</span>
                      {implication}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Similarity Score */}
            {change.similarity_score !== undefined && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Tingkat Kemiripan</span>
                  <span className="font-medium">
                    {(change.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={change.similarity_score * 100} 
                  className="h-1 mt-1" 
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredChanges = getFilteredChanges();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Summary */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Perbandingan Dokumen</h2>
              <p className="text-sm text-muted-foreground">
                {comparison.statistics.total_changes} perubahan terdeteksi
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {comparison.statistics.total_changes}
              </div>
              <p className="text-xs text-muted-foreground">Total Perubahan</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {comparison.statistics.additions}
              </div>
              <p className="text-xs text-muted-foreground">Penambahan</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                {comparison.statistics.deletions}
              </div>
              <p className="text-xs text-muted-foreground">Penghapusan</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {comparison.statistics.modifications}
              </div>
              <p className="text-xs text-muted-foreground">Modifikasi</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {comparison.statistics.moves}
              </div>
              <p className="text-xs text-muted-foreground">Perpindahan</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Filter className="h-4 w-4 mr-2" />
            Filter Perubahan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Perubahan</label>
              <Select
                value={filters.type}
                onValueChange={(value) => updateFilter('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="added">Penambahan</SelectItem>
                  <SelectItem value="deleted">Penghapusan</SelectItem>
                  <SelectItem value="modified">Modifikasi</SelectItem>
                  <SelectItem value="moved">Perpindahan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tingkat Kepentingan</label>
              <Select
                value={filters.significance}
                onValueChange={(value) => updateFilter('significance', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Level</SelectItem>
                  <SelectItem value="critical">Kritis (4+)</SelectItem>
                  <SelectItem value="major">Besar (3+)</SelectItem>
                  <SelectItem value="minor">Kecil (2+)</SelectItem>
                  <SelectItem value="trivial">Trivial (1+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tampilkan Konteks</label>
              <Button
                variant="outline"
                onClick={() => updateFilter('showContext', !filters.showContext)}
                className="w-full justify-start"
              >
                {filters.showContext ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Tampilkan Konteks
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Sembunyikan Konteks
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Significance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <BarChart3 className="h-4 w-4 mr-2" />
            Distribusi Kepentingan Perubahan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(comparison.statistics.significance_distribution).map(([level, count]) => {
              const total = comparison.statistics.total_changes;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium capitalize">
                      {level === 'critical' ? 'Kritis' :
                       level === 'major' ? 'Besar' :
                       level === 'minor' ? 'Kecil' :
                       level === 'trivial' ? 'Trivial' : level}
                    </span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Changes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Daftar Perubahan ({filteredChanges.length})
            </span>
            
            {filteredChanges.length !== comparison.changes.length && (
              <Badge variant="secondary" className="text-xs">
                {filteredChanges.length} dari {comparison.changes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredChanges.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Tidak ada perubahan yang sesuai dengan filter yang dipilih.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChanges
                .sort((a, b) => b.significance_score - a.significance_score)
                .map(renderDiffView)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Text */}
      {comparison.summary && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Ringkasan:</strong> {comparison.summary}
          </AlertDescription>
        </Alert>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Metode Perbandingan:</span>
              <div className="font-medium">
                {comparison.processing_info.comparison_method === 'clause' ? 'Berbasis Pasal' :
                 comparison.processing_info.comparison_method === 'semantic' ? 'Semantik' :
                 comparison.processing_info.comparison_method === 'hybrid' ? 'Hybrid' :
                 comparison.processing_info.comparison_method}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Waktu Pemrosesan:</span>
              <div className="font-medium">{comparison.processing_info.processing_time_seconds}s</div>
            </div>
            <div>
              <span className="text-muted-foreground">Dihasilkan:</span>
              <div className="font-medium">
                {new Date(comparison.processing_info.generated_at).toLocaleDateString('id-ID')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}