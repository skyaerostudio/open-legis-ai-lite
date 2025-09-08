# Legal Analysis UI Patterns

## Multi-Step Processing Display

### Progress Indication with Context

**PATTERN**: Clear communication during long-running legal analysis with educational content.

```typescript
// app/components/results/ProcessingProgress.tsx
interface ProcessingStep {
  key: string;
  title: string;
  description: string;
  estimatedTime: string;
  educationalContent?: string;
}

const getProcessingSteps = (serviceType: ServiceType): ProcessingStep[] => {
  const baseSteps: ProcessingStep[] = [
    {
      key: 'downloading',
      title: 'Mengunduh Dokumen',
      description: 'Menyiapkan dokumen untuk dianalisis',
      estimatedTime: '30 detik',
      educationalContent: 'Sistem sedang menyiapkan dokumen dalam format yang dapat diproses oleh AI.'
    },
    {
      key: 'extracting',
      title: 'Mengekstrak Teks',
      description: 'Mengambil teks dari dokumen PDF',
      estimatedTime: '1-2 menit',
      educationalContent: 'AI sedang membaca dan mengekstrak teks dari dokumen PDF. Untuk dokumen hasil scan, proses ini membutuhkan teknologi OCR.'
    },
    {
      key: 'parsing',
      title: 'Menganalisis Struktur',
      description: 'Memahami struktur dokumen hukum',
      estimatedTime: '30 detik',
      educationalContent: 'Sistem mengidentifikasi bagian-bagian dokumen seperti BAB, Pasal, dan Ayat sesuai struktur hukum Indonesia.'
    },
  ];

  switch (serviceType) {
    case 'ringkasan':
      return [
        ...baseSteps,
        {
          key: 'analyzing',
          title: 'Membuat Ringkasan',
          description: 'AI sedang membuat ringkasan dalam bahasa sederhana',
          estimatedTime: '2-3 menit',
          educationalContent: 'AI menganalisis setiap pasal dan membuat penjelasan dalam bahasa yang mudah dipahami masyarakat umum.'
        }
      ];
    
    case 'perubahan':
      return [
        ...baseSteps,
        {
          key: 'analyzing',
          title: 'Membandingkan Dokumen',
          description: 'Mencari perbedaan antar dokumen',
          estimatedTime: '3-4 menit',
          educationalContent: 'Sistem membandingkan kedua dokumen pasal per pasal untuk menemukan perubahan, penambahan, atau penghapusan.'
        }
      ];
    
    case 'konflik':
      return [
        ...baseSteps,
        {
          key: 'analyzing',
          title: 'Mendeteksi Konflik',
          description: 'Mencari konflik dengan peraturan lain',
          estimatedTime: '4-5 menit',
          educationalContent: 'AI membandingkan dokumen dengan database peraturan untuk menemukan potensi konflik atau tumpang tindih.'
        }
      ];
    
    default:
      return baseSteps;
  }
};

export function ProcessingProgress({ 
  currentStatus, 
  progress, 
  serviceType,
  estimatedTimeRemaining 
}: ProcessingProgressProps) {
  const steps = getProcessingSteps(serviceType);
  const currentStepIndex = steps.findIndex(step => step.key === currentStatus);
  
  return (
    <div className="space-y-6">
      {/* Main progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {steps[currentStepIndex]?.title || 'Memproses...'}
          </span>
          <span className="text-muted-foreground">
            {progress}% • {estimatedTimeRemaining || 'Memperkirakan...'}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">
          {steps[currentStepIndex]?.description}
        </p>
      </div>

      {/* Step indicators */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div
              key={step.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                isActive && "border-primary bg-primary/5",
                isCompleted && "border-green-200 bg-green-50",
                !isActive && !isCompleted && "border-muted bg-muted/50"
              )}
            >
              <div className="flex-shrink-0 mt-1">
                {isCompleted ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-green-700"
                  )}>
                    {step.title}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {step.estimatedTime}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
                
                {/* Educational content for active step */}
                {isActive && step.educationalContent && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    <Info className="h-4 w-4 inline mr-1" />
                    {step.educationalContent}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Help section */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium mb-2">Apa yang terjadi selama pemrosesan?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• AI membaca dan memahami struktur dokumen hukum Indonesia</li>
          <li>• Sistem menganalisis setiap pasal dan ayat secara detail</li>
          <li>• Hasil analisis dibuat dalam bahasa yang mudah dipahami</li>
          <li>• Proses ini memastikan akurasi dan kelengkapan analisis</li>
        </ul>
      </Card>
    </div>
  );
}
```

