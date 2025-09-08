# Next.js 15 Upload Processing Patterns

## Critical Implementation Patterns

### Server Actions vs API Routes for File Uploads

**PATTERN**: Use Server Actions for file uploads instead of API Routes for better error handling and type safety.

```typescript
// ❌ AVOID: API Route approach
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  // Limited error handling, manual type checking
}

// ✅ PREFERRED: Server Action approach
'use server'
export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File
  // Better type inference, automatic error boundaries
  // Can throw errors that are caught by error.tsx
}
```

**GOTCHAS**:
- Server Actions automatically handle CSRF protection
- Error boundaries work better with Server Actions
- FormData handling is more type-safe with Server Actions

### File Upload Progress Tracking

**PATTERN**: Use Axios for upload progress, fetch doesn't support reliable progress tracking.

```typescript
// app/hooks/useUploadWithProgress.ts
import axios, { AxiosProgressEvent } from 'axios';

export function useUploadWithProgress() {
  const [progress, setProgress] = useState(0);
  
  const upload = useCallback(async (files: File[], serviceType: string) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });
    formData.append('service_type', serviceType);
    
    const response = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      },
    });
    
    return response.data;
  }, []);
  
  return { upload, progress };
}
```

**GOTCHAS**:
- Fetch API onProgress is not standardized across browsers
- Axios provides consistent upload progress across all browsers
- Progress events don't fire for small files (<1KB)

### Background Processing with Status Updates

**PATTERN**: Separate upload from processing for better user experience.

```typescript
// Upload returns immediately with job ID
const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
const { jobId } = await uploadResponse.json();

// Processing happens in background
await fetch('/api/process', {
  method: 'POST',
  body: JSON.stringify({ jobId })
});

// Real-time status via WebSocket or polling
const subscription = supabase
  .channel(`job-${jobId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'service_jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => {
    setJobStatus(payload.new);
  })
  .subscribe();
```

**GOTCHAS**:
- Don't process files synchronously in upload endpoint
- Always return job ID immediately for status tracking
- Use database triggers for status broadcasting

### Large File Handling (50MB+)

**PATTERN**: Stream processing for large documents to avoid memory issues.

```typescript
// app/lib/pdf-processor.ts
export class PDFProcessor {
  async processLargeDocument(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath);
    const isLarge = stats.size > 50 * 1024 * 1024; // 50MB
    
