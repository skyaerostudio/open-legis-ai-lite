````markdown
# Open-LegisAI Lite Production Alignment & Flow Fix PRP

---

## Goal

**Feature Goal**: Completely re-align the Open-LegisAI Lite website for production readiness by fixing all end-to-end feature issues, implementing "Deteksi Perubahan" and "Deteksi Konflik" flows, and ensuring database consistency for a stable production release.

**Deliverable**: Fully functional Next.js application with working upload-process-result flows for all three services (Ringkasan, Deteksi Perubahan, Deteksi Konflik), database realignment, comprehensive error handling, and production-ready architecture.

**Success Definition**: 
- All three services (Ringkasan, Deteksi Perubahan, Deteksi Konflik) complete end-to-end workflows successfully
- Document processing completes within 3-minute target with real-time status updates
- Database operations are consistent with proper error recovery
- UI provides clear feedback and smooth navigation between processing stages
- Production deployment ready with proper monitoring and error handling

## User Persona

**Target Users**: 
1. **Indonesian Citizens** - Need accessible analysis of legal documents in plain language
2. **Journalists & CSOs** - Require explainable analysis for public communication and transparency reporting
3. **DPRD Secretariat Staff** - Need rapid briefings and document comparison for legislative work
4. **Legal Researchers** - Want detailed conflict detection and citation verification

**Use Case**: Users select analysis type, upload appropriate documents (1-2 files depending on service), and receive comprehensive analysis with the ability to share results publicly for transparency.

**User Journey**:
1. Select desired service (Ringkasan/Deteksi Perubahan/Deteksi Konflik)
2. Upload appropriate documents via drag-and-drop interface
3. Monitor real-time processing status with clear progress indicators
4. View comprehensive results with navigation between analysis sections
5. Share public permalink for transparency and collaboration
6. Export or print results for offline use

**Pain Points Addressed**: 
- Broken processing pipelines causing stuck uploads
- Incomplete service implementations preventing full workflows
- Database inconsistencies causing processing failures
- Poor error recovery and user feedback during failures
- Lack of real-time status updates leaving users uncertain

## Why

- **Business Value**: Transforms prototype into production-ready platform, enabling public deployment and user adoption
- **Integration**: Establishes reliable foundation for Indonesian legal transparency ecosystem
- **Problems Solved**: Eliminates technical debt, fixes core processing flows, ensures data consistency, and provides production-grade reliability for public use

## What

Complete end-to-end workflow implementation for all three analysis services, database realignment and consistency fixes, comprehensive error handling and recovery, real-time processing status with fallback mechanisms, and production-ready deployment configuration.

### Success Criteria

- [ ] All services complete full upload → process → results → share workflow successfully
- [ ] "Deteksi Perubahan" handles two-document comparison with visual diff display
- [ ] "Deteksi Konflik" performs semantic search against legal corpus with proper citations
- [ ] Database schema consistent with no orphaned records or processing deadlocks
- [ ] Real-time status updates work with polling fallback for all processing stages
- [ ] Error states provide clear recovery paths and don't leave system in inconsistent state
- [ ] Processing completes within 3-minute target for 50-page documents
- [ ] Public sharing works with proper SEO and accessibility compliance
- [ ] Production deployment succeeds with monitoring and health checks

## All Needed Context

### Context Completeness Check

✅ **Validation**: This PRP provides complete implementation context based on thorough codebase analysis, existing PRP patterns, and comprehensive research of upload-process-result flows. It includes specific file paths, implementation patterns, database schema fixes, and production deployment considerations.

### Documentation & References

```yaml
# CRITICAL READING - Current Implementation Analysis
- file: app/page.tsx
  why: Current homepage with service selection and upload interface structure
  pattern: ServiceSelector integration points, upload workflow management
  gotcha: Upload button has placeholder functionality that needs complete implementation

- file: app/api/upload/route.ts
  why: Current upload API implementation with file validation and storage
  pattern: NextRequest/NextResponse patterns, Supabase Storage integration
  gotcha: Processing trigger mechanism may not be fully implemented

- file: app/api/process/route.ts
  why: Document processing pipeline with text extraction and analysis
  pattern: Background processing with database status updates
  gotcha: Processing may get stuck without proper error handling and recovery

- file: app/lib/pdf-processor.ts
  why: PDF text extraction and clause segmentation for Indonesian legal documents
  pattern: Indonesian legal document structure parsing (Pasal, Ayat, Huruf)
  gotcha: OCR fallback for scanned documents needs Indonesian language support

- file: supabase/migrations/20250902000001_initial_schema.sql
  why: Database schema foundation with document hierarchy and processing status
  pattern: Document → Version → Clauses → Embeddings data model
  gotcha: Processing status transitions need atomic updates to prevent deadlocks

# NEXT.JS 15 IMPLEMENTATION PATTERNS
- url: https://nextjs.org/docs/app/guides/forms
  why: Server Actions for file upload with proper validation and error handling
  critical: Use Server Actions vs API Routes for better error handling and type safety

- url: https://nextjs.org/docs/app/getting-started/server-and-client-components
  why: Server/Client component patterns for processing status and real-time updates
  critical: Processing must be server-side, status updates need client-side state

- docfile: PRPs/ai_docs/nextjs_upload_processing_patterns.md
  why: Complete upload-to-results workflow implementation with progress tracking
  section: Background processing with WebSocket fallback to polling

# INDONESIAN LEGAL DOCUMENT PROCESSING
- url: https://www.npmjs.com/package/pdf-parse
  why: PDF text extraction library with Indonesian language considerations
  critical: Fallback to OCR with Tesseract.js for scanned documents using 'ind' language

- url: https://www.npmjs.com/package/diff
  why: Document comparison library for "Deteksi Perubahan" implementation
  critical: Clause-aware diffing that understands legal document structure

- docfile: PRPs/ai_docs/indonesian_legal_processing.md
  why: Indonesian legal document patterns, citation formats, conflict detection
  section: Legal document structure parsing and semantic similarity thresholds

# SUPABASE INTEGRATION PATTERNS
- url: https://supabase.com/docs/guides/database/postgres/pgvector
  why: Vector similarity search for "Deteksi Konflik" semantic analysis
  critical: Proper indexing strategies for 1000+ document corpus performance

- url: https://supabase.com/docs/guides/realtime
  why: Real-time subscriptions for processing status updates
  critical: Handle connection failures gracefully with polling fallback

- docfile: PRPs/ai_docs/supabase_processing_pipeline.md
  why: Reliable background processing with Supabase Edge Functions integration
  section: Error recovery and retry mechanisms for failed processing

# UI/UX PATTERNS FOR LEGAL ANALYSIS
- url: https://ui.shadcn.com/docs/components/stepper
  why: Multi-step progress indication for processing stages
  critical: Clear status communication during long-running operations

- url: https://ui.shadcn.com/docs/components/tabs
  why: Navigation between analysis results (summary, diff, conflicts, citations)
  critical: Preserve user context when switching between result views

- docfile: PRPs/ai_docs/legal_analysis_ui_patterns.md
  why: Side-by-side document comparison, citation display, conflict visualization
  section: Accessibility requirements for legal professionals and citizens
```