**GOTCHAS**:
- Long processing times need educational content to keep users engaged
- Progress estimates should be conservative to avoid disappointment
- Step-by-step display helps users understand complex AI processes
- Indonesian explanations crucial for public accessibility

### Real-time Status Updates with Fallback

**PATTERN**: Seamless real-time updates with graceful degradation.

```typescript
// app/components/results/RealtimeStatusWrapper.tsx
export function RealtimeStatusWrapper({ 
  jobId, 
  children 
}: { 
  jobId: string; 
  children: React.ReactNode; 
}) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'polling' | 'disconnected'>('connected');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Connection status indicator
  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Real-time aktif
          </div>
        );
      case 'polling':
        return (
          <div className="flex items-center gap-1 text-yellow-600 text-xs">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Mode polling
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center gap-1 text-red-600 text-xs">
            <X className="w-3 h-3" />
            Koneksi terputus
          </div>
        );
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        {getConnectionIndicator()}
        <span>Update terakhir: {format(lastUpdate, 'HH:mm:ss')}</span>
      </div>
      
      {children}
      
      {/* Connection issues warning */}
      {connectionStatus === 'disconnected' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Koneksi Bermasalah</AlertTitle>
          <AlertDescription>
            Status mungkin tidak update secara real-time. Refresh halaman jika diperlukan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

**GOTCHAS**:
- Always show connection status to users
- Provide manual refresh options when real-time fails
- Timestamp last update for user confidence
- Clear messaging about degraded functionality

## Document Comparison Display

### Side-by-Side Diff Visualization

**PATTERN**: Legal document comparison with clause-level highlighting.

```typescript
// app/components/results/DocumentComparison.tsx
interface DocumentDiffProps {
  comparison: DocumentComparison;
  leftDocument: Document;
  rightDocument: Document;
}

