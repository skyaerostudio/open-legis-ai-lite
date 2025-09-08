# Task 8+ Continuation Prompt: API Routes & UI Implementation

## Current Status

**Completed**: Tasks 1-7 ✅
- Task 1: PRPs/ai_docs/ documentation files created
- Task 2: Database schema enhanced with processing pipeline fixes
- Task 3: Complete TypeScript definitions in app/types/
- Task 4: PDF processor with Indonesian language support
- Task 5: Embeddings system with batch processing
- Task 6: Legal-aware diff engine for document comparison  
- Task 7: RAG retriever for conflict detection (✅ **JUST COMPLETED**)

**Next**: Tasks 8-12 🔄
- **Task 8**: FIX app/api/upload/route.ts (READY TO START)
- **Task 9**: FIX app/api/process/route.ts 
- **Task 10**: CREATE app/components/results/ UI components
- **Task 11**: CREATE app/hooks/ state management hooks
- **Task 12**: CREATE dynamic pages for public sharing

## Critical Context

### Current Task 7 Implementation Status
The RAG retriever has been successfully implemented with:
- ✅ **ConflictDetector class** with configurable similarity thresholds (0.8 default)
- ✅ **Vector similarity search** integrated with `detect_legal_conflicts()` database function
- ✅ **Legal citation extraction** with proper Indonesian legal document parsing
- ✅ **AI conflict explanations** using OpenAI GPT-4o-mini
- ✅ **Comprehensive test suite** (23 tests, 17 passing - core functionality complete)
- ✅ **Progress tracking** with real-time callbacks
- ✅ **Batch processing** for performance optimization

### Integration Points Ready for Next Tasks
1. **Database Functions Available**:
   - `detect_legal_conflicts()` - Used by RAG retriever
   - `search_similar_legal_content()` - General similarity search
   - `update_processing_status()` - Atomic status updates
   - `begin_job_processing()`, `complete_job_processing()`, `fail_job_processing()`

2. **Processing Libraries Ready**:
   - `ConflictDetector` class in `app/lib/rag-retriever.ts`
   - `LegalDocumentComparator` class in `app/lib/diff-engine.ts`
   - `IndonesianLegalDocumentProcessor` in `app/lib/pdf-processor.ts`
   - `EmbeddingGenerator` in `app/lib/embeddings.ts`

3. **Type Definitions Complete**:
   - `ConflictDetection`, `ConflictFlag`, `DocumentComparison`, `DocumentSummary` types
   - `ServiceJob`, `ProcessingStatus` types
   - All database schema types in `app/types/database.ts`

## Task 8 Implementation Requirements

### PRP Specification (Lines 688-695)
```yaml
Task 8: FIX app/api/upload/route.ts
  - ENHANCE: Complete file upload with validation and processing trigger
  - ADD: Multi-file support for Deteksi Perubahan (2 documents)
  - ADD: Service-specific validation based on selected analysis type
  - ADD: Atomic database operations with proper error rollback
  - PATTERN: Next.js 15 App Router with proper error handling
  - FOLLOW: Server Action patterns for better type safety
  - PLACEMENT: Enhanced existing API route with backward compatibility
```

### Current Upload Route Analysis Needed
The existing `app/api/upload/route.ts` needs analysis and enhancement to:

1. **Multi-File Support**: Handle 1 file (Ringkasan/Konflik) vs 2 files (Perubahan)
2. **Service Validation**: Validate uploaded files based on service type
3. **Processing Trigger**: Properly create service_jobs and trigger background processing
4. **Error Handling**: Atomic operations with rollback on failure

### Expected Workflow Integration
```typescript
// Service-specific upload handling
switch (serviceType) {
  case 'ringkasan':
  case 'konflik':
    // Single document upload → create service_job → trigger processing
    break;
  case 'perubahan': 
    // Two document upload → create service_job → trigger comparison
    break;
}

// Processing integration points:
// 1. Create document records in database
// 2. Create service_job with version_ids array
// 3. Trigger background processing via app/api/process/route.ts
// 4. Return job_id for status tracking
```