### Current Codebase Tree

```bash
C:\Users\ryang\Documents\SkyAero Studio\Projects\open-legis-ai-lite\
├── .claude/                    # Claude Code configuration
├── initial/                    # Project planning documents
│   ├── Architecture.md         # Technical architecture specification
│   ├── Design-Principles.md    # UX/UI design guidelines
│   └── PRD.md                 # Product Requirements Document
├── PRPs/                      # Product Requirement Prompts
│   ├── templates/             # PRP templates
│   └── ai_docs/              # (TO CREATE) Implementation guides
├── app/                       # Next.js 15 App Router
│   ├── layout.tsx             # Root layout with fonts and metadata
│   ├── page.tsx               # Homepage with service selection
│   ├── globals.css            # Global styles and shadcn/ui integration
│   ├── api/                   # API Routes
│   │   ├── upload/route.ts    # File upload handler (needs fixes)
│   │   ├── process/route.ts   # Background processing (needs fixes)
│   │   ├── analyze/route.ts   # AI analysis endpoint
│   │   └── diff/route.ts      # Document comparison
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── demo/              # Demo modal components
│   │   ├── home/              # Homepage components (needs enhancement)
│   │   ├── upload/            # File upload components (needs fixes)
│   │   └── results/           # Results display (needs implementation)
│   ├── lib/                   # Utility libraries
│   │   ├── utils.ts           # shadcn/ui utilities
│   │   ├── supabase.ts        # Supabase client
│   │   ├── pdf-processor.ts   # PDF processing (needs fixes)
│   │   ├── embeddings.ts      # OpenAI embeddings (needs implementation)
│   │   ├── diff-engine.ts     # Document comparison (needs implementation)
│   │   └── rag-retriever.ts   # Conflict detection (needs implementation)
│   ├── hooks/                 # Custom React hooks (needs creation)
│   └── types/                 # TypeScript definitions (needs creation)
├── supabase/                  # Supabase configuration
│   ├── migrations/            # Database migrations (needs updates)
│   └── config.toml           # Supabase local config
├── components.json            # shadcn/ui configuration
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── next.config.js             # Next.js config
```

### Desired Codebase Tree with Fixes and Additions

```bash
open-legis-ai-lite/
├── PRPs/
│   └── ai_docs/               # NEW: Implementation documentation
│       ├── nextjs_upload_processing_patterns.md
│       ├── indonesian_legal_processing.md
│       ├── supabase_processing_pipeline.md
│       └── legal_analysis_ui_patterns.md
├── app/
│   ├── api/
│   │   ├── upload/route.ts    # FIXED: Complete file validation and processing trigger
│   │   ├── process/route.ts   # FIXED: Reliable background processing with error recovery
│   │   ├── analyze/route.ts   # ENHANCED: AI analysis with Indonesian legal patterns
│   │   ├── diff/route.ts      # IMPLEMENTED: Two-document comparison for Deteksi Perubahan
│   │   └── status/[id]/route.ts # NEW: Real-time status endpoint with fallback
│   ├── components/
│   │   ├── home/              # ENHANCED: Interactive service selection and dynamic UI
│   │   │   ├── ServiceSelector.tsx      # Interactive feature cards
│   │   │   ├── DynamicUploadArea.tsx    # Service-adaptive upload
│   │   │   ├── DynamicWorkflow.tsx      # Service-specific workflow steps
│   │   │   └── types.ts                 # Service configuration types
│   │   ├── upload/            # FIXED: Functional drag-and-drop with progress
│   │   │   ├── FileDropZone.tsx         # Drag-and-drop implementation
│   │   │   ├── FileUpload.tsx           # Enhanced upload with validation
│   │   │   ├── ProcessingStatus.tsx     # Real-time status with fallback
│   │   │   └── UploadWorkflowManager.tsx # Complete workflow coordination
│   │   ├── results/           # IMPLEMENTED: Comprehensive results display
│   │   │   ├── ProcessingProgress.tsx   # Multi-step progress indicator
│   │   │   ├── DocumentSummary.tsx      # AI summary with glossary
│   │   │   ├── DocumentComparison.tsx   # Side-by-side diff viewer
│   │   │   ├── ConflictDetection.tsx    # Conflict flags with citations
│   │   │   └── ResultsNavigation.tsx    # Tab navigation between results
│   │   └── analysis/          # NEW: Analysis-specific components
│   │       ├── CitationCard.tsx         # Legal citation display
│   │       ├── ConflictFlag.tsx         # Individual conflict indicator
│   │       ├── LegalGlossary.tsx        # Indonesian legal term explanations
│   │       └── DiffHighlight.tsx        # Text difference highlighting
│   ├── lib/                   # ENHANCED: Robust processing libraries
│   │   ├── pdf-processor.ts   # FIXED: Indonesian OCR fallback, clause segmentation
│   │   ├── embeddings.ts      # IMPLEMENTED: Batch embedding generation
│   │   ├── diff-engine.ts     # IMPLEMENTED: Legal-aware document comparison
│   │   ├── rag-retriever.ts   # IMPLEMENTED: Semantic conflict detection
│   │   ├── supabase-realtime.ts # NEW: Real-time subscription management
│   │   └── validation.ts      # NEW: File and input validation utilities
│   ├── hooks/                 # NEW: Custom hooks for state management
│   │   ├── useUploadWithProgress.ts     # Upload progress tracking
│   │   ├── useProcessingStatus.ts       # Processing status monitoring
│   │   ├── useMultipleProcessingStatus.ts # Multi-document status
│   │   └── useServiceSelection.ts       # Service selection state
│   ├── types/                 # NEW: Complete TypeScript definitions
│   │   ├── documents.ts       # Document and version types
│   │   ├── analysis.ts        # Analysis result types
│   │   ├── processing.ts      # Processing status and workflow types
│   │   └── database.ts        # Supabase database types
│   ├── results/[id]/          # NEW: Dynamic results pages
│   │   └── page.tsx          # Public results sharing with SEO
│   └── shared/[id]/          # NEW: Public sharing permalinks
│       └── page.tsx          # Clean public view for transparency
├── supabase/
│   ├── migrations/           # UPDATED: Schema fixes and optimizations
│   │   ├── 20250902000001_initial_schema.sql      # Base schema
│   │   ├── 20250903000001_update_similarity_search.sql # Vector search
│   │   └── 20250904000001_fix_processing_pipeline.sql  # NEW: Processing fixes
│   ├── functions/           # NEW: Edge Functions for processing
│   │   └── process-document/ # Background document processing
└── .env.local.example       # NEW: Environment variable template
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js 15 App Router with Server Actions
// - Use Server Actions for file uploads instead of API Routes for better error handling
// - Server Components vs Client Components: processing server-side, status client-side
// - File uploads must handle 50MB+ files with streaming for large documents

// Supabase Storage and Real-time quirks
// - Storage signed URLs expire in 1 hour - refresh for long processing
// - Real-time subscriptions can disconnect - implement polling fallback
// - RLS policies must allow service role for background processing
// - Batch operations should use transactions to prevent partial updates

// Indonesian PDF processing challenges
// - pdf-parse fails on scanned documents - fallback to Tesseract.js with 'ind' language
// - Legal document structure varies - regex patterns for Pasal/Ayat/Huruf detection
// - Text extraction encoding issues - normalize Indonesian characters properly
// - Large documents (50+ pages) need chunked processing to avoid memory issues

// OpenAI API constraints and costs
// - text-embedding-3-small: 1536 dimensions, 8191 token limit per request
// - Batch embeddings in groups of 100 to minimize API calls and costs
// - Rate limiting: 3,000 requests/minute - implement exponential backoff
// - GPT-4o-mini for summaries: 128k context window, good Indonesian support

// pgvector performance considerations
// - IVFFLAT index optimal for 1000+ vectors: CREATE INDEX USING ivfflat (vector)
// - Cosine similarity thresholds: >0.8 for high confidence conflicts
// - Vector dimensions must match embedding model exactly (1536 for text-embedding-3-small)
// - Large-scale similarity search needs pagination for performance
```

## Implementation Blueprint

### Data Models and Structure

Complete database schema realignment with processing pipeline fixes and performance optimizations.