export function DocumentComparison({ 
  comparison, 
  leftDocument, 
  rightDocument 
}: DocumentDiffProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [filterType, setFilterType] = useState<'all' | 'added' | 'deleted' | 'modified'>('all');
  const [highlightedChange, setHighlightedChange] = useState<string | null>(null);
  
  const filteredChanges = comparison.changes.filter(change => 
    filterType === 'all' || change.change_type === filterType
  );
  
  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added': return 'bg-green-100 border-green-300 text-green-800';
      case 'deleted': return 'bg-red-100 border-red-300 text-red-800';
      case 'modified': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'moved': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };
  
  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added': return <Plus className="h-4 w-4 text-green-600" />;
      case 'deleted': return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified': return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'moved': return <Move className="h-4 w-4 text-blue-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Summary statistics */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Ringkasan Perubahan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Perubahan', value: comparison.statistics.total_changes, color: 'text-blue-600' },
            { label: 'Penambahan', value: comparison.statistics.additions, color: 'text-green-600' },
            { label: 'Penghapusan', value: comparison.statistics.deletions, color: 'text-red-600' },
            { label: 'Modifikasi', value: comparison.statistics.modifications, color: 'text-yellow-600' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* View controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('side-by-side')}
          >
            <SplitSquareHorizontal className="h-4 w-4 mr-1" />
            Berdampingan
          </Button>
          <Button
            variant={viewMode === 'unified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('unified')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Terpadu
          </Button>
        </div>
        
        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Perubahan</SelectItem>
            <SelectItem value="added">Penambahan</SelectItem>
            <SelectItem value="deleted">Penghapusan</SelectItem>
            <SelectItem value="modified">Modifikasi</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Document headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            Dokumen Asli
          </h4>
          <h3 className="font-semibold">{leftDocument.title}</h3>
        </Card>
        <Card className="p-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            Dokumen Baru
          </h4>
          <h3 className="font-semibold">{rightDocument.title}</h3>
        </Card>
      </div>
      
      {/* Changes list */}
      <div className="space-y-4">
        {filteredChanges.map((change) => (
          <Card
            key={change.id}
            className={cn(
              "transition-all cursor-pointer",
              highlightedChange === change.id && "ring-2 ring-primary"
            )}
            onClick={() => setHighlightedChange(
              highlightedChange === change.id ? null : change.id
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getChangeIcon(change.change_type)}
                  <span className="font-medium">
                    {change.clause_ref || `Perubahan ${change.sequence_order}`}
                  </span>
                  <Badge className={getChangeTypeColor(change.change_type)}>
                    {change.change_type === 'added' && 'Ditambahkan'}
                    {change.change_type === 'deleted' && 'Dihapus'}
                    {change.change_type === 'modified' && 'Dimodifikasi'}
                    {change.change_type === 'moved' && 'Dipindahkan'}
                  </Badge>
                </div>
                
                {change.significance_score && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Penting:</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            i < change.significance_score
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old text */}
                  {change.old_text && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-red-700">Teks Asli:</h5>
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <DiffHighlight 
                          text={change.old_text}
                          type="deletion"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* New text */}
                  {change.new_text && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-green-700">Teks Baru:</h5>
                      <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                        <DiffHighlight 
                          text={change.new_text}
                          type="addition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <DiffUnified 
                    oldText={change.old_text}
                    newText={change.new_text}
                  />
                </div>
              )}
              
              {/* Similarity score */}
              {change.similarity_score !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>
                    Kemiripan: {Math.round(change.similarity_score * 100)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredChanges.length === 0 && (
        <Card className="p-8 text-center">
          <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Tidak ada perubahan ditemukan
          </h3>
          <p className="text-muted-foreground">
            Coba ubah filter untuk melihat jenis perubahan yang berbeda.
          </p>
        </Card>
      )}
    </div>
  );
}
```

**GOTCHAS**:
- Side-by-side view needs responsive design for mobile
- Large documents need virtualization for performance
- Color coding must be accessible for colorblind users
- Indonesian labels crucial for legal professionals

### Text Highlighting for Differences

**PATTERN**: Precise highlighting of text changes with context.

```typescript
// app/components/analysis/DiffHighlight.tsx
interface DiffHighlightProps {
  text: string;
  type: 'addition' | 'deletion' | 'modification';
  highlights?: Array<{ start: number; end: number; type: string }>;
}

export function DiffHighlight({ text, type, highlights = [] }: DiffHighlightProps) {
  if (highlights.length === 0) {
    // Simple highlighting for entire text
    const className = cn(
      "rounded px-1 py-0.5",
      type === 'addition' && "bg-green-200 text-green-800",
      type === 'deletion' && "bg-red-200 text-red-800 line-through",
      type === 'modification' && "bg-yellow-200 text-yellow-800"
    );
    
    return <span className={className}>{text}</span>;
  }
  
  // Complex highlighting with multiple highlights
  let lastIndex = 0;
  const elements: React.ReactNode[] = [];
  
  // Sort highlights by start position
  const sortedHighlights = highlights.sort((a, b) => a.start - b.start);
  
  sortedHighlights.forEach((highlight, index) => {
    // Add text before highlight
    if (highlight.start > lastIndex) {
      elements.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, highlight.start)}
        </span>
      );
    }
    
    // Add highlighted text
    const highlightClassName = cn(
      "rounded px-1 py-0.5",
      highlight.type === 'addition' && "bg-green-200 text-green-800",
      highlight.type === 'deletion' && "bg-red-200 text-red-800 line-through",
      highlight.type === 'modification' && "bg-yellow-200 text-yellow-800"
    );
    
    elements.push(
      <span key={`highlight-${index}`} className={highlightClassName}>
        {text.substring(highlight.start, highlight.end)}
      </span>
    );
    
    lastIndex = highlight.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  return <>{elements}</>;
}

// Word-level diff utility
export function generateWordLevelDiff(oldText: string, newText: string): Array<{ start: number; end: number; type: string }> {
  const diff = Diff.diffWords(oldText, newText);
  const highlights: Array<{ start: number; end: number; type: string }> = [];
  let position = 0;
  
  diff.forEach((part) => {
    const length = part.value.length;
    
    if (part.added) {
      highlights.push({
        start: position,
        end: position + length,
        type: 'addition'
      });
    } else if (part.removed) {
      highlights.push({
        start: position,
        end: position + length,
        type: 'deletion'
      });
    }
    
    if (!part.removed) {
      position += length;
    }
  });
  
  return highlights;
}
```

**GOTCHAS**:
- Word-level diffs provide better granularity than line-level
- Overlapping highlights need careful handling
- Performance issues with very large documents
- Accessibility requires more than just color coding

## Conflict Detection Display

### Citation and Reference Cards

**PATTERN**: Clear presentation of legal conflicts with proper citations.

```typescript
// app/components/analysis/ConflictFlag.tsx
interface ConflictFlagProps {
  conflict: ConflictFlag;
  onExploreConflict?: (conflict: ConflictFlag) => void;
}

export function ConflictFlag({ conflict, onExploreConflict }: ConflictFlagProps) {
  const getConflictSeverity = (score: number) => {
    if (score >= 0.9) return { level: 'critical', color: 'red', label: 'Tinggi' };
    if (score >= 0.7) return { level: 'high', color: 'orange', label: 'Sedang' };
    if (score >= 0.5) return { level: 'medium', color: 'yellow', label: 'Rendah' };
    return { level: 'low', color: 'blue', label: 'Informasi' };
  };
  
  const severity = getConflictSeverity(conflict.overlap_score);
  
  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'contradiction': return <AlertTriangle className="h-5 w-5" />;
      case 'overlap': return <Shuffle className="h-5 w-5" />;
      case 'gap': return <Circle className="h-5 w-5" />;
      case 'inconsistency': return <HelpCircle className="h-5 w-5" />;
      default: return <Flag className="h-5 w-5" />;
    }
  };
  
  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'contradiction': return 'Kontradiksi';
      case 'overlap': return 'Tumpang Tindih';
      case 'gap': return 'Kesenjangan';
      case 'inconsistency': return 'Inkonsistensi';
      default: return 'Konflik';
    }
  };
  
  return (
    <Card className={cn(
      "transition-all hover:shadow-md border-l-4",
      severity.color === 'red' && "border-l-red-500 bg-red-50/50",
      severity.color === 'orange' && "border-l-orange-500 bg-orange-50/50",
      severity.color === 'yellow' && "border-l-yellow-500 bg-yellow-50/50",
      severity.color === 'blue' && "border-l-blue-500 bg-blue-50/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-full",
              severity.color === 'red' && "bg-red-100 text-red-600",
              severity.color === 'orange' && "bg-orange-100 text-orange-600",
              severity.color === 'yellow' && "bg-yellow-100 text-yellow-600",
              severity.color === 'blue' && "bg-blue-100 text-blue-600"
            )}>
              {getConflictTypeIcon(conflict.conflict_type)}
            </div>
            <div>
              <h4 className="font-semibold">
                {getConflictTypeLabel(conflict.conflict_type)}
              </h4>
              <p className="text-sm text-muted-foreground">
                dengan {conflict.conflicting_law_title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={severity.level as any}>
              {severity.label}
            </Badge>
            <div className="text-right text-xs text-muted-foreground">
              <div>Skor: {Math.round(conflict.overlap_score * 100)}%</div>
              <div>Akurasi: {Math.round(conflict.confidence_score * 100)}%</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Conflict explanation */}
        <div className="p-3 bg-white border rounded">
          <h5 className="font-medium mb-2">Penjelasan Konflik:</h5>
          <p className="text-sm text-gray-700">
            {conflict.explanation}
          </p>
        </div>
        
        {/* Text comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-sm mb-2 text-blue-700">
              Teks dari Dokumen Ini:
            </h5>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <DiffHighlight 
                text={conflict.excerpt_original}
                type="modification"
              />
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-sm mb-2 text-red-700">
              Teks dari {conflict.conflicting_law_title}:
            </h5>
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <DiffHighlight 
                text={conflict.excerpt_conflicting}
                type="modification"
              />
            </div>
            
            {conflict.conflicting_law_ref && (
              <p className="text-xs text-muted-foreground mt-1">
                Referensi: {conflict.conflicting_law_ref}
              </p>
            )}
          </div>
        </div>
        
        {/* Citation information */}
        {conflict.citation_data && (
          <LegalCitationCard citation={conflict.citation_data} />
        )}
        
        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExploreConflict?.(conflict)}
          >
            <Search className="h-4 w-4 mr-1" />
            Jelajahi Detail
          </Button>
          
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4 mr-1" />
            Lihat Peraturan Asli
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**GOTCHAS**:
- Color coding must meet WCAG accessibility standards
- Legal citations need accurate formatting
- Conflict explanations must be in plain Indonesian
- Performance issues with many conflicts displayed

