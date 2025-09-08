# Next.js 15 Integration Patterns for Open-LegisAI

## Purpose
This document provides specific implementation patterns for fixing critical integration issues found in end-to-end testing. Use as reference during PRP implementation.

## Critical Issues Identified

### 1. Button Navigation Disconnect
**Problem**: "Mulai Analisis Dokumen" button only scrolls, doesn't trigger processing
**Location**: `app/page.tsx:35-47`
**Current**: Pure scroll action without functionality

### 2. Processing System Fragmentation  
**Problem**: Two parallel systems (version-based vs job-based) causing navigation conflicts
**Locations**: 
- `app/hooks/useProcessingStatus.ts` (old: document IDs)
- `app/hooks/useJobProcessingStatus.ts` (new: job IDs)
- `app/processing/[versionId]/page.tsx` (deprecated route)

### 3. Multi-File Upload Validation Error
**Problem**: "perubahan" service expects single request with file1/file2, gets separate requests with "file"
**Location**: `app/hooks/useUploadWithProgress.ts:39-41` vs `app/api/upload/route.ts:58-68`

### 4. Results Data Fetching 
**Problem**: Component interface mismatches causing empty results display
**Status**: FIXED - Components now accept `AIAnalysisResult` parameter

## Next.js 15 App Router Patterns

### Navigation Implementation
```typescript
'use client'
import { useRouter } from 'next/navigation' // NOT 'next/router'

const router = useRouter()

// ✅ Correct navigation after async operations
const handleProcessingComplete = (jobId: string) => {
  router.push(`/results/${jobId}`)
}

// ✅ Navigation with loading states
const handleStartAnalysis = async () => {
  setLoading(true)
  try {
    const result = await triggerProcessing()
    router.push(`/processing/${result.jobId}`)
  } finally {
    setLoading(false)
  }
}
```

### Critical Import Differences
- App Router: `import { useRouter } from 'next/navigation'`
- Pages Router: `import { useRouter } from 'next/router'` ❌ DO NOT USE
- `redirect()` only works in Server Actions
- `router.push()` for client component navigation

## Processing Status Integration

### Hybrid Real-time + Polling Pattern
```typescript
const useProcessingStatus = (jobId: string) => {
  const router = useRouter()
  
  useEffect(() => {
    // Primary: WebSocket/Supabase Realtime
    const subscription = subscribeToJob(jobId, (status) => {
      if (status === 'completed') {
        setTimeout(() => {
          router.push(`/results/${jobId}`)
        }, 1000) // UX delay
      }
    })
    
    // Secondary: Polling fallback after 5s
    const pollTimer = setTimeout(startPolling, 5000)
    
    return () => {
      subscription.unsubscribe()
      clearTimeout(pollTimer)
    }
  }, [jobId])
}
```

## File Upload Patterns

### Single File Upload (ringkasan, konflik)
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('service_type', serviceType)

const response = await axios.post('/api/upload', formData, {
  onUploadProgress: (event) => {
    const progress = Math.round((event.loaded * 100) / event.total)
    onProgress(progress)
  }
})
```

### Multi-File Upload (perubahan)
```typescript
// ✅ CORRECT: Single request with multiple files
const formData = new FormData()
formData.append('file1', files[0])
formData.append('file2', files[1])
formData.append('service_type', 'perubahan')

// ❌ WRONG: Multiple separate requests
files.forEach(file => {
  const formData = new FormData()
  formData.append('file', file) // Backend expects 'file1', 'file2'
})
```

## Error Handling Patterns

### Upload Retry Logic
```typescript
const uploadWithRetry = async (file: File, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFile(file)
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      )
    }
  }
}
```

### Navigation Error Recovery
```typescript
const handleUploadError = (error: any) => {
  if (error.response?.status === 400) {
    // Show validation error UI
    setError('Please check your file format and try again')
  } else {
    // Show retry option
    setRetryAvailable(true)
  }
  
  // Don't navigate on error
}
```

## Implementation Priority Order

1. **Fix Navigation Imports** - Ensure all `useRouter` imports use `next/navigation`
2. **Unify Processing System** - Standardize on job-based navigation throughout
3. **Fix Multi-File Upload** - Implement proper FormData construction for "perubahan"
4. **Connect Button Handlers** - Link "Mulai Analisis Dokumen" to actual workflow
5. **Add Loading States** - Visual feedback during processing transitions

## Common Gotchas

1. **Import Path**: Always use `next/navigation` in App Router, not `next/router`
2. **Server vs Client**: `redirect()` only in Server Actions, `router.push()` in client
3. **FormData Fields**: Service-specific field naming (file1/file2 vs file)
4. **Processing IDs**: Job IDs for new system, not version/document IDs
5. **Navigation Timing**: Add UX delays before navigation for better experience

## Testing Validation

- Verify button clicks trigger expected navigation
- Confirm real-time status updates work with fallback polling
- Test multi-file uploads work for all services
- Validate error handling shows appropriate retry options
- Ensure results pages display actual processed content