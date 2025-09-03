# Open-LegisAI Lite MVP - Complete Implementation PRP

---

## Goal

**Feature Goal**: Build a complete AI-powered legal document analysis platform that enables Indonesian citizens, journalists, CSOs, and DPRD secretariats to quickly understand regulatory changes and identify potential conflicts with existing laws.

**Deliverable**: Full-stack Next.js application with document ingestion, AI-powered analysis, clause-level diffing, conflict detection via RAG, and public sharing capabilities - deployable and ready for pilot testing.

**Success Definition**: 
- Document upload → first summary generated < 3 minutes
- Clause-level diffs render within 5s for 50-page PDFs
- 95% section coverage with proper citations
- Conflict detection precision ≥ 0.6 
- Full accessibility compliance (keyboard navigation, contrast, screen readers)

## User Persona

**Target Users**: 
1. **DPRD Secretariat Analysts** - Need rapid briefings before hearings
2. **Journalists/CSOs** - Require explainable analysis for public communication
3. **Citizens** - Want readable summaries of regulatory changes

**Use Case**: Upload 1-2 versions of Indonesian legal documents (PDF/HTML) → receive plain-language Bahasa summary, visual diff showing changes, and conflict flags with existing law citations.

**User Journey**:
1. Upload document(s) via drag-and-drop interface
2. System processes, extracts, and segments text by clauses
3. View generated summary with glossary terms
4. Explore side-by-side diff with "jump to changes" navigation
5. Review conflict flags with source excerpts and citations
6. Share public permalink for transparency

**Pain Points Addressed**: 
- Manual reading of complex legal language (time-consuming)
- Missing subtle but important changes between versions
- Inability to cross-reference with existing law corpus
- Lack of accessible formats for public consumption

## Why

- **Business Value**: Accelerates legal analysis workflow by 10x, increases government transparency, enables informed public participation in legislation
- **Integration**: Builds on Indonesia's growing digital government initiative and JDIH (Legal Documentation Network) infrastructure
- **Problems Solved**: Information asymmetry between government and citizens, inefficient manual legal analysis, lack of change visibility in regulatory updates

## What

**Core MVP Features**:

1. **Document Ingest**: PDF/HTML upload with version tagging and metadata extraction
2. **Plain-Language Summary**: AI-generated Bahasa Indonesia summaries (600-900 words) with legal term glossary
3. **Clause-Level Diff**: Visual comparison between document versions with change highlighting and navigation
4. **Conflict Detection**: RAG-based semantic search against existing law corpus with citation-backed excerpts
5. **Public Sharing**: Clean, printable permalink pages for public access and transparency

### Success Criteria

- [ ] Documents process completely within 3-minute target (async background processing)
- [ ] Summaries maintain 95% citation coverage with inline source references
- [ ] Diff rendering handles 50-page documents without performance degradation
- [ ] Conflict detection achieves ≥60% precision in pilot testing
- [ ] Full WCAG 2.1 AA accessibility compliance
- [ ] Clean print layout for offline distribution
- [ ] Indonesian language processing with proper legal terminology

## All Needed Context

### Context Completeness Check

✅ **Validation**: This PRP provides complete implementation context for developers unfamiliar with the codebase, including specific tech stack patterns, architectural decisions, file structures, and validation approaches.

### Documentation & References

```yaml
# CRITICAL READING - Architecture & Design Foundation
- file: initial/Architecture.md
  why: Complete system architecture, data models, component definitions
  pattern: Mermaid flow diagrams, database schema, performance targets
  gotcha: 3-minute processing target requires async job architecture

- file: initial/Design-Principles.md  
  why: UX tenets, visual system, accessibility requirements
  pattern: Typography scales, component naming, interaction patterns
  gotcha: Avoid "legal red/green" - use underline + margin marks for diffs

- file: initial/PRD.md
  why: Business requirements, user stories, quality acceptance criteria
  pattern: Metrics definitions, rollout strategy, constraint documentation
  gotcha: Must include advisory banner "AI-generated summary; verify with official sources"

# TECHNICAL IMPLEMENTATION PATTERNS
- url: https://nextjs.org/docs/app/api-reference/file-conventions/route#supported-http-methods
  why: Next.js App Router API patterns for file upload and processing
  critical: Use NextRequest/NextResponse, support POST for uploads, proper error handling

- url: https://nextjs.org/docs/app/getting-started/server-and-client-components
  why: Server/Client component patterns for file processing vs UI interactions
  critical: File processing must be server-side, progress tracking needs client-side state

- docfile: PRPs/ai_docs/nextjs_file_upload_patterns.md
  why: Complete upload implementation with progress tracking and error handling
  section: Server Actions vs API Routes comparison

- docfile: PRPs/ai_docs/supabase_pgvector_implementation.md
  why: Vector embeddings setup, RLS policies, optimal indexing strategies
  section: Performance optimization for 1000+ document corpus

- docfile: PRPs/ai_docs/pdf_processing_indonesian.md
  why: PDF extraction libraries, Indonesian OCR setup, clause segmentation patterns
  section: Fallback strategy for poor-quality scanned documents

# UI/COMPONENT PATTERNS  
- url: https://ui.shadcn.com/docs/components/form#file-upload
  why: shadcn/ui file upload component with drag-and-drop and progress
  critical: Must handle large files (50MB+) with chunked upload support

- url: https://ui.shadcn.com/docs/components/card
  why: Document card layout patterns for file listings and metadata display
  critical: Support responsive grid layout and loading states

- docfile: PRPs/ai_docs/diff_visualization_patterns.md  
  why: Side-by-side diff rendering with scroll synchronization
  section: Performance optimization for large document comparison

- docfile: PRPs/ai_docs/citation_component_patterns.md
  why: Expandable citation callouts with copy-to-clipboard functionality
  section: Legal citation formatting for Indonesian law references
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
│   └── templates/             # PRP templates
├── CLAUDE.md                  # Archon-first development workflow
└── (No source code yet - greenfield project)
```

### Desired Codebase Tree

```bash
open-legis-ai-lite/
├── .next/                     # Next.js build output
├── .supabase/                 # Supabase local development
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout with Inter font, metadata
│   ├── page.tsx               # Home page with upload interface
│   ├── globals.css            # Global styles, shadcn/ui imports
│   ├── api/                   # API Routes
│   │   ├── upload/route.ts    # Document upload handler with storage
│   │   ├── process/route.ts   # Background document processing
│   │   ├── analyze/route.ts   # AI analysis endpoint
│   │   ├── diff/route.ts      # Document comparison API
│   │   └── documents/[id]/route.ts # Document CRUD operations
│   ├── components/            # Shared UI components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── upload/
│   │   │   ├── FileUpload.tsx        # Drag-and-drop upload with progress
│   │   │   ├── FileCard.tsx          # Document card with metadata
│   │   │   └── ProcessingStatus.tsx   # Real-time processing status
│   │   ├── analysis/
│   │   │   ├── DocumentSummary.tsx   # AI summary with glossary
│   │   │   ├── DiffPane.tsx          # Side-by-side diff viewer  
│   │   │   ├── ConflictFlags.tsx     # Conflict detection results
│   │   │   └── CiteCallout.tsx       # Citation display component
│   │   └── layout/
│   │       ├── Navigation.tsx        # Main navigation
│   │       └── Footer.tsx           # Footer with legal disclaimers
│   ├── [document]/            # Dynamic document pages
│   │   └── page.tsx          # Public document view
│   ├── lib/                   # Utility functions
│   │   ├── utils.ts          # shadcn/ui utils, general helpers
│   │   ├── supabase.ts       # Supabase client configuration
│   │   ├── pdf-processor.ts   # PDF extraction and clause segmentation
│   │   ├── embeddings.ts     # OpenAI embeddings integration
│   │   ├── diff-engine.ts    # Document comparison algorithms
│   │   └── rag-retriever.ts  # RAG implementation for conflict detection
│   └── types/                # TypeScript type definitions
│       ├── documents.ts      # Document and version types
│       ├── analysis.ts       # AI analysis result types
│       └── database.ts       # Supabase database types
├── components.json           # shadcn/ui configuration
├── supabase/                 # Database schema and migrations
│   ├── migrations/           # SQL migration files
│   └── config.toml          # Supabase configuration
├── public/                   # Static assets
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── next.config.js          # Next.js configuration
└── .env.local              # Environment variables
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js App Router file upload limitations
// - 15s timeout on Vercel, use background processing for large files
// - Buffer entire file in memory, implement chunked uploads for 50MB+
// - Server Actions vs API Routes: use API Routes for file uploads

// PDF Processing with Indonesian language support
// - pdf-parse: Works for text-based PDFs, fails on scanned documents
// - Tesseract.js OCR: Use 'ind' language code for Indonesian
// - Fallback chain: pdf-parse → pdf.js-extract → OCR with Tesseract

// Supabase pgvector optimization
// - Use ivfflat indexes for 1000+ vectors: CREATE INDEX ON embeddings USING ivfflat (vector)
// - text-embedding-3-small: 1536 dimensions, optimal cost/performance
// - RLS policies required for multi-tenant document access

// OpenAI API rate limits and costs  
// - Batch embeddings: 100 requests per call for efficiency
// - Use async processing to avoid blocking user uploads
// - Cache embeddings to avoid reprocessing identical content

// Indonesian legal document processing
// - Clause markers: "Pasal", "Ayat", "Huruf" - regex patterns needed
// - Legal term glossary: maintain Indonesian→plain language mappings
// - Citation formats: Law Number, Article, Paragraph structure parsing
```

## Implementation Blueprint

### Data Models and Structure

**Supabase Database Schema:**

```sql
-- Core document management
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source_url TEXT,
    kind TEXT, -- 'law', 'regulation', 'draft', etc.
    jurisdiction TEXT, -- 'national', 'provincial', 'municipal'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document versions for comparison
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL, -- 'v1', 'draft-2024-01', etc.
    storage_path TEXT NOT NULL, -- Supabase Storage path
    pages INTEGER,
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clause-level text segments with page references
CREATE TABLE clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    clause_ref TEXT, -- 'Pasal 1', 'Ayat 2', etc.
    text TEXT NOT NULL,
    page_from INTEGER,
    page_to INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector embeddings for RAG
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clause_id UUID REFERENCES clauses(id) ON DELETE CASCADE,
    vector vector(1536), -- text-embedding-3-small dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Computed diffs between versions
CREATE TABLE diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    v_from UUID REFERENCES document_versions(id),
    v_to UUID REFERENCES document_versions(id),
    clause_ref TEXT,
    change_kind TEXT, -- 'added', 'deleted', 'modified'
    score FLOAT, -- similarity score
    diff_data JSONB, -- detailed change information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conflict detection results
CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    law_ref TEXT, -- Reference to existing law
    overlap_score FLOAT, -- Semantic similarity score
    excerpt TEXT, -- Conflicting text excerpt
    cite_json JSONB, -- Full citation data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Performance indexes
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector) WITH (lists = 100);
CREATE INDEX idx_clauses_version ON clauses(version_id);
CREATE INDEX idx_conflicts_version ON conflicts(version_id);
```

**TypeScript Models:**

```typescript
// app/types/documents.ts
export interface Document {
  id: string;
  title: string;
  source_url?: string;
  kind?: string;
  jurisdiction?: string;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_label: string;
  storage_path: string;
  pages?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface Clause {
  id: string;
  version_id: string;
  clause_ref?: string;
  text: string;
  page_from?: number;
  page_to?: number;
}

// app/types/analysis.ts
export interface DocumentSummary {
  summary: string;
  glossary: Array<{
    term: string;
    definition: string;
  }>;
  key_changes?: string[];
  citations: Array<{
    text: string;
    source: string;
    page?: number;
  }>;
}

export interface DiffResult {
  changes: Array<{
    clause_ref?: string;
    change_kind: 'added' | 'deleted' | 'modified';
    old_text?: string;
    new_text?: string;
    similarity_score?: number;
  }>;
  summary: string;
}

export interface ConflictFlag {
  law_ref: string;
  overlap_score: number;
  excerpt: string;
  citation: {
    title: string;
    article?: string;
    paragraph?: string;
    url?: string;
  };
  explanation: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: PROJECT SETUP
  - INITIALIZE: Next.js 15 project with TypeScript, Tailwind, shadcn/ui
  - COMMAND: npx create-next-app@latest . --typescript --tailwind --app --import-alias="@/*"
  - COMMAND: npx shadcn@latest init
  - COMMAND: npx shadcn@latest add card button input label form progress
  - SETUP: Environment variables (.env.local template)
  - PLACEMENT: Root directory with proper .gitignore

Task 2: SUPABASE SETUP
  - INITIALIZE: Supabase project and local development
  - COMMAND: npx supabase init
  - CREATE: supabase/migrations/20250902000001_initial_schema.sql (full schema above)
  - SETUP: pgvector extension and performance indexes
  - CONFIG: Row-level security policies for document access
  - PLACEMENT: supabase/ directory with migrations and config

Task 3: CORE LIBRARY SETUP
  - IMPLEMENT: app/lib/supabase.ts - client configuration with TypeScript types
  - IMPLEMENT: app/lib/utils.ts - shadcn/ui utils and general helpers
  - IMPLEMENT: app/lib/pdf-processor.ts - PDF extraction with Indonesian language support
  - DEPENDENCIES: pdf-parse, @types/pdf-parse for TypeScript support
  - PLACEMENT: app/lib/ directory following Next.js conventions

Task 4: UPLOAD INFRASTRUCTURE
  - IMPLEMENT: app/api/upload/route.ts - File upload to Supabase Storage
  - IMPLEMENT: app/components/upload/FileUpload.tsx - Drag-and-drop with progress
  - IMPLEMENT: app/components/upload/FileCard.tsx - Document display with metadata
  - FOLLOW: Next.js App Router API route patterns (POST handler with NextRequest)
  - DEPENDENCIES: @supabase/storage-js for file operations
  - PLACEMENT: API routes in app/api/, components in app/components/

Task 5: DOCUMENT PROCESSING PIPELINE
  - IMPLEMENT: app/lib/pdf-processor.ts - Text extraction and clause segmentation
  - IMPLEMENT: app/api/process/route.ts - Background processing endpoint
  - IMPLEMENT: app/lib/embeddings.ts - OpenAI embeddings generation
  - PATTERN: Async processing with status updates in database
  - DEPENDENCIES: openai package for embeddings API
  - PLACEMENT: Processing logic in app/lib/, API in app/api/

Task 6: AI ANALYSIS COMPONENTS
  - IMPLEMENT: app/lib/rag-retriever.ts - Vector similarity search with pgvector
  - IMPLEMENT: app/api/analyze/route.ts - AI summary and conflict detection
  - IMPLEMENT: app/components/analysis/DocumentSummary.tsx - Summary display with citations
  - PATTERN: Streaming responses for long analysis operations
  - DEPENDENCIES: OpenAI client for completion API
  - PLACEMENT: Analysis components in app/components/analysis/

Task 7: DIFF ENGINE
  - IMPLEMENT: app/lib/diff-engine.ts - Document comparison algorithms  
  - IMPLEMENT: app/components/analysis/DiffPane.tsx - Side-by-side diff visualization
  - IMPLEMENT: app/api/diff/route.ts - Diff computation endpoint
  - PATTERN: Clause-aware diffing with semantic similarity
  - DEPENDENCIES: diff library for text comparison
  - PLACEMENT: Diff logic in app/lib/, UI in app/components/

Task 8: PUBLIC DOCUMENT PAGES
  - IMPLEMENT: app/[document]/page.tsx - Public document view with SEO
  - IMPLEMENT: app/components/layout/Navigation.tsx - Site navigation
  - IMPLEMENT: app/components/layout/Footer.tsx - Footer with disclaimers
  - PATTERN: Static generation for public pages, dynamic for processing
  - DEPENDENCIES: next/head for SEO metadata
  - PLACEMENT: Dynamic routes in app/[document]/

Task 9: ACCESSIBILITY & POLISH
  - IMPLEMENT: Keyboard navigation for all interactive elements
  - IMPLEMENT: ARIA labels, headings hierarchy, color contrast compliance
  - IMPLEMENT: Print-friendly CSS for public document pages
  - PATTERN: WCAG 2.1 AA compliance throughout application
  - VALIDATION: axe-core testing integration
  - PLACEMENT: Global styles in app/globals.css

Task 10: TESTING & VALIDATION SETUP
  - IMPLEMENT: Unit tests for PDF processing, diff algorithms, RAG retrieval
  - IMPLEMENT: Integration tests for upload → process → analyze workflow
  - IMPLEMENT: Accessibility testing with @axe-core/react
  - PATTERN: Jest + React Testing Library for component testing
  - DEPENDENCIES: @testing-library/react, @testing-library/jest-dom
  - PLACEMENT: Tests alongside components (__tests__ directories)
```

### Implementation Patterns & Key Details

```typescript
// File Upload Pattern with Progress
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // CRITICAL: Validate file type and size
    if (!file.type.includes('pdf') && !file.type.includes('html')) {
      return NextResponse.json({ error: 'Only PDF and HTML files supported' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const supabase = createClient();
    
    // Upload to Supabase Storage with unique path
    const fileName = `${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Create database records
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title: file.name,
        kind: 'uploaded'
      })
      .select()
      .single();

    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        version_label: 'v1',
        storage_path: uploadData.path,
        processing_status: 'pending'
      })
      .select()
      .single();

    // Trigger background processing
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version_id: version.id })
    });

    return NextResponse.json({ 
      document_id: document.id,
      version_id: version.id,
      message: 'Upload successful, processing started'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PDF Processing with Indonesian Support
// app/lib/pdf-processor.ts
import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export interface ClauseSegment {
  clause_ref?: string;
  text: string;
  page_from?: number;
  page_to?: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<ClauseSegment[]> {
  try {
    // Try pdf-parse first (fastest for text-based PDFs)
    const pdfData = await pdf(buffer);
    
    if (pdfData.text.trim().length > 100) {
      return segmentTextIntoClauses(pdfData.text, pdfData.pages);
    }
    
    // Fallback to OCR for scanned documents
    console.log('Text-based extraction failed, using OCR...');
    return await extractWithOCR(buffer);
    
  } catch (error) {
    console.error('PDF processing failed:', error);
    throw new Error('Failed to process PDF document');
  }
}

async function extractWithOCR(buffer: Buffer): Promise<ClauseSegment[]> {
  const worker = await createWorker('ind'); // Indonesian language
  
  try {
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    
    return segmentTextIntoClauses(text);
    
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

function segmentTextIntoClauses(text: string, pages?: any[]): ClauseSegment[] {
  // Indonesian legal document patterns
  const clausePatterns = [
    /Pasal\s+(\d+[a-zA-Z]*)/gi,           // Articles: "Pasal 1", "Pasal 2a"
    /Ayat\s*\((\d+)\)/gi,                 // Paragraphs: "Ayat (1)"
    /Huruf\s+([a-z])\./gi,                // Points: "Huruf a."
    /Bagian\s+([IVX]+|[A-Z]+)/gi,         // Sections: "Bagian I"
  ];
  
  const segments: ClauseSegment[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentClause = '';
  let currentText = '';
  
  for (const line of lines) {
    // Check if line starts with a clause marker
    const clauseMatch = clausePatterns.find(pattern => pattern.test(line));
    
    if (clauseMatch) {
      // Save previous segment
      if (currentText.trim()) {
        segments.push({
          clause_ref: currentClause,
          text: currentText.trim()
        });
      }
      
      // Start new segment
      currentClause = line.trim();
      currentText = line + '\n';
    } else {
      currentText += line + '\n';
    }
  }
  
  // Add final segment
  if (currentText.trim()) {
    segments.push({
      clause_ref: currentClause,
      text: currentText.trim()
    });
  }
  
  return segments.filter(seg => seg.text.length > 10); // Filter out very short segments
}

// RAG Implementation with pgvector
// app/lib/rag-retriever.ts
import { createClient } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ConflictResult {
  law_ref: string;
  overlap_score: number;
  excerpt: string;
  citation: any;
  explanation: string;
}

export async function findConflicts(versionId: string): Promise<ConflictResult[]> {
  const supabase = createClient();
  
  // Get clauses for this version
  const { data: clauses, error: clausesError } = await supabase
    .from('clauses')
    .select('*')
    .eq('version_id', versionId);

  if (clausesError || !clauses?.length) {
    return [];
  }

  const conflicts: ConflictResult[] = [];
  
  for (const clause of clauses) {
    // Generate embedding for clause
    const embedding = await generateEmbedding(clause.text);
    
    // Search for similar content in existing laws
    const { data: similarClauses, error: searchError } = await supabase.rpc(
      'search_similar_clauses',
      {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5
      }
    );

    if (searchError || !similarClauses?.length) continue;

    for (const similar of similarClauses) {
      if (similar.similarity > 0.8) { // High similarity threshold
        conflicts.push({
          law_ref: similar.law_reference,
          overlap_score: similar.similarity,
          excerpt: similar.text,
          citation: {
            title: similar.law_title,
            article: similar.clause_ref,
            url: similar.source_url
          },
          explanation: `Potential conflict detected with ${similar.law_reference}`
        });
      }
    }
  }
  
  return conflicts;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000) // Token limit safety
  });
  
  return response.data[0].embedding;
}

// Diff Visualization Component
// app/components/analysis/DiffPane.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface DiffProps {
  oldVersion: string;
  newVersion: string;
  changes: Array<{
    clause_ref?: string;
    change_kind: 'added' | 'deleted' | 'modified';
    old_text?: string;
    new_text?: string;
  }>;
}

export default function DiffPane({ oldVersion, newVersion, changes }: DiffProps) {
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  const [currentChange, setCurrentChange] = useState(0);
  const changeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const jumpToChange = (index: number) => {
    setCurrentChange(index);
    changeRefs.current[index]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="lg:col-span-2 flex flex-wrap gap-4 items-center">
        <Button 
          variant={showOnlyChanges ? "default" : "outline"}
          onClick={() => setShowOnlyChanges(!showOnlyChanges)}
        >
          {showOnlyChanges ? "Show All Content" : "Show Changes Only"}
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => jumpToChange(Math.max(0, currentChange - 1))}
            disabled={currentChange === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentChange + 1} of {changes.length} changes
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => jumpToChange(Math.min(changes.length - 1, currentChange + 1))}
            disabled={currentChange === changes.length - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Old Version */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Original Version</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {/* Render old version with change highlighting */}
          </div>
        </CardContent>
      </Card>

      {/* New Version */} 
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Updated Version</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {/* Render new version with change highlighting */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Integration Points

```yaml
DATABASE:
  - migration: "Enable pgvector extension and create indexes"
  - rpc: "CREATE FUNCTION search_similar_clauses() for vector similarity"
  - policy: "Row-level security for document access control"

STORAGE:
  - bucket: "documents" bucket with public read access for processed files
  - policy: "Authenticated upload, public read for processed documents"
  - cleanup: "Scheduled cleanup of failed processing attempts"

EXTERNAL_APIS:
  - openai: "Embeddings and completions API with rate limiting"
  - supabase: "Database, storage, and auth services"
  - monitoring: "Error tracking and performance monitoring"

ENVIRONMENT:
  - required: "OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY"
  - optional: "NEXT_PUBLIC_BASE_URL for production deployment"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Project setup validation
npm run dev                              # Verify development server starts
npm run build                           # Test production build
npm run lint                            # ESLint validation
npm run type-check                      # TypeScript validation (if configured)

# File-level validation during development
npx tsc --noEmit                        # TypeScript checking without output
npx eslint app/ --ext .ts,.tsx --fix    # Lint and auto-fix TypeScript files
npx prettier app/ --write --check       # Format checking

# Expected: Zero TypeScript errors, no ESLint violations, consistent formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test individual components and utilities
npm run test                            # Run all unit tests
npm run test:watch                      # Watch mode for development
npm run test:coverage                   # Coverage report

# Specific test suites
npm run test -- app/lib/pdf-processor.test.ts     # PDF processing tests
npm run test -- app/lib/diff-engine.test.ts       # Diff algorithm tests
npm run test -- app/components/upload/             # Upload component tests

# Expected: All tests pass, coverage >80% for critical paths
```

### Level 3: Integration Testing (System Validation)

```bash
# Database setup validation
npx supabase start                      # Start local Supabase
npx supabase db reset                   # Reset and apply migrations
npx supabase db seed                    # Seed with test data

# API endpoint testing
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-document.pdf" \
  -H "Authorization: Bearer ${TEST_TOKEN}" | jq .

# Full workflow testing
curl -X GET http://localhost:3000/api/documents/${DOC_ID}/status | jq .
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"version_id": "'${VERSION_ID}'"}' | jq .

# Performance validation
curl -w "@curl-format.txt" http://localhost:3000/api/process \
  -X POST -d '{"version_id": "'${VERSION_ID}'"}'

# Expected: All endpoints respond correctly, processing completes within time limits
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Accessibility Testing
npx axe-core app/                       # Automated accessibility scanning
npm run lighthouse                      # Lighthouse audit (if configured)

# PDF Processing Validation
node scripts/test-pdf-extraction.js    # Test with various PDF formats
node scripts/test-indonesian-text.js   # Validate Indonesian language processing

# AI Analysis Validation  
node scripts/validate-summaries.js     # Test summary quality with sample documents
node scripts/test-conflict-detection.js # Validate RAG-based conflict detection

# Performance Testing
npx clinic doctor -- node server.js    # Performance profiling
ab -n 100 -c 10 http://localhost:3000/api/upload  # Load testing upload endpoint

# Security Scanning
npm audit                               # Dependency vulnerability check
npx eslint-plugin-security app/         # Security-focused linting

# User Experience Validation
npm run test:e2e                        # End-to-end user journey testing
npm run visual-regression               # Visual consistency testing (if configured)

# Expected: WCAG 2.1 AA compliance, performance within targets, no security vulnerabilities
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Development server runs without errors: `npm run dev`
- [ ] Production build successful: `npm run build`  
- [ ] All TypeScript types correct: `npx tsc --noEmit`
- [ ] All tests pass: `npm run test`
- [ ] Accessibility compliance: `npx axe-core` passes
- [ ] Performance targets met: first summary < 3 minutes

### Feature Validation

- [ ] Document upload handles PDF and HTML files up to 50MB
- [ ] Text extraction works for both text-based and scanned PDFs
- [ ] Indonesian language processing accurate for legal terminology
- [ ] Plain-language summaries generated with proper citations
- [ ] Clause-level diffs render correctly with side-by-side comparison
- [ ] Conflict detection finds relevant overlaps with existing laws
- [ ] Public document pages load quickly with proper SEO metadata
- [ ] Print layout renders cleanly for offline distribution

### Code Quality Validation

- [ ] Follows Next.js App Router patterns consistently
- [ ] shadcn/ui components implemented correctly
- [ ] TypeScript types comprehensive and accurate
- [ ] Error handling robust with user-friendly messages
- [ ] Database queries optimized with proper indexing
- [ ] File uploads secure with proper validation
- [ ] Environment variables properly configured

### User Experience Validation

- [ ] Upload interface intuitive with drag-and-drop support
- [ ] Processing status clearly communicated to users
- [ ] Navigation between analysis views seamless
- [ ] Citation display expandable and copyable
- [ ] Keyboard navigation works throughout application
- [ ] Mobile-responsive layout functions properly
- [ ] Loading states provide appropriate feedback

---

## Anti-Patterns to Avoid

- ❌ Don't process files synchronously - use background jobs for documents >5MB
- ❌ Don't store entire documents in database - use Supabase Storage with metadata
- ❌ Don't generate embeddings for identical content - implement deduplication
- ❌ Don't use client-side PDF processing - security risk and performance issue
- ❌ Don't ignore Indonesian language specifics - legal terminology matters
- ❌ Don't skip accessibility testing - government systems must be inclusive
- ❌ Don't hardcode legal citation formats - make them configurable
- ❌ Don't ignore rate limits - implement proper throttling for OpenAI API
- ❌ Don't store sensitive documents without encryption at rest
- ❌ Don't skip the advisory disclaimer - "AI-generated summary; verify with official sources"