### Legal Citation Cards

**PATTERN**: Standardized display of legal document references.

```typescript
// app/components/analysis/CitationCard.tsx
interface CitationCardProps {
  citation: LegalCitation;
  compact?: boolean;
}

export function CitationCard({ citation, compact = false }: CitationCardProps) {
  const formatCitation = (citation: LegalCitation): string => {
    const { type, number, year, title } = citation;
    
    switch (type) {
      case 'undang-undang':
        return `Undang-undang Nomor ${number} Tahun ${year} tentang ${title}`;
      case 'peraturan-pemerintah':
        return `Peraturan Pemerintah Nomor ${number} Tahun ${year} tentang ${title}`;
      case 'keputusan-presiden':
        return `Keputusan Presiden Nomor ${number} Tahun ${year} tentang ${title}`;
      case 'instruksi-presiden':
        return `Instruksi Presiden Nomor ${number} Tahun ${year} tentang ${title}`;
      default:
        return `${title} Nomor ${number} Tahun ${year}`;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'undang-undang': return 'bg-red-100 text-red-800';
      case 'peraturan-pemerintah': return 'bg-blue-100 text-blue-800';
      case 'keputusan-presiden': return 'bg-green-100 text-green-800';
      case 'instruksi-presiden': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge className={getTypeColor(citation.type)}>
          {citation.type.toUpperCase()}
        </Badge>
        <span className="text-muted-foreground">
          {formatCitation(citation)}
        </span>
      </div>
    );
  }
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <Badge className={getTypeColor(citation.type)}>
          {citation.type.replace('-', ' ').toUpperCase()}
        </Badge>
        <div className="text-xs text-muted-foreground">
          Diakses: {format(new Date(citation.access_date), 'dd MMM yyyy')}
        </div>
      </div>
      
      <h4 className="font-semibold mb-2">
        {formatCitation(citation)}
      </h4>
      
      {citation.article && (
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-medium">Pasal:</span> {citation.article}
          {citation.paragraph && (
            <span className="ml-2">
              <span className="font-medium">Ayat:</span> {citation.paragraph}
            </span>
          )}
        </p>
      )}
      
      {citation.url && (
        <Button size="sm" variant="outline" className="mt-2" asChild>
          <a href={citation.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            Buka Dokumen Asli
          </a>
        </Button>
      )}
    </Card>
  );
}
```