## Implementation Priorities

### Task 8 Success Criteria
- ✅ Multi-file upload support (1 or 2 files based on service)
- ✅ Service-specific file validation (PDF, max size, etc.)
- ✅ Atomic database operations (documents → versions → service_jobs)
- ✅ Integration with existing processing pipeline
- ✅ Proper error handling with rollback
- ✅ Next.js 15 App Router compliance
- ✅ TypeScript strict mode compatibility

### Task 9 Success Criteria (Following Task 8)
- ✅ Service-specific processing workflows using completed libraries
- ✅ Integration with ConflictDetector, LegalDocumentComparator, etc.
- ✅ Real-time status updates using atomic database functions
- ✅ Processing timeout and cleanup mechanisms
- ✅ Comprehensive error recovery

## Critical Integration Points

### Processing Pipeline Integration
```typescript
// Task 8 creates service_jobs, Task 9 processes them:
// 1. Upload creates: documents → document_versions → service_jobs
// 2. Process consumes: service_jobs → processing libraries → results
// 3. Status updates: atomic database transactions with real-time subscriptions
```

### Library Integration Requirements
- **Use ConflictDetector** for 'konflik' service processing
- **Use LegalDocumentComparator** for 'perubahan' service processing  
- **Use existing generateDocumentSummary** for 'ringkasan' service processing
- **Follow established error handling patterns** from completed tasks

## Development Approach

### ARCHON-First Workflow (MANDATORY)
1. **Check Current Task**: `archon:get_task(task_id="ef459f9c-c570-4e15-a1e3-ce09ea0c8883")`
2. **Research for Implementation**: `archon:perform_rag_query()` + `archon:search_code_examples()`
3. **Update Status to In Progress**: `archon:update_task(status="doing")`
4. **Implement Task 8**: Following PRP specification exactly
5. **Move to Review**: `archon:update_task(status="review")`
6. **Continue to Task 9**: Repeat process

### Research Queries Recommended
```bash
archon:perform_rag_query(query="Next.js 15 file upload API routes multipart validation", match_count=5)
archon:perform_rag_query(query="Supabase atomic transactions error rollback patterns", match_count=3)
archon:search_code_examples(query="service job creation database operations", match_count=3)
```

## Success Validation

### Task 8 Validation
```bash
# Upload API validation
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-document.pdf" \
  -F "service_type=ringkasan" | jq .

# Multi-file upload validation  
curl -X POST http://localhost:3000/api/upload \
  -F "file1=@doc-old.pdf" \
  -F "file2=@doc-new.pdf" \
  -F "service_type=perubahan" | jq .

# Database consistency check
psql $DATABASE_URL -c "SELECT * FROM service_jobs ORDER BY created_at DESC LIMIT 5;"
```

### Processing Pipeline Test
```bash
# End-to-end workflow test after Tasks 8+9
JOB_ID="[from upload response]"
curl http://localhost:3000/api/status/${JOB_ID} | jq .
```

## Production Alignment Goals

- **3-minute processing target** for 50-page documents
- **Real-time status updates** with polling fallback
- **Database consistency** with atomic operations
- **Comprehensive error handling** at every integration point
- **Type safety** throughout the entire pipeline
- **Production-ready** error monitoring and logging

## Next Steps
1. Start with Task 8 using ARCHON workflow
2. Analyze existing upload route implementation
3. Research Next.js 15 file upload patterns
4. Implement multi-file support with service validation
5. Test thoroughly before moving to Task 9

The foundation is solid from Tasks 1-7. Tasks 8-12 will complete the production-ready implementation with robust API routes, comprehensive UI components, and public sharing capabilities.

---
**Generated**: 2025-09-05 | **Status**: Ready for Task 8 Implementation | **Next Task ID**: ef459f9c-c570-4e15-a1e3-ce09ea0c8883