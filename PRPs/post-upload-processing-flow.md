# PRP — Post-Upload Actions & Processing Flow (Open-LegisAI Lite)

---

## Goal

**Feature Goal**: Complete the end-to-end document processing workflow from file selection to results display, enabling users to upload documents, track processing progress in real-time, and navigate to analysis results.

**Deliverable**: Fully functional post-upload processing pipeline with upload progress tracking, real-time status updates, and automatic navigation to results view upon completion.

**Success Definition**: 
- File selection triggers actual upload to Supabase with progress tracking
- Processing status updates in real-time via Supabase subscriptions
- Users automatically navigate to results/analysis view when processing completes
- Upload → Processing → Results flow completes in under 3 minutes for typical documents

## User Persona

**Target Users**: 
1. **DPRD Secretariat Analysts** - Need rapid document processing for policy briefings
2. **Journalists & CSOs** - Require quick document analysis for transparency reporting
3. **Citizens** - Want simple document upload and clear processing feedback

**Use Case**: User selects service type, uploads legal documents, monitors processing progress, and views analysis results

**User Journey**: 
1. Select analysis service (Ringkasan, Perubahan, or Konflik)
2. Drag/drop or select files in upload area
3. Files immediately begin uploading with progress indicators
4. Processing status shows real-time progress through extraction, embeddings, analysis
5. Upon completion, user automatically navigates to results page
6. Can share public link or return to upload new documents

**Pain Points Addressed**: 
- False "uploaded successfully" message with no actual processing
- No feedback during long processing operations (user uncertainty)
- Missing navigation to results after completion
- No way to track multiple document processing

## Why

- **User Experience**: Eliminates confusion between file selection and actual upload/processing
- **Technical Completeness**: Connects existing upload API, processing API, and UI components
- **Business Value**: Enables full document analysis workflow essential for legal transparency
- **Integration Readiness**: Prepares foundation for real-time collaboration and batch processing

## What

Complete the missing connections in the upload-to-results pipeline by implementing:

1. **Actual Upload Integration**: Connect file selection UI to upload API with progress tracking
2. **Real-time Status Updates**: Use Supabase subscriptions for processing status changes
3. **Result Navigation**: Automatic redirect to analysis results upon completion
4. **Multi-service Support**: Handle different processing flows for Ringkasan, Perubahan, and Konflik services
5. **Error Handling**: Graceful error states with retry options and clear user feedback

### Success Criteria

- [ ] File selection immediately triggers actual upload API call with FormData
- [ ] Upload progress displayed using Axios onUploadProgress callback
- [ ] ProcessingStatus component receives real-time updates via Supabase subscriptions
- [ ] Processing completion automatically navigates to results view
- [ ] Error states display user-friendly messages with retry options
- [ ] Multiple files (for Perubahan service) handled correctly
- [ ] Upload and processing work for files up to 50MB

## All Needed Context

### Context Completeness Check

✅ **Validation**: This PRP provides complete implementation context including existing API patterns, UI component structures, integration points, and external library usage patterns. All necessary files and patterns are referenced with specific implementation guidance.

### Documentation & References