**GOTCHAS**:
- Indonesian legal citation formats are specific and must be accurate
- External links should open in new tabs with proper security
- Color coding helps distinguish between legal document types
- Compact mode needed for contexts with many citations

## Accessibility Patterns

### Keyboard Navigation

**PATTERN**: Full keyboard support for legal document navigation.

```typescript
// app/components/results/KeyboardNavigationProvider.tsx
export function KeyboardNavigationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          // Navigate to next section/conflict
          event.preventDefault();
          navigateToNext();
          break;
          
        case 'k':
        case 'ArrowUp':
          // Navigate to previous section/conflict
          event.preventDefault();
          navigateToPrevious();
          break;
          
        case 'Enter':
        case ' ':
          // Expand/collapse current section
          event.preventDefault();
          toggleCurrentSection();
          break;
          
        case 'Escape':
          // Close modals/overlays
          event.preventDefault();
          closeOverlays();
          break;
          
        case '?':
          // Show keyboard shortcuts help
          event.preventDefault();
          showKeyboardHelp();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <div className="keyboard-navigation-container">
      {children}
      <KeyboardShortcutsHelp />
    </div>
  );
}
```

**GOTCHAS**:
- Keyboard shortcuts must not conflict with screen readers
- Visual focus indicators required for accessibility compliance
- Indonesian help text for keyboard shortcuts
- Skip links needed for screen reader navigation

### Screen Reader Support

**PATTERN**: Proper ARIA labels and semantic markup for legal content.

```typescript
// app/components/results/AccessibleDocumentSummary.tsx
export function AccessibleDocumentSummary({ summary }: { summary: DocumentSummary }) {
  return (
    <div role="main" aria-labelledby="summary-title">
      <h1 id="summary-title" className="sr-only">
        Ringkasan Dokumen Hukum dalam Bahasa Sederhana
      </h1>
      
      {/* Summary content */}
      <section aria-labelledby="main-summary">
        <h2 id="main-summary" className="text-xl font-semibold mb-4">
          Ringkasan Utama
        </h2>
        <div 
          className="prose max-w-none"
          aria-describedby="summary-description"
        >
          <p id="summary-description" className="sr-only">
            Berikut adalah penjelasan dokumen hukum dalam bahasa yang mudah dipahami
          </p>
          {summary.summary}
        </div>
      </section>
      
      {/* Key points */}
      <section aria-labelledby="key-points">
        <h2 id="key-points" className="text-xl font-semibold mb-4">
          Poin-poin Penting
        </h2>
        <ul 
          className="space-y-2"
          aria-describedby="key-points-description"
        >
          <p id="key-points-description" className="sr-only">
            Daftar poin-poin terpenting dari dokumen
          </p>
          {summary.key_points.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span 
                className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"
                aria-hidden="true"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>
      
      {/* Legal glossary */}
      <section aria-labelledby="glossary">
        <h2 id="glossary" className="text-xl font-semibold mb-4">
          Glosarium Istilah Hukum
        </h2>
        <dl 
          className="space-y-4"
          aria-describedby="glossary-description"
        >
          <p id="glossary-description" className="sr-only">
            Penjelasan istilah-istilah hukum yang digunakan dalam dokumen
          </p>
          {summary.glossary.map((item, index) => (
            <div key={index} className="border-l-4 border-blue-200 pl-4">
              <dt className="font-semibold">{item.term}</dt>
              <dd className="text-muted-foreground mt-1">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
```

**GOTCHAS**:
- ARIA labels must be in Indonesian for Indonesian users
- Semantic HTML structure crucial for screen reader navigation
- Hidden descriptions provide context without visual clutter
- Color alone cannot convey information (accessibility requirement)