```sql
-- Enhanced database schema with processing fixes
-- supabase/migrations/20250904000001_fix_processing_pipeline.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Core document management with enhanced metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source_url TEXT,
    kind TEXT CHECK (kind IN ('law', 'regulation', 'draft', 'uploaded')),
    jurisdiction TEXT CHECK (jurisdiction IN ('national', 'provincial', 'municipal')),
    language TEXT DEFAULT 'id',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document versions with enhanced processing status tracking
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    pages INTEGER,
    processing_status TEXT DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'downloading', 'extracting', 'parsing', 'analyzing', 'completed', 'failed')
    ),
    processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100),
    processing_error TEXT,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service jobs for tracking multi-document operations
CREATE TABLE service_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL CHECK (service_type IN ('ringkasan', 'perubahan', 'konflik')),
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    version_ids UUID[] NOT NULL, -- Array of document_version IDs
    result_data JSONB,
    error_message TEXT,
    is_public BOOLEAN DEFAULT false,
    shared_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clause-level text segments with enhanced indexing
CREATE TABLE clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    clause_ref TEXT, -- 'Pasal 1', 'Ayat 2', etc.
    clause_type TEXT CHECK (clause_type IN ('pasal', 'ayat', 'huruf', 'angka', 'bab', 'bagian', 'paragraf')),
    text TEXT NOT NULL,
    page_from INTEGER,
    page_to INTEGER,
    sequence_order INTEGER, -- Order within document
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector embeddings with optimized indexing
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clause_id UUID REFERENCES clauses(id) ON DELETE CASCADE,
    vector vector(1536), -- text-embedding-3-small dimensions
    model_name TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document comparison results for Deteksi Perubahan
CREATE TABLE document_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES service_jobs(id) ON DELETE CASCADE,
    version_from UUID REFERENCES document_versions(id),
    version_to UUID REFERENCES document_versions(id),
    clause_ref TEXT,
    change_type TEXT CHECK (change_type IN ('added', 'deleted', 'modified', 'moved')),
    old_text TEXT,
    new_text TEXT,
    similarity_score FLOAT,
    significance_score INTEGER DEFAULT 1 CHECK (significance_score BETWEEN 1 AND 5),
    sequence_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conflict detection results for Deteksi Konflik
CREATE TABLE document_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES service_jobs(id) ON DELETE CASCADE,
    version_id UUID REFERENCES document_versions(id),
    conflicting_law_title TEXT NOT NULL,
    conflicting_law_ref TEXT, -- Article/section reference
    overlap_score FLOAT NOT NULL CHECK (overlap_score >= 0.0 AND overlap_score <= 1.0),
    conflict_type TEXT CHECK (conflict_type IN ('contradiction', 'overlap', 'gap', 'inconsistency')),
    excerpt_original TEXT NOT NULL,
    excerpt_conflicting TEXT NOT NULL,
    explanation TEXT,
    citation_data JSONB,
    confidence_score FLOAT CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexes for performance
CREATE INDEX idx_document_versions_processing ON document_versions(processing_status, created_at);
CREATE INDEX idx_service_jobs_status ON service_jobs(status, service_type, created_at);
CREATE INDEX idx_clauses_version_order ON clauses(version_id, sequence_order);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_document_diffs_job ON document_diffs(job_id, sequence_order);
CREATE INDEX idx_document_conflicts_job ON document_conflicts(job_id, overlap_score DESC);

-- Full-text search indexes for Indonesian content
CREATE INDEX idx_clauses_text_search ON clauses USING gin(to_tsvector('indonesian', text));
CREATE INDEX idx_documents_title_search ON documents USING gin(to_tsvector('indonesian', title));

-- Utility functions for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_clauses(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    clause_id uuid,
    version_id uuid,
    text text,
    similarity float,
    clause_ref text,
    document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.version_id,
        c.text,
        1 - (e.vector <=> query_embedding) AS similarity,
        c.clause_ref,
        d.title
    FROM clauses c
    JOIN embeddings e ON e.clause_id = c.id
    JOIN document_versions dv ON dv.id = c.version_id  
    JOIN documents d ON d.id = dv.document_id
    WHERE 1 - (e.vector <=> query_embedding) > match_threshold
    ORDER BY e.vector <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Atomic processing status update function
CREATE OR REPLACE FUNCTION update_processing_status(
    p_version_id uuid,
    p_status text,
    p_progress integer DEFAULT NULL,
    p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE document_versions 
    SET 
        processing_status = p_status,
        processing_progress = COALESCE(p_progress, processing_progress),
        processing_error = p_error,
        processing_started_at = CASE 
            WHEN p_status NOT IN ('pending', 'failed') AND processing_started_at IS NULL 
            THEN NOW() 
            ELSE processing_started_at 
        END,
        processing_completed_at = CASE 
            WHEN p_status IN ('completed', 'failed') 
            THEN NOW() 
            ELSE processing_completed_at 
        END,
        updated_at = NOW()
    WHERE id = p_version_id;
END;
$$;
```

**TypeScript Models:**

```typescript
// app/types/documents.ts
export interface Document {
  id: string;
  title: string;
  source_url?: string;
  kind?: 'law' | 'regulation' | 'draft' | 'uploaded';
  jurisdiction?: 'national' | 'provincial' | 'municipal';
  language: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_label: string;
  storage_path: string;
  pages?: number;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_error?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus = 
  | 'pending' 
  | 'downloading' 
  | 'extracting' 
  | 'parsing' 
  | 'analyzing' 
  | 'completed' 
  | 'failed';

// app/types/processing.ts
export interface ServiceJob {
  id: string;
  service_type: 'ringkasan' | 'perubahan' | 'konflik';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  version_ids: string[];
  result_data?: any;
  error_message?: string;
  is_public: boolean;
  shared_at?: string;
  created_at: string;
  updated_at: string;
}

// app/types/analysis.ts
export interface DocumentSummary {
  summary: string;
  key_points: string[];
  glossary: Array<{
    term: string;
    definition: string;
  }>;
  citations: Array<{
    text: string;
    source: string;
    page?: number;
    clause_ref?: string;
  }>;
  metadata: {
    word_count: number;
    reading_time_minutes: number;
    complexity_score: number;
  };
}

export interface DocumentComparison {
  changes: DocumentDiff[];
  summary: string;
  statistics: {
    total_changes: number;
    additions: number;
    deletions: number;
    modifications: number;
  };
}

export interface DocumentDiff {
  id: string;
  clause_ref?: string;
  change_type: 'added' | 'deleted' | 'modified' | 'moved';
  old_text?: string;
  new_text?: string;
  similarity_score?: number;
  significance_score: number;
  sequence_order: number;
}

export interface ConflictDetection {
  conflicts: ConflictFlag[];
  summary: string;
  risk_assessment: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ConflictFlag {
  id: string;
  conflicting_law_title: string;
  conflicting_law_ref?: string;
  overlap_score: number;
  conflict_type: 'contradiction' | 'overlap' | 'gap' | 'inconsistency';
  excerpt_original: string;
  excerpt_conflicting: string;
  explanation: string;
  citation_data: LegalCitation;
  confidence_score: number;
}

export interface LegalCitation {
  title: string;
  type: string;
  number: string;
  year: string;
  article?: string;
  paragraph?: string;
  url?: string;
  access_date: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE PRPs/ai_docs/ documentation files
  - IMPLEMENT: Implementation guides for complex processing patterns
  - CREATE: nextjs_upload_processing_patterns.md, indonesian_legal_processing.md
  - CREATE: supabase_processing_pipeline.md, legal_analysis_ui_patterns.md
  - CONTENT: Detailed implementation patterns, gotchas, code examples
  - PLACEMENT: PRPs/ai_docs/ for easy reference during development

Task 2: UPDATE supabase/migrations/20250904000001_fix_processing_pipeline.sql
  - IMPLEMENT: Complete database schema with processing fixes and optimizations
  - ADD: service_jobs table for multi-document workflow tracking
  - ADD: Enhanced processing status with atomic updates and error handling
  - ADD: Vector similarity search functions and optimized indexes
  - PATTERN: Follow existing migration structure with proper rollback support
  - PLACEMENT: supabase/migrations/ with sequential numbering

Task 3: ENHANCE app/types/ TypeScript definitions
  - CREATE: Complete type definitions for all data models and processing states
  - FILES: documents.ts, processing.ts, analysis.ts, database.ts
  - PATTERN: Strict TypeScript with proper union types and validation
  - EXPORTS: Comprehensive types for all components and API routes
  - PLACEMENT: app/types/ directory for centralized type management

Task 4: FIX app/lib/pdf-processor.ts
  - IMPLEMENT: Robust PDF processing with Indonesian language support
  - ADD: OCR fallback with Tesseract.js for scanned documents
  - ADD: Legal document structure detection (Pasal, Ayat, Huruf patterns)
  - ADD: Text normalization for Indonesian characters and formatting
  - PATTERN: Error handling with fallback chains for different PDF types
  - DEPENDENCIES: pdf-parse, tesseract.js, Indonesian language models
  - PLACEMENT: Enhanced existing file with backward compatibility

Task 5: IMPLEMENT app/lib/embeddings.ts
  - IMPLEMENT: Batch embedding generation with OpenAI API integration
  - ADD: Rate limiting and exponential backoff for API calls
  - ADD: Embedding caching to avoid reprocessing identical content
  - ADD: Error recovery for failed embedding requests
  - PATTERN: Async batch processing with progress tracking
  - DEPENDENCIES: openai package with proper error handling
  - PLACEMENT: New library file following existing lib/ patterns

Task 6: IMPLEMENT app/lib/diff-engine.ts
  - IMPLEMENT: Legal-aware document comparison for Deteksi Perubahan
  - ADD: Clause-level comparison with semantic similarity scoring
  - ADD: Indonesian legal structure awareness for accurate diffing
  - ADD: Significance scoring for change importance ranking
  - PATTERN: Streaming comparison for large documents with progress updates
  - DEPENDENCIES: diff library with custom legal document patterns
  - PLACEMENT: New library file with comprehensive comparison algorithms

Task 7: IMPLEMENT app/lib/rag-retriever.ts
  - IMPLEMENT: RAG-based conflict detection for Deteksi Konflik
  - ADD: Vector similarity search with pgvector integration
  - ADD: Legal corpus querying with proper citation extraction
  - ADD: Conflict explanation generation with AI assistance
  - PATTERN: Semantic search with configurable similarity thresholds
  - DEPENDENCIES: Supabase client with vector search functions
  - PLACEMENT: New library file for semantic analysis and retrieval

Task 8: FIX app/api/upload/route.ts
  - ENHANCE: Complete file upload with validation and processing trigger
  - ADD: Multi-file support for Deteksi Perubahan (2 documents)
  - ADD: Service-specific validation based on selected analysis type
  - ADD: Atomic database operations with proper error rollback
  - PATTERN: Next.js 15 App Router with proper error handling
  - FOLLOW: Server Action patterns for better type safety
  - PLACEMENT: Enhanced existing API route with backward compatibility

Task 9: FIX app/api/process/route.ts
  - ENHANCE: Reliable background processing with comprehensive error recovery
  - ADD: Service-specific processing workflows (ringkasan/perubahan/konflik)
  - ADD: Real-time status updates with atomic database transactions
  - ADD: Processing timeout handling and cleanup for stuck jobs
  - PATTERN: Background job processing with status broadcasting
  - INTEGRATION: All processing libraries from previous tasks
  - PLACEMENT: Enhanced existing API route with robust error handling

Task 10: CREATE app/components/results/ comprehensive results display
  - IMPLEMENT: Complete results UI with navigation and export features
  - CREATE: ProcessingProgress.tsx, DocumentSummary.tsx, DocumentComparison.tsx
  - CREATE: ConflictDetection.tsx, ResultsNavigation.tsx with tab switching
  - PATTERN: shadcn/ui components with proper loading and error states
  - ACCESSIBILITY: Full keyboard navigation and screen reader support
  - PLACEMENT: New results directory with comprehensive analysis display

Task 11: CREATE app/hooks/ custom hooks for state management
  - IMPLEMENT: Upload progress, processing status, service selection hooks
  - CREATE: useUploadWithProgress.ts, useProcessingStatus.ts, useServiceSelection.ts
  - ADD: Real-time subscriptions with polling fallback mechanisms
  - PATTERN: React hooks with proper cleanup and error handling
  - INTEGRATION: Supabase real-time with WebSocket fallback to polling
  - PLACEMENT: New hooks directory following React best practices

Task 12: CREATE app/results/[id]/ and app/shared/[id]/ dynamic pages
  - IMPLEMENT: Public sharing pages with SEO optimization and accessibility
  - ADD: Server-side rendering for proper social media preview cards
  - ADD: Print-friendly layouts for offline distribution
  - PATTERN: Next.js dynamic routes with proper error boundaries
  - SEO: Open Graph tags, Twitter cards, structured data for legal documents
  - PLACEMENT: New dynamic route directories with public access
```

### Implementation Patterns & Key Details

```typescript
// Enhanced PDF Processing with Indonesian Support
// app/lib/pdf-processor.ts
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { supabase } from './supabase';

export class IndonesianLegalDocumentProcessor {
  private ocrWorker?: Tesseract.Worker;

  async processDocument(versionId: string, filePath: string): Promise<ProcessingResult> {
    try {
      // Update status: extracting
      await this.updateStatus(versionId, 'extracting', 10);
      
      // Extract text with fallback chain
      const text = await this.extractTextWithFallback(filePath);
      
      // Update status: parsing
      await this.updateStatus(versionId, 'parsing', 40);
      
      // Parse legal structure
      const clauses = await this.parseIndonesianLegalStructure(text);
      
      // Save clauses to database
      await this.saveClauses(versionId, clauses);
      
      // Update status: analyzing
      await this.updateStatus(versionId, 'analyzing', 70);
      
      // Generate embeddings for semantic search
      await this.generateEmbeddings(clauses);
      
      // Complete processing
      await this.updateStatus(versionId, 'completed', 100);
      
      return { success: true, clauses, textLength: text.length };
      
    } catch (error) {
      await this.updateStatus(versionId, 'failed', 0, error.message);
      throw error;
    }
  }

  private async extractTextWithFallback(filePath: string): Promise<string> {
    try {
      // Primary: pdf-parse for text-based PDFs
      const buffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(buffer);
      
      if (pdfData.text.trim().length > 100) {
        return this.normalizeIndonesianText(pdfData.text);
      }
    } catch (error) {
      console.log('pdf-parse failed, trying OCR:', error.message);
    }

    // Fallback: OCR for scanned documents
    return await this.extractWithOCR(filePath);
  }

  private async extractWithOCR(filePath: string): Promise<string> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('ind'); // Indonesian language
    }

    try {
      const { data: { text } } = await this.ocrWorker.recognize(filePath);
      return this.normalizeIndonesianText(text);
    } catch (error) {
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  private normalizeIndonesianText(text: string): string {
    return text
      // Fix common PDF extraction encoding issues
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€\u009d/g, '"')
      // Normalize Indonesian-specific characters
      .replace(/\u00E0/g, 'à')  // à
      .replace(/\u00E1/g, 'á')  // á
      .replace(/\u00E9/g, 'é')  // é
      // Clean whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private async parseIndonesianLegalStructure(text: string): Promise<LegalClause[]> {
    const patterns = {
      bab: /BAB\s+([IVX]+|[A-Z]+)\s*\n([^\n]+)/gi,
      bagian: /BAGIAN\s+([A-Z]+|[IVX]+)\s*\n([^\n]+)/gi,
      pasal: /Pasal\s+(\d+[a-z]*)\s*\n([\s\S]*?)(?=Pasal\s+\d+|BAB\s+|BAGIAN\s+|$)/gi,
      ayat: /\((\d+)\)\s*([^()]*?)(?=\(\d+\)|$)/gi,
      huruf: /([a-z])\.\s*([^a-z.]*?)(?=[a-z]\.|$)/gi,
    };

    const clauses: LegalClause[] = [];
    let sequenceOrder = 0;

    // Extract chapters (BAB)
    const babMatches = Array.from(text.matchAll(patterns.bab));
    for (const match of babMatches) {
      clauses.push({
        clause_ref: `BAB ${match[1]}`,
        clause_type: 'bab',
        text: `${match[0]}`,
        sequence_order: sequenceOrder++,
      });
    }

    // Extract articles (Pasal) with nested structure
    const pasalMatches = Array.from(text.matchAll(patterns.pasal));
    for (const pasalMatch of pasalMatches) {
      const pasalNumber = pasalMatch[1];
      const pasalContent = pasalMatch[2].trim();
      
      clauses.push({
        clause_ref: `Pasal ${pasalNumber}`,
        clause_type: 'pasal',
        text: pasalContent,
        sequence_order: sequenceOrder++,
      });

      // Extract paragraphs (Ayat) within this article
      const ayatMatches = Array.from(pasalContent.matchAll(patterns.ayat));
      for (const ayatMatch of ayatMatches) {
        const ayatNumber = ayatMatch[1];
        const ayatContent = ayatMatch[2].trim();
        
        clauses.push({
          clause_ref: `Pasal ${pasalNumber} Ayat (${ayatNumber})`,
          clause_type: 'ayat',
          text: ayatContent,
          sequence_order: sequenceOrder++,
        });

        // Extract points (Huruf) within this paragraph
        const hurufMatches = Array.from(ayatContent.matchAll(patterns.huruf));
        for (const hurufMatch of hurufMatches) {
          const hurufLetter = hurufMatch[1];
          const hurufContent = hurufMatch[2].trim();
          
          clauses.push({
            clause_ref: `Pasal ${pasalNumber} Ayat (${ayatNumber}) Huruf ${hurufLetter}`,
            clause_type: 'huruf',
            text: hurufContent,
            sequence_order: sequenceOrder++,
          });
        }
      }
    }

    return clauses.filter(clause => clause.text.length > 10);
  }

  private async updateStatus(versionId: string, status: ProcessingStatus, progress: number, error?: string) {
    await supabase.rpc('update_processing_status', {
      p_version_id: versionId,
      p_status: status,
      p_progress: progress,
      p_error: error
    });
  }
}

// Service-Specific Processing Workflow
// app/api/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IndonesianLegalDocumentProcessor } from '@/lib/pdf-processor';
import { EmbeddingGenerator } from '@/lib/embeddings';
import { DocumentComparator } from '@/lib/diff-engine';
import { ConflictDetector } from '@/lib/rag-retriever';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('service_jobs')
      .select(`
        *,
        document_versions:version_ids (
          id, storage_path, document_id,
          document:documents (id, title)
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update job status to processing
    await supabase
      .from('service_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // Service-specific processing
    switch (job.service_type) {
      case 'ringkasan':
        await processRingkasan(job);
        break;
      case 'perubahan':
        await processPerubahan(job);
        break;
      case 'konflik':
        await processKonflik(job);
        break;
      default:
        throw new Error(`Unknown service type: ${job.service_type}`);
    }

    return NextResponse.json({ success: true, jobId });
    
  } catch (error) {
    console.error('Processing error:', error);
    
    // Update job status to failed
    if (jobId) {
      await supabase
        .from('service_jobs')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          updated_at: new Date().toISOString() 
        })
        .eq('id', jobId);
    }
    
    return NextResponse.json(
      { error: 'Processing failed', details: error.message }, 
      { status: 500 }
    );
  }
}

async function processRingkasan(job: ServiceJob) {
  const processor = new IndonesianLegalDocumentProcessor();
  const versionId = job.version_ids[0];
  
  // Process document
  const result = await processor.processDocument(versionId, getStoragePath(versionId));
  
  // Generate AI summary
  const summary = await generateIndonesianSummary(result.clauses);
  
  // Update job with results
  await supabase
    .from('service_jobs')
    .update({
      status: 'completed',
      progress: 100,
      result_data: { summary, clauses: result.clauses },
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);
}

async function processPerubahan(job: ServiceJob) {
  const processor = new IndonesianLegalDocumentProcessor();
  const comparator = new DocumentComparator();
  
  // Process both documents
  const [version1Id, version2Id] = job.version_ids;
  
  const [result1, result2] = await Promise.all([
    processor.processDocument(version1Id, getStoragePath(version1Id)),
    processor.processDocument(version2Id, getStoragePath(version2Id))
  ]);
  
  // Generate comparison
  const comparison = await comparator.compareDocuments(
    result1.clauses, 
    result2.clauses
  );
  
  // Save diffs to database
  await saveDiffsToDatabase(job.id, comparison.diffs);
  
  // Update job with results
  await supabase
    .from('service_jobs')
    .update({
      status: 'completed',
      progress: 100,
      result_data: { comparison, documents: [result1, result2] },
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);
}

async function processKonflik(job: ServiceJob) {
  const processor = new IndonesianLegalDocumentProcessor();
  const detector = new ConflictDetector();
  
  const versionId = job.version_ids[0];
  
  // Process document
  const result = await processor.processDocument(versionId, getStoragePath(versionId));
  
  // Detect conflicts with existing laws
  const conflicts = await detector.detectConflicts(result.clauses);
  
  // Save conflicts to database
  await saveConflictsToDatabase(job.id, versionId, conflicts);
  
  // Update job with results
  await supabase
    .from('service_jobs')
    .update({
      status: 'completed',
      progress: 100,
      result_data: { conflicts, clauses: result.clauses },
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);
}

// Real-time Status Hook with Fallback
// app/hooks/useProcessingStatus.ts
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { ServiceJob } from '@/types/processing';

export function useProcessingStatus(jobId: string) {
  const [job, setJob] = useState<ServiceJob | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!jobId) return;

    let pollInterval: NodeJS.Timeout;
    let realtimeSubscription: any;

    // Initialize with current status
    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('service_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (data) {
        setJob(data);
        
        // Navigate to results when completed
        if (data.status === 'completed') {
          router.push(`/results/${jobId}`);
        }
      }
    };

    fetchInitialStatus();

    // Set up real-time subscription
    const setupRealtime = () => {
      realtimeSubscription = supabase
        .channel(`job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_jobs',
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            const updatedJob = payload.new as ServiceJob;
            setJob(updatedJob);
            
            // Navigate when completed
            if (updatedJob.status === 'completed') {
              router.push(`/results/${jobId}`);
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });
    };

    // Set up polling fallback
    const setupPolling = () => {
      pollInterval = setInterval(async () => {
        if (isConnected) return; // Skip if real-time is working
        
        const { data } = await supabase
          .from('service_jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (data) {
          setJob(data);
          
          if (data.status === 'completed') {
            router.push(`/results/${jobId}`);
          }
        }
      }, 2000);
    };

    setupRealtime();
    setupPolling();

    return () => {
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId, isConnected, router]);

  return { job, isConnected };
}
```

### Integration Points

```yaml
DATABASE_REALIGNMENT:
  - migration: "supabase/migrations/20250904000001_fix_processing_pipeline.sql"
  - functions: "Atomic processing status updates with proper error handling"
  - indexes: "Optimized for vector similarity search and processing status queries"

PROCESSING_PIPELINE:
  - pattern: "Service-specific workflows with comprehensive error recovery"
  - status: "Real-time updates via Supabase with polling fallback"
  - recovery: "Automatic retry for transient failures, manual recovery for stuck jobs"

REAL_TIME_UPDATES:
  - primary: "Supabase real-time subscriptions for instant status updates"
  - fallback: "HTTP polling every 2 seconds when WebSocket disconnected"
  - navigation: "Automatic redirect to results page when processing completes"

SERVICE_INTEGRATION:
  - ringkasan: "Single document → AI summary with Indonesian legal glossary"
  - perubahan: "Two document comparison → visual diff with clause-level changes"
  - konflik: "Single document → semantic search against legal corpus with citations"

PUBLIC_SHARING:
  - routes: "app/results/[id] for authenticated users, app/shared/[id] for public"
  - seo: "Open Graph tags and structured data for social media sharing"
  - access: "Public links with expiration and proper accessibility compliance"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript and linting validation after each file creation
npx tsc --noEmit                           # Check TypeScript compilation
npx eslint app/ --ext .ts,.tsx --fix       # Fix linting issues automatically
npx prettier app/ --write --check          # Format code consistently

# Database migration validation
npx supabase db reset                      # Reset local database
npx supabase db push                       # Apply migrations
npx supabase gen types typescript --local > app/types/database.ts  # Generate types

# Development server validation
npm run dev                                # Ensure server starts without errors
curl http://localhost:3000/api/health      # Verify API endpoints respond

# Expected: Zero TypeScript errors, no linting violations, dev server starts successfully
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test individual processing components
npm run test -- app/lib/pdf-processor.test.ts        # PDF extraction and parsing
npm run test -- app/lib/diff-engine.test.ts          # Document comparison logic
npm run test -- app/lib/rag-retriever.test.ts        # Conflict detection algorithms

# Test API routes
npm run test -- app/api/upload/route.test.ts         # File upload validation
npm run test -- app/api/process/route.test.ts        # Processing pipeline

# Test React components and hooks
npm run test -- app/hooks/useProcessingStatus.test.ts  # Status monitoring
npm run test -- app/components/results/               # Results display components

# Coverage validation
npm run test:coverage                      # Generate comprehensive coverage report

# Expected: All tests pass, >80% coverage for critical processing paths
```

### Level 3: Integration Testing (System Validation)

```bash
# End-to-end workflow testing for all services
# Ringkasan service test
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-legal-document.pdf" \
  -F "service_type=ringkasan" | jq .

# Monitor processing status
JOB_ID="[returned from upload]"
curl http://localhost:3000/api/status/${JOB_ID} | jq .

# Verify completion and results
curl http://localhost:3000/api/results/${JOB_ID} | jq .

# Perubahan service test (two documents)
curl -X POST http://localhost:3000/api/upload \
  -F "file1=@document-v1.pdf" \
  -F "file2=@document-v2.pdf" \
  -F "service_type=perubahan" | jq .

# Konflik service test
curl -X POST http://localhost:3000/api/upload \
  -F "file=@new-regulation.pdf" \
  -F "service_type=konflik" | jq .

# Database consistency validation
psql $DATABASE_URL -c "SELECT COUNT(*) FROM service_jobs WHERE status='completed';"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM document_versions WHERE processing_status='completed';"

# Real-time subscription testing
# Test WebSocket connections and fallback polling mechanisms

# Expected: All workflows complete successfully, database remains consistent
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Indonesian legal document processing validation
node scripts/test-indonesian-processing.js   # Test with actual Indonesian legal docs
node scripts/validate-legal-citations.js     # Verify citation format compliance
node scripts/test-conflict-detection.js      # Validate semantic similarity thresholds

# Accessibility and user experience testing
npx axe-core app/                            # Automated accessibility scanning
npm run lighthouse -- --url=http://localhost:3000  # Performance audit
npx playwright test tests/e2e/              # End-to-end user journey testing

# Load and performance testing
ab -n 100 -c 10 http://localhost:3000/api/upload  # Upload endpoint load test
wrk -t12 -c400 -d30s http://localhost:3000/       # General load testing

# Security scanning
npm audit                                     # Dependency vulnerability check
npx eslint-plugin-security app/              # Security-focused code analysis

# Production deployment validation
npm run build                                # Production build validation
npm run start                               # Production server test
docker build -t open-legis-ai .             # Container build test (if using Docker)

# Expected: WCAG 2.1 AA compliance, performance targets met, security scan passes
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Database migrations apply without errors: `npx supabase db push`
- [ ] All TypeScript types correct: `npx tsc --noEmit`
- [ ] Production build successful: `npm run build`
- [ ] All tests pass with >80% coverage: `npm run test:coverage`
- [ ] No security vulnerabilities: `npm audit`

### Feature Validation

- [ ] **Ringkasan service**: Single document upload → AI summary with Indonesian glossary
- [ ] **Deteksi Perubahan service**: Two document upload → visual diff with clause-level changes
- [ ] **Deteksi Konflik service**: Single document upload → semantic conflict detection with citations
- [ ] Real-time processing status updates work with polling fallback
- [ ] Public sharing generates clean, accessible permalinks with proper SEO
- [ ] Error recovery handles all failure cases gracefully without data corruption
- [ ] Processing completes within 3-minute target for 50-page documents

### Code Quality Validation

- [ ] Follows Next.js 15 App Router patterns with proper Server/Client component usage
- [ ] Database schema is consistent with atomic operations and proper indexing
- [ ] Indonesian legal document processing handles various formats and structures
- [ ] Vector similarity search performs efficiently with proper pgvector optimization
- [ ] All UI components are accessible with keyboard navigation and screen reader support
- [ ] Error states provide clear user guidance and recovery paths

### User Experience Validation

- [ ] Service selection interface is intuitive and guides users to appropriate workflows
- [ ] Upload process provides clear feedback for file validation and progress
- [ ] Processing status communication is clear with estimated completion times
- [ ] Results display is comprehensive with easy navigation between analysis sections
- [ ] Public sharing works seamlessly for transparency and collaboration
- [ ] Print layouts are clean and professional for offline distribution
- [ ] Mobile experience is fully functional and responsive

### Production Readiness Validation

- [ ] Environment variables properly configured for production deployment
- [ ] Database performance optimized for expected user load
- [ ] API rate limiting implemented for external service calls (OpenAI)
- [ ] Monitoring and logging provide adequate visibility into system health
- [ ] Error tracking captures and reports issues for debugging
- [ ] Backup and recovery procedures documented and tested

---

## Anti-Patterns to Avoid

- ❌ Don't process files synchronously - use background jobs for all document processing
- ❌ Don't ignore Indonesian language specifics - legal terminology and structure matter
- ❌ Don't skip vector similarity indexing - performance will degrade with corpus growth  
- ❌ Don't leave processing status updates without atomic transactions
- ❌ Don't hardcode legal citation formats - make them configurable and extensible
- ❌ Don't skip accessibility testing - government transparency tools must be inclusive
- ❌ Don't ignore rate limits for OpenAI API - implement proper throttling and backoff
- ❌ Don't store large files in database - use Supabase Storage with metadata approach
- ❌ Don't skip the public sharing disclaimer - "AI-generated analysis; verify with official sources"
- ❌ Don't deploy without comprehensive error monitoring - legal analysis failures need immediate attention

````