    if (isLarge) {
      // Process in chunks to avoid memory overflow
      return await this.processInChunks(filePath);
    } else {
      // Normal processing for smaller files
      return await this.processNormal(filePath);
    }
  }
  
  private async processInChunks(filePath: string): Promise<void> {
    const buffer = await fs.readFile(filePath);
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      const chunk = buffer.subarray(offset, offset + chunkSize);
      await this.processChunk(chunk, offset);
      
      // Update progress
      const progress = Math.round((offset / buffer.length) * 100);
      await this.updateProgress(progress);
    }
  }
}
```

**GOTCHAS**:
- Node.js has ~2GB memory limit by default
- PDF parsing libraries can consume 3-5x file size in memory
- Always stream or chunk processing for files >10MB

### Error Handling and Recovery

**PATTERN**: Comprehensive error handling with user-friendly messages.

```typescript
// app/api/upload/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validation with specific error messages
    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan. Silakan pilih file.' },
        { status: 400 }
      );
    }
    
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 50MB.' },
        { status: 400 }
      );
    }
    
    if (!['application/pdf'].includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan PDF.' },
        { status: 400 }
      );
    }
    
    // Process upload...
    
  } catch (error) {
    console.error('Upload error:', error);
    
    // Generic error for unexpected issues
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengunggah file. Coba lagi.' },
      { status: 500 }
    );
  }
}
```

**GOTCHAS**:
- Always provide Indonesian error messages for user-facing errors
- Log technical details but show user-friendly messages
- Distinguish between validation errors (400) and system errors (500)

### Multi-File Upload for Document Comparison

**PATTERN**: Handle different file requirements per service type.

```typescript
// app/components/upload/FileDropZone.tsx
const validateFiles = (files: File[], serviceType: ServiceType) => {
  switch (serviceType) {
    case 'ringkasan':
    case 'konflik':
      if (files.length !== 1) {
        throw new Error('Layanan ini membutuhkan 1 dokumen');
      }
      break;
      
    case 'perubahan':
      if (files.length !== 2) {
        throw new Error('Deteksi Perubahan membutuhkan 2 dokumen untuk dibandingkan');
      }
      break;
      
    default:
      throw new Error('Jenis layanan tidak dikenal');
  }
  
  // Validate each file
  files.forEach((file, index) => {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`File ${index + 1} terlalu besar (maks 50MB)`);
    }
    
    if (!file.type.includes('pdf')) {
      throw new Error(`File ${index + 1} harus berformat PDF`);
    }
  });
};
```

**GOTCHAS**:
- Different services have different file requirements
- Validate file count before size/type validation
- Provide specific error messages for each validation failure

## Processing Status Communication

### Real-time Updates with Fallback

**PATTERN**: WebSocket primary, polling fallback for reliability.

```typescript
// app/hooks/useProcessingStatus.ts
export function useProcessingStatus(jobId: string) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    let subscription: RealtimeChannel;
    let pollInterval: NodeJS.Timeout;
    
    // Primary: Real-time subscription
    subscription = supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        setStatus(payload.new as JobStatus);
        setIsConnected(true);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    // Fallback: Polling when disconnected
    pollInterval = setInterval(async () => {
      if (!isConnected) {
        const { data } = await supabase
          .from('service_jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (data) setStatus(data);
      }
    }, 2000);
    
    return () => {
      if (subscription) supabase.removeChannel(subscription);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, isConnected]);
  
  return { status, isConnected };
}
```

**GOTCHAS**:
- WebSocket connections can drop without warning
- Always implement polling fallback for critical status updates
- Avoid polling when WebSocket is working to reduce server load

### Progress Indication for Long Operations

**PATTERN**: Clear progress communication with time estimates.

```typescript
// app/components/upload/ProcessingStatus.tsx
const getStatusMessage = (status: ProcessingStatus, progress: number) => {
  switch (status) {
    case 'downloading':
      return `Mengunduh dokumen... ${progress}%`;
    case 'extracting':
      return `Mengekstrak teks dari PDF... ${progress}%`;
    case 'parsing':
      return `Menganalisis struktur dokumen... ${progress}%`;
    case 'analyzing':
      return `Memproses dengan AI... ${progress}%`;
    case 'completed':
      return 'Analisis selesai! Mengarahkan ke hasil...';
    case 'failed':
      return 'Terjadi kesalahan dalam pemrosesan';
    default:
      return 'Memulai pemrosesan...';
  }
};

const getEstimatedTime = (status: ProcessingStatus) => {
  switch (status) {
    case 'downloading': return '30 detik';
    case 'extracting': return '1-2 menit';
    case 'parsing': return '30 detik';
    case 'analyzing': return '2-3 menit';
    default: return 'Memperkirakan...';
  }
};
```

**GOTCHAS**:
- Provide specific status messages in Indonesian
- Give realistic time estimates to set user expectations
- Update estimates based on document size/complexity

## Memory Management

### Cleanup for Large File Processing

**PATTERN**: Explicit cleanup to prevent memory leaks.

```typescript
// app/lib/pdf-processor.ts
export class PDFProcessor {
  private tempFiles: string[] = [];
  
  async processDocument(file: File): Promise<ProcessingResult> {
    let tempPath: string | null = null;
    
    try {
      // Save temp file
      tempPath = await this.saveToTemp(file);
      this.tempFiles.push(tempPath);
      
      // Process document
      const result = await this.extractAndParse(tempPath);
      
      return result;
      
    } finally {
      // Always cleanup temp files
      if (tempPath) {
        await this.cleanup(tempPath);
      }
    }
  }
  
  private async cleanup(filePath: string) {
    try {
      await fs.unlink(filePath);
      this.tempFiles = this.tempFiles.filter(f => f !== filePath);
    } catch (error) {
      console.warn('Failed to cleanup temp file:', filePath, error);
    }
  }
  
  // Cleanup all temp files on process exit
  async cleanupAll() {
    await Promise.all(this.tempFiles.map(f => this.cleanup(f)));
  }
}

// Register cleanup on process termination
process.on('beforeExit', () => processor.cleanupAll());
process.on('SIGTERM', () => processor.cleanupAll());
```

**GOTCHAS**:
- Temp files can accumulate quickly with large uploads
- Always cleanup in finally blocks
- Register process cleanup handlers for graceful shutdown