```yaml
# EXISTING CODEBASE PATTERNS TO FOLLOW
- file: app/api/upload/route.ts
  why: Complete upload API implementation already exists - shows FormData handling, Supabase storage, database records
  pattern: NextRequest/NextResponse, file validation, error handling, background processing trigger
  gotcha: Already triggers processing via fetch to /api/process - just need UI to call this

- file: app/api/process/route.ts  
  why: Background processing pipeline fully implemented - handles PDF extraction, embeddings, storage
  pattern: Async processing with status updates, proper error handling
  gotcha: Updates processing_status in database - perfect for Supabase subscriptions

- file: app/components/upload/ProcessingStatus.tsx
  why: Real-time progress tracking component already exists with polling
  pattern: useEffect polling, multi-stage progress, time estimation
  gotcha: Currently uses polling - can enhance with Supabase real-time subscriptions

- file: app/components/upload/FileDropZone.tsx
  why: File selection and validation logic already implemented
  pattern: Drag/drop, file validation, error states
  gotcha: Only does file selection - missing actual upload integration

- file: app/components/home/DynamicUploadArea.tsx
  why: Service-specific upload UI with file display
  pattern: Service configuration, file display, instructions
  gotcha: Shows "uploaded successfully" but files aren't actually uploaded

# EXTERNAL LIBRARY PATTERNS
- url: https://axios-http.com/docs/req_config#onuploadprogress
  why: Axios provides reliable upload progress tracking where fetch API fails
  critical: onUploadProgress callback provides loaded/total for progress calculation

- url: https://supabase.com/docs/guides/realtime/postgres-changes
  why: Real-time database subscriptions for processing status updates
  critical: Subscribe to document_versions table changes for processing_status field

- url: https://nextjs.org/docs/app/api-reference/functions/use-router
  why: Next.js App Router navigation patterns for results redirect
  critical: useRouter hook for programmatic navigation to results pages

# ARCHITECTURE INTEGRATION POINTS
- file: app/lib/supabase.ts
  why: Supabase client configuration - need to enhance for real-time subscriptions
  pattern: createClient() for server/client contexts
  gotcha: Need different client instances for real-time vs API calls

- file: app/types/documents.ts
  why: TypeScript types for document processing states and responses
  pattern: Document, DocumentVersion, processing status types
  gotcha: Already has processing_status field - perfect for tracking

- file: app/page.tsx
  why: Main page structure showing service selection and upload flow
  pattern: Service selection state management, component integration
  gotcha: Need to pass upload handlers down to components
```

### Current Codebase Tree

```bash
app/
├── components/
│   ├── ui/                        # shadcn/ui components (button, card, progress)
│   ├── upload/
│   │   ├── FileDropZone.tsx       # ✅ File selection UI (missing upload integration)
│   │   ├── FileCard.tsx           # ✅ File display component
│   │   └── ProcessingStatus.tsx   # ✅ Progress tracking (needs real-time enhancement)
│   ├── analysis/                  # ✅ Result display components ready
│   │   ├── DocumentSummary.tsx
│   │   ├── ConflictFlags.tsx
│   │   └── DiffPane.tsx
│   └── home/
│       ├── ServiceSelector.tsx    # ✅ Service type selection
│       ├── DynamicUploadArea.tsx  # ❌ Shows files but doesn't upload
│       └── DynamicWorkflow.tsx    # ✅ Static workflow display
├── api/
│   ├── upload/route.ts           # ✅ Complete upload API (not connected to UI)
│   ├── process/route.ts          # ✅ Background processing API
│   └── analyze/route.ts          # ✅ Analysis results API
├── lib/
│   ├── supabase.ts              # ✅ Database client (needs real-time enhancement)
│   ├── pdf-processor.ts         # ✅ PDF extraction logic
│   ├── embeddings.ts            # ✅ OpenAI integration
│   └── utils.ts                 # ✅ General utilities
├── types/
│   ├── documents.ts             # ✅ Document type definitions
│   ├── analysis.ts              # ✅ Analysis result types
│   └── database.ts              # ✅ Supabase types
└── page.tsx                     # ✅ Main page with service selection
```

### Desired Codebase Tree (Files to Add/Modify)

```bash
app/
├── components/
│   ├── upload/
│   │   ├── FileDropZone.tsx           # ✨ ENHANCE: Add upload integration with Axios
│   │   ├── UploadProgress.tsx         # 🆕 ADD: Individual file upload progress
│   │   └── ProcessingStatus.tsx       # ✨ ENHANCE: Add Supabase real-time subscriptions
│   └── home/
│       ├── DynamicUploadArea.tsx      # ✨ ENHANCE: Connect to actual upload workflow
│       └── UploadWorkflowManager.tsx  # 🆕 ADD: Manages upload → processing → results flow
├── hooks/
│   ├── useUploadWithProgress.ts       # 🆕 ADD: Custom hook for file uploads with Axios
│   ├── useProcessingStatus.ts         # 🆕 ADD: Real-time processing status via Supabase
│   └── useServiceSelection.ts         # ✅ EXISTS: Service selection state
├── lib/
│   └── supabase-realtime.ts           # 🆕 ADD: Real-time client configuration
├── [document]/
│   └── page.tsx                       # ✅ EXISTS: Results display page (enhance routing)
└── processing/
    └── [versionId]/
        └── page.tsx                   # 🆕 ADD: Dedicated processing status page
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Fetch API doesn't support upload progress - must use Axios
// Next.js fetch() limitations:
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData, // No progress tracking possible
});

// SOLUTION: Use Axios with onUploadProgress
const response = await axios.post('/api/upload', formData, {
  onUploadProgress: (event) => setProgress((event.loaded / event.total) * 100)
});

// CRITICAL: Supabase real-time subscriptions need specific client configuration
// Regular supabase client doesn't auto-connect to real-time
const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// CRITICAL: Next.js App Router navigation requires useRouter from next/navigation
// Don't import from 'next/router' (Pages Router)
import { useRouter } from 'next/navigation'; // ✅ Correct for App Router
import { useRouter } from 'next/router';     // ❌ Wrong for App Router

// CRITICAL: FormData file handling in TypeScript
const formData = new FormData();
// Must cast to File type or use proper type assertion
formData.append('file', file as File);
formData.append('service_type', selectedService);

// CRITICAL: Supabase RLS policies must allow status updates
// Document processing triggers database updates that need proper permissions
// Check supabase/config.toml and database policies

// CRITICAL: Processing status subscription pattern
// Subscribe to specific version_id changes, not entire table
supabase
  .channel('processing-status')
  .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'document_versions', filter: `id=eq.${versionId}` },
      (payload) => updateStatus(payload.new))
  .subscribe();
```

## Implementation Blueprint

### Data Models and Structure

The existing database schema and TypeScript types are already perfect for this implementation. Key types to use:

```typescript
// app/types/documents.ts - Already exists, use these types
interface DocumentVersion {
  id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  // ... other fields
}

// New types to add for upload workflow
interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'uploaded' | 'error';
  versionId?: string;
  error?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE app/hooks/useUploadWithProgress.ts
  - IMPLEMENT: Custom hook using Axios for file uploads with progress tracking
  - FOLLOW pattern: React hooks with useState, useCallback for state management
  - NAMING: useUploadWithProgress hook, uploadFile function, progress state
  - FEATURES: Multi-file support, error handling, progress callbacks
  - PLACEMENT: app/hooks/ following existing useServiceSelection pattern

Task 2: CREATE app/lib/supabase-realtime.ts  
  - IMPLEMENT: Enhanced Supabase client configured for real-time subscriptions
  - FOLLOW pattern: app/lib/supabase.ts structure and client creation
  - NAMING: createRealtimeClient function, subscription management utilities
  - FEATURES: Real-time channel management, subscription cleanup
  - PLACEMENT: app/lib/ alongside existing supabase.ts

Task 3: CREATE app/hooks/useProcessingStatus.ts
  - IMPLEMENT: Real-time processing status updates via Supabase subscriptions
  - FOLLOW pattern: useEffect for subscriptions, useState for status tracking
  - NAMING: useProcessingStatus hook, status state, subscription management
  - DEPENDENCIES: Import supabase-realtime client from Task 2
  - PLACEMENT: app/hooks/ directory with other custom hooks

Task 4: CREATE app/components/upload/UploadProgress.tsx
  - IMPLEMENT: Individual file upload progress display component
  - FOLLOW pattern: app/components/upload/ProcessingStatus.tsx UI patterns
  - NAMING: UploadProgress component, progress props interface
  - DEPENDENCIES: Use UploadProgress type from data models
  - PLACEMENT: app/components/upload/ with other upload components

Task 5: MODIFY app/components/upload/FileDropZone.tsx
  - INTEGRATE: useUploadWithProgress hook for actual file uploads
  - ENHANCE: Replace onFilesSelected with upload trigger functionality
  - FOLLOW pattern: Existing file validation and error handling
  - ADD: Upload progress display integration
  - PRESERVE: Existing drag/drop and validation logic

Task 6: CREATE app/components/home/UploadWorkflowManager.tsx
  - IMPLEMENT: Orchestrates upload → processing → results flow
  - FOLLOW pattern: app/components/home/DynamicUploadArea.tsx structure
  - NAMING: UploadWorkflowManager component, workflow state management
  - FEATURES: Service-specific logic, error recovery, navigation
  - DEPENDENCIES: Import hooks from Tasks 1 and 3

Task 7: MODIFY app/components/home/DynamicUploadArea.tsx
  - INTEGRATE: UploadWorkflowManager from Task 6
  - REPLACE: File selection state with actual upload workflow
  - FOLLOW pattern: Existing service configuration and UI structure
  - REMOVE: Mock "uploaded successfully" messages
  - PRESERVE: Service-specific instructions and validation

Task 8: ENHANCE app/components/upload/ProcessingStatus.tsx
  - INTEGRATE: useProcessingStatus hook for real-time updates
  - REPLACE: Polling approach with Supabase subscriptions
  - FOLLOW pattern: Existing progress UI and stage management
  - ADD: More granular processing steps based on API insights
  - PRESERVE: Time estimation and progress visualization

Task 9: CREATE app/processing/[versionId]/page.tsx
  - IMPLEMENT: Dedicated processing status page with navigation
  - FOLLOW pattern: app/[document]/page.tsx structure for dynamic routing
  - NAMING: ProcessingPage component, versionId parameter handling
  - FEATURES: Full-screen processing status, automatic results redirect
  - PLACEMENT: app/processing/[versionId]/ for Next.js dynamic routing

Task 10: MODIFY app/page.tsx
  - INTEGRATE: Enhanced workflow components
  - UPDATE: Component prop passing for upload handlers
  - FOLLOW pattern: Existing service selection and component structure
  - ADD: Upload workflow state management at page level
  - PRESERVE: Existing service selection and demo functionality
```

### Implementation Patterns & Key Details

```typescript
// Upload Hook Pattern (useUploadWithProgress.ts)
import axios, { AxiosProgressEvent } from 'axios';

export const useUploadWithProgress = () => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  
  const uploadFile = useCallback(async (
    file: File, 
    serviceType: string,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('service_type', serviceType);
    
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (event.total) {
            const progress = Math.round((event.loaded * 100) / event.total);
            onProgress?.(progress);
            // Update upload state...
          }
        },
      });
      
      return response.data; // Contains versionId for tracking
    } catch (error) {
      // Handle upload errors...
      throw error;
    }
  }, []);
  
  return { uploads, uploadFile };
};

// Real-time Status Hook Pattern (useProcessingStatus.ts)
import { createRealtimeClient } from '@/lib/supabase-realtime';

export const useProcessingStatus = (versionId: string) => {
  const [status, setStatus] = useState<ProcessingStatus>('pending');
  const supabase = createRealtimeClient();
  
  useEffect(() => {
    if (!versionId) return;
    
    const subscription = supabase
      .channel('processing-status')
      .on('postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'document_versions',
            filter: `id=eq.${versionId}`
          },
          (payload) => {
            setStatus(payload.new.processing_status);
            // Handle completion navigation...
            if (payload.new.processing_status === 'completed') {
              router.push(`/document/${payload.new.document_id}`);
            }
          })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [versionId]);
  
  return { status };
};

// Workflow Manager Pattern (UploadWorkflowManager.tsx)
const UploadWorkflowManager = ({ selectedService, serviceConfig }) => {
  const { uploadFile } = useUploadWithProgress();
  const [processingVersions, setProcessingVersions] = useState<string[]>([]);
  const router = useRouter();
  
  const handleFileUpload = async (files: File[]) => {
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await uploadFile(file, selectedService);
        setProcessingVersions(prev => [...prev, result.version.id]);
        
        // Navigate to processing page for single file services
        if (files.length === 1) {
          router.push(`/processing/${result.version.id}`);
        }
        
        return result;
      });
      
      await Promise.all(uploadPromises);
    } catch (error) {
      // Handle upload errors with user-friendly messages...
    }
  };
  
  return (
    <FileDropZone 
      onFilesSelected={handleFileUpload}
      // ... other props
    />
  );
};

// Real-time Client Configuration (supabase-realtime.ts)
import { createClient } from '@supabase/supabase-js';

export const createRealtimeClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
};
```

### Integration Points

```yaml
API_ENDPOINTS:
  - existing: /api/upload - Already handles file upload, storage, DB records
  - existing: /api/process - Handles background processing with status updates  
  - existing: /api/analyze - Provides analysis results
  - enhance: Add service_type parameter to upload for workflow routing

NAVIGATION:
  - add: /processing/[versionId] - Dedicated processing status page
  - existing: /[document] - Results display page (enhance with service-specific views)
  - existing: / - Main page with service selection and upload

DATABASE:
  - existing: documents, document_versions tables work perfectly
  - enhance: Use processing_status field for real-time subscriptions
  - existing: Supabase RLS policies already configured

REAL_TIME:
  - subscribe: document_versions table UPDATE events
  - filter: by version_id for specific document processing
  - trigger: navigation on processing completion

STATE_MANAGEMENT:
  - component: Service selection (existing useServiceSelection hook)
  - component: Upload progress (new useUploadWithProgress hook) 
  - component: Processing status (new useProcessingStatus hook)
  - page: Overall workflow coordination in main page components
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each component creation
npm run dev                              # Verify development server starts
npm run build                           # Test production build with new components
npm run lint                            # ESLint validation for TypeScript
npx tsc --noEmit                        # TypeScript checking without build output

# Component-specific validation during development
npx eslint app/hooks/useUploadWithProgress.ts --fix
npx eslint app/components/upload/UploadProgress.tsx --fix
npx eslint app/components/home/UploadWorkflowManager.tsx --fix

# Expected: Zero TypeScript errors, no ESLint violations, development server runs
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test upload functionality with mock files
npm run test -- app/hooks/useUploadWithProgress.test.ts
npm run test -- app/components/upload/UploadProgress.test.tsx

# Test real-time subscriptions with mock Supabase client
npm run test -- app/hooks/useProcessingStatus.test.ts

# Test workflow integration with service configurations
npm run test -- app/components/home/UploadWorkflowManager.test.tsx

# Integration test for complete upload flow
npm run test -- app/__tests__/upload-workflow.integration.test.ts

# Expected: All tests pass, proper mocking of external dependencies (Supabase, Axios)
```

### Level 3: Integration Testing (System Validation)

```bash
# Test actual file upload with progress tracking
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-document.pdf" \
  -F "service_type=ringkasan" \
  --progress-bar | cat

# Test processing status endpoint
VERSION_ID="test-version-id"
curl http://localhost:3000/api/process?version_id=$VERSION_ID | jq .

# Test real-time subscription functionality (manual verification)
# 1. Upload a file through UI
# 2. Verify processing status updates in real-time
# 3. Confirm navigation to results upon completion

# Test service-specific workflows
# Ringkasan: Single file upload → processing → summary results
# Perubahan: Two file upload → diff processing → comparison results  
# Konflik: Single file upload → conflict detection → conflict results

# Database integration validation
npx supabase status                     # Verify local Supabase running
npx supabase db reset                   # Reset with fresh schema
curl http://localhost:54321/rest/v1/document_versions \
  -H "apikey: $SUPABASE_ANON_KEY" | jq . # Verify API access

# Expected: Files upload successfully, processing status updates, navigation works
```

### Level 4: Creative & Domain-Specific Validation

```bash
# User Experience Testing
# Test upload with various file types and sizes
node scripts/test-upload-scenarios.js   # Different PDF formats, sizes, languages

# Performance Testing
# Upload progress accuracy with large files (50MB limit)
time curl -X POST http://localhost:3000/api/upload -F "file=@large-document.pdf"

# Real-time Performance
# Multiple simultaneous uploads and status tracking
node scripts/concurrent-upload-test.js  # Test 5 documents simultaneously

# Error Handling Validation
# Network interruption during upload
# Invalid file formats and oversized files
# Processing failures and retry mechanisms
node scripts/error-scenario-tests.js

# Accessibility Testing
npx axe-core app/components/upload/     # Upload components accessibility
npm run lighthouse -- --url=http://localhost:3000 # Overall UX audit

# Mobile Responsiveness
# File upload and progress tracking on mobile viewports
npm run test:mobile                     # If mobile testing configured

# Indonesian Language Processing
# Test with Indonesian legal documents specifically
node scripts/test-indonesian-processing.js

# Expected: All UX flows work smoothly, errors handled gracefully, accessibility compliance
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Development server runs without errors: `npm run dev`
- [ ] Production build successful: `npm run build`
- [ ] All TypeScript types correct: `npx tsc --noEmit`
- [ ] All tests pass: `npm run test`
- [ ] Real-time subscriptions working: manual verification
- [ ] Upload progress tracking accurate: test with large files

### Feature Validation

- [ ] File selection immediately triggers actual upload API call
- [ ] Upload progress displays correctly using Axios onUploadProgress
- [ ] Processing status updates in real-time via Supabase subscriptions
- [ ] Processing completion automatically navigates to results view
- [ ] Error states display user-friendly messages with retry options
- [ ] Multi-file uploads (Perubahan service) work correctly
- [ ] All three services (Ringkasan, Perubahan, Konflik) flow properly

### User Experience Validation

- [ ] Upload interface intuitive with immediate feedback
- [ ] Progress tracking provides meaningful status updates
- [ ] Processing stages clearly communicate what's happening
- [ ] Navigation between upload → processing → results is seamless
- [ ] Error recovery options are clear and functional
- [ ] Mobile upload and progress tracking work properly
- [ ] Indonesian language support maintained throughout

### Integration Validation

- [ ] Existing upload API unchanged and working
- [ ] Processing API continues background work correctly
- [ ] Supabase real-time subscriptions don't impact performance
- [ ] File validation and size limits properly enforced
- [ ] Database processing_status updates trigger UI changes
- [ ] Results navigation preserves service-specific analysis views
- [ ] Public sharing functionality unaffected

---

## Anti-Patterns to Avoid

- ❌ Don't use fetch() for upload progress - Axios required for reliable progress tracking
- ❌ Don't poll for processing status - use Supabase real-time subscriptions
- ❌ Don't navigate immediately after file selection - wait for actual upload completion
- ❌ Don't ignore upload errors - provide clear retry mechanisms
- ❌ Don't forget to cleanup Supabase subscriptions - memory leaks
- ❌ Don't hardcode service-specific logic - use existing service configuration patterns
- ❌ Don't break existing ProcessingStatus component - enhance, don't replace
- ❌ Don't assume upload success - handle network failures gracefully
- ❌ Don't skip loading states - users need feedback during async operations
- ❌ Don't ignore mobile experience - upload and progress must work on all devices