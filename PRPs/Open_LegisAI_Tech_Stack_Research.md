# Open-LegisAI Lite Tech Stack: Implementation-Ready Research Guide

**Research Date**: September 2024  
**Focus**: Production-ready implementation patterns for legal document processing platform

## Table of Contents
1. [Next.js 15 + TypeScript Patterns](#nextjs-15--typescript-patterns)
2. [Supabase Integration Patterns](#supabase-integration-patterns)
3. [PDF Processing & Text Extraction](#pdf-processing--text-extraction)
4. [AI/ML Integration Patterns](#aiml-integration-patterns)
5. [Document Diffing Algorithms](#document-diffing-algorithms)

---

## Next.js 15 + TypeScript Patterns

### Key Updates for 2024/2025
- React 19 support
- Improved Server Actions with automatic tree-shaking
- Enhanced TypeScript integration
- Better performance for large file handling

### File Upload Handling with Progress

#### Basic Server Action Pattern
```typescript
// app/actions/upload.ts
"use server"
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";

export async function uploadDocument(formData: FormData) {
  try {
    const file = formData.get("document") as File;
    
    if (!file || file.size === 0) {
      throw new Error("No file provided");
    }

    // Validate file type (PDF only for legal docs)
    if (!file.type.includes("pdf")) {
      throw new Error("Only PDF files are supported");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Generate unique filename
    const filename = `${Date.now()}-${file.name}`;
    const filepath = `./uploads/${filename}`;
    
    await fs.writeFile(filepath, buffer);
    
    revalidatePath("/");
    
    return {
      success: true,
      filename,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed"
    };
  }
}
```

#### Client Component with Progress Tracking
```tsx
// app/components/DocumentUpload.tsx
"use client"
import { useState } from "react";
import { uploadDocument } from "@/actions/upload";

export default function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleSubmit(formData: FormData) {
    setUploading(true);
    setProgress(0);

    try {
      // For progress tracking with large files, use chunks
      const file = formData.get("document") as File;
      
      if (file.size > 50 * 1024 * 1024) { // 50MB+
        // Use TUS for large files with progress
        return await handleLargeFileUpload(file);
      }

      const result = await uploadDocument(formData);
      
      if (result.success) {
        setProgress(100);
        // Handle success
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <input 
        type="file" 
        name="document" 
        accept=".pdf"
        disabled={uploading}
      />
      <button type="submit" disabled={uploading}>
        {uploading ? `Uploading... ${progress}%` : "Upload Document"}
      </button>
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </form>
  );
}
```

#### Large File Upload with TUS
```typescript
// For files > 50MB, use TUS for chunked uploads
import { Upload } from "tus-js-client";

async function handleLargeFileUpload(file: File) {
  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: "/api/upload/tus",
      chunkSize: 50 * 1024 * 1024, // 50MB chunks
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onError: (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100;
        setProgress(Math.round(percentage));
      },
      onSuccess: () => {
        console.log("Upload completed successfully");
        resolve({ success: true });
      },
    });
    
    upload.start();
  });
}
```

#### API Routes Best Practices
```typescript
// app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  type: z.enum(["law", "regulation", "policy"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = DocumentSchema.parse(body);

    // Process document with type safety
    const result = await processLegalDocument(validatedData);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### TypeScript Patterns for Legal Documents
```typescript
// types/legal.ts
export interface LegalDocument {
  id: string;
  title: string;
  type: DocumentType;
  content: DocumentContent;
  metadata: DocumentMetadata;
  clauses: Clause[];
  citations: Citation[];
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType = "law" | "regulation" | "policy" | "amendment";

export interface DocumentContent {
  rawText: string;
  processedText: string;
  sections: DocumentSection[];
  embeddings?: number[];
}

export interface Clause {
  id: string;
  number: string;
  title: string;
  content: string;
  category: ClauseCategory;
  references: string[];
  embedding?: number[];
}

export type ClauseCategory = 
  | "definition"
  | "requirement" 
  | "prohibition"
  | "penalty"
  | "procedure"
  | "general";

export interface Citation {
  id: string;
  sourceDocument: string;
  targetDocument: string;
  clauseId?: string;
  citationType: "reference" | "amendment" | "repeal";
  confidence: number;
}
```

#### Performance Gotchas
- **Server Actions Limitation**: No real-time progress for processing
- **Memory Usage**: Buffer entire file in memory - use streams for 100MB+ files
- **Timeout**: Default 15s for Server Actions on Vercel
- **Error Handling**: Always wrap in try-catch for production

---

## Supabase Integration Patterns

### Storage Security Setup
```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('legal-documents', 'legal-documents', false);

-- Row-level security for authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'legal-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view their own documents
CREATE POLICY "Users can view own documents" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'legal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### pgvector Setup and Configuration
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table with vector embeddings
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  document_type document_type NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimension
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clauses table with embeddings
CREATE TABLE document_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  clause_number TEXT,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  category clause_category,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_document_sections(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  filter_document_type document_type DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  document_type document_type,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ld.id,
    ld.title,
    ld.content,
    ld.document_type,
    1 - (ld.embedding <=> query_embedding) AS similarity
  FROM legal_documents ld
  WHERE 1 - (ld.embedding <=> query_embedding) > match_threshold
    AND (filter_document_type IS NULL OR ld.document_type = filter_document_type)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Indexes for performance
CREATE INDEX ON legal_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON document_clauses USING ivfflat (embedding vector_cosine_ops);
```

### Secure File Upload Integration
```typescript
// lib/supabase/storage.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadDocument(
  file: File,
  userId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('legal-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          'user-id': userId,
          'original-name': file.name
        }
      });

    if (error) throw error;

    return { success: true, path: data.path };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Upload failed" 
    };
  }
}

export async function getDocumentUrl(path: string) {
  const { data } = await supabase.storage
    .from('legal-documents')
    .createSignedUrl(path, 3600); // 1 hour expiry
  
  return data?.signedUrl;
}
```

### Multi-tenant Document Access
```sql
-- RLS policy for multi-tenant access
CREATE POLICY "Users access own organization documents" 
ON legal_documents 
FOR ALL USING (
  auth.uid() IN (
    SELECT user_id 
    FROM organization_members 
    WHERE organization_id = (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = legal_documents.user_id
    )
  )
);

-- Organization structure
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Performance Considerations
- **Vector Index**: Use `ivfflat` for embeddings > 1000 vectors
- **Connection Pooling**: Use `supabase-js` client pooling for high traffic
- **RLS Performance**: Keep policies simple to avoid query slowdown
- **Storage Limits**: 50GB for free tier, consider pagination for large datasets

---

## PDF Processing & Text Extraction

### Library Recommendations with Performance Data

#### 1. pdf-parse (Best for Simple Text Extraction)
```bash
npm install pdf-parse
```

```typescript
// lib/pdf/extract.ts
import pdf from 'pdf-parse';
import fs from 'fs';

export async function extractTextFromPDF(filePath: string): Promise<{
  text: string;
  pages: number;
  metadata: any;
}> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.metadata
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error}`);
  }
}

// Performance: ~7-8 seconds for 260 PDFs on M2 Mac (2024 benchmark)
```

#### 2. pdf.js-extract (Best for Position-Aware Extraction)
```bash
npm install pdf.js-extract
```

```typescript
import { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();

export async function extractWithPositions(filePath: string) {
  const options: PDFExtractOptions = {};
  
  return new Promise((resolve, reject) => {
    pdfExtract.extract(filePath, options, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// Returns text with x,y coordinates - useful for clause identification
```

#### 3. OCR Integration for Scanned Documents
```bash
npm install tesseract.js pdf2pic
```

```typescript
// lib/pdf/ocr.ts
import pdf2pic from "pdf2pic";
import Tesseract from 'tesseract.js';

export async function extractFromScannedPDF(
  filePath: string, 
  language: string = 'ind' // Indonesian support
): Promise<string> {
  try {
    // Convert PDF pages to images
    const convert = pdf2pic.fromPath(filePath, {
      density: 300, // Higher DPI for better OCR
      saveFilename: "page",
      savePath: "./temp",
      format: "png",
      width: 2048,
      height: 2048
    });

    const results = await convert.bulk(-1, { responseType: 'image' });
    
    let fullText = '';
    
    // OCR each page
    for (const result of results) {
      const { data: { text } } = await Tesseract.recognize(
        result.base64,
        language, // 'ind' for Indonesian, 'eng' for English
        {
          logger: m => console.log(m) // Progress logging
        }
      );
      
      fullText += text + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    throw new Error(`OCR extraction failed: ${error}`);
  }
}
```

### Indonesian Language Processing
```typescript
// lib/pdf/indonesian.ts
export const INDONESIAN_LEGAL_TERMS = {
  'undang-undang': 'law',
  'peraturan': 'regulation', 
  'keputusan': 'decision',
  'instruksi': 'instruction',
  'pasal': 'article',
  'ayat': 'paragraph',
  'huruf': 'point'
};

export function preprocessIndonesianText(text: string): string {
  // Normalize Indonesian legal document structure
  return text
    .replace(/(?:Pasal|PASAL)\s+(\d+)/g, 'Article $1')
    .replace(/(?:Ayat|AYAT)\s+\((\d+)\)/g, 'Paragraph ($1)')
    .replace(/(?:Huruf|HURUF)\s+([a-z])/g, 'Point $1')
    .normalize('NFD'); // Unicode normalization
}
```

### Clause-Level Segmentation
```typescript
// lib/pdf/segmentation.ts
export interface DocumentClause {
  number: string;
  title?: string;
  content: string;
  type: 'article' | 'paragraph' | 'point';
  level: number;
}

export function segmentLegalDocument(text: string): DocumentClause[] {
  const clauses: DocumentClause[] = [];
  
  // Indonesian legal document patterns
  const patterns = {
    article: /(?:Pasal|Article)\s+(\d+)(?:\s*-\s*(.+?))?[\n\r]+([\s\S]*?)(?=(?:Pasal|Article)\s+\d+|$)/gi,
    paragraph: /\((\d+)\)\s+([\s\S]*?)(?=\(\d+\)|$)/gi,
    point: /([a-z])\.\s+([\s\S]*?)(?=[a-z]\.|$)/gi
  };
  
  let match;
  
  // Extract articles
  while ((match = patterns.article.exec(text)) !== null) {
    const [, number, title, content] = match;
    
    clauses.push({
      number,
      title: title?.trim(),
      content: content.trim(),
      type: 'article',
      level: 1
    });
    
    // Extract paragraphs within article
    const paragraphMatches = content.matchAll(patterns.paragraph);
    for (const pMatch of paragraphMatches) {
      const [, pNumber, pContent] = pMatch;
      
      clauses.push({
        number: `${number}(${pNumber})`,
        content: pContent.trim(),
        type: 'paragraph',
        level: 2
      });
    }
  }
  
  return clauses;
}
```

### Error Handling & Performance
```typescript
// lib/pdf/robust-extraction.ts
export async function robustExtractText(filePath: string): Promise<string> {
  const strategies = [
    () => extractTextFromPDF(filePath), // pdf-parse
    () => extractWithPositions(filePath), // pdf.js-extract
    () => extractFromScannedPDF(filePath, 'ind') // OCR fallback
  ];
  
  for (const [index, strategy] of strategies.entries()) {
    try {
      console.log(`Trying extraction strategy ${index + 1}`);
      const result = await strategy();
      
      if (typeof result === 'string' && result.length > 100) {
        return result;
      } else if (result && 'text' in result) {
        return result.text;
      }
    } catch (error) {
      console.warn(`Strategy ${index + 1} failed:`, error);
      if (index === strategies.length - 1) {
        throw new Error('All extraction strategies failed');
      }
    }
  }
  
  throw new Error('No extraction strategy succeeded');
}
```

#### Key Performance Gotchas
- **Memory Usage**: Large PDFs (100MB+) can exceed Node.js heap limit
- **OCR Speed**: Tesseract.js is CPU-intensive (consider worker threads)
- **File Cleanup**: Always clean temp files after processing
- **Indonesian OCR**: Requires specific language models (`ind` for Indonesian)

---

## AI/ML Integration Patterns

### OpenAI Embeddings API (2024 Updates)
```typescript
// lib/ai/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use latest embedding models (2024)
export const EMBEDDING_MODELS = {
  small: 'text-embedding-3-small', // Best cost/performance
  large: 'text-embedding-3-large', // Highest accuracy
  legacy: 'text-embedding-ada-002' // Backward compatibility
} as const;

export async function generateEmbedding(
  text: string,
  model: keyof typeof EMBEDDING_MODELS = 'small'
): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODELS[model],
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`Embedding generation failed: ${error}`);
  }
}

// Batch processing for efficiency
export async function generateBatchEmbeddings(
  texts: string[],
  model: keyof typeof EMBEDDING_MODELS = 'small'
): Promise<number[][]> {
  const BATCH_SIZE = 100; // OpenAI limit
  const results: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODELS[model],
      input: batch,
      encoding_format: "float",
    });
    
    results.push(...response.data.map(d => d.embedding));
  }
  
  return results;
}
```

### RAG Implementation with Vector Database
```typescript
// lib/ai/rag.ts
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side key
);

export interface RAGContext {
  documents: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
    type: string;
  }>;
  query: string;
}

export async function performRAGQuery(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    filterType?: string;
  } = {}
): Promise<RAGContext> {
  const {
    matchThreshold = 0.78,
    matchCount = 10,
    filterType
  } = options;

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Search similar documents
    const { data: documents, error } = await supabase.rpc(
      'match_document_sections',
      {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_document_type: filterType
      }
    );

    if (error) throw error;

    return {
      documents: documents || [],
      query
    };
  } catch (error) {
    throw new Error(`RAG query failed: ${error}`);
  }
}
```

### Streaming Responses for Long Analysis
```typescript
// lib/ai/streaming.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function* streamLegalAnalysis(
  context: RAGContext,
  analysis_type: 'summary' | 'compliance' | 'comparison'
): AsyncGenerator<string, void, unknown> {
  const prompt = buildAnalysisPrompt(context, analysis_type);
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a legal document analysis expert specializing in Indonesian law. 
                 Provide detailed analysis based on the provided context documents.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    stream: true,
    temperature: 0.3, // Lower temperature for factual analysis
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      yield content;
    }
  }
}

function buildAnalysisPrompt(context: RAGContext, type: string): string {
  const contextText = context.documents
    .map(doc => `Document: ${doc.title}\nContent: ${doc.content}\n---`)
    .join('\n');

  const prompts = {
    summary: `Please provide a comprehensive summary of the following legal documents:\n\n${contextText}`,
    compliance: `Analyze compliance requirements based on these legal documents:\n\n${contextText}`,
    comparison: `Compare and contrast the following legal documents:\n\n${contextText}`
  };

  return prompts[type as keyof typeof prompts] || prompts.summary;
}
```

### Citation Tracking System
```typescript
// lib/ai/citations.ts
export interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  confidence: number;
  pageNumber?: number;
  clauseNumber?: string;
}

export class CitationTracker {
  private citations: Citation[] = [];

  addCitation(doc: any, confidence: number, metadata?: any) {
    this.citations.push({
      id: `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId: doc.id,
      documentTitle: doc.title,
      content: doc.content.substring(0, 200) + '...',
      confidence,
      pageNumber: metadata?.pageNumber,
      clauseNumber: metadata?.clauseNumber
    });
  }

  getCitations(): Citation[] {
    return this.citations.sort((a, b) => b.confidence - a.confidence);
  }

  generateCitationText(): string {
    return this.citations
      .map((cite, index) => 
        `[${index + 1}] ${cite.documentTitle}${cite.clauseNumber ? `, Article ${cite.clauseNumber}` : ''}`
      )
      .join('\n');
  }
}

// Usage in RAG response
export async function generateResponseWithCitations(
  query: string,
  context: RAGContext
): Promise<{ response: string; citations: Citation[] }> {
  const tracker = new CitationTracker();
  
  // Add citations for each context document
  context.documents.forEach(doc => {
    tracker.addCitation(doc, doc.similarity);
  });

  const stream = streamLegalAnalysis(context, 'summary');
  let response = '';
  
  for await (const chunk of stream) {
    response += chunk;
  }

  // Append citations
  const citationText = tracker.generateCitationText();
  response += '\n\n---\nSources:\n' + citationText;

  return {
    response,
    citations: tracker.getCitations()
  };
}
```

#### Performance & Cost Optimization
- **Embedding Models**: Use `text-embedding-3-small` for 62.3% MTEB accuracy at lower cost
- **Batch Processing**: Group embeddings in batches of 100 for API efficiency
- **Caching**: Cache embeddings to avoid re-computation
- **Token Limits**: GPT-4 Turbo supports 128k tokens for large context

---

## Document Diffing Algorithms

### High-Performance Libraries Comparison

#### 1. jsdiff (Most Widely Adopted)
```bash
npm install diff
# 7043+ projects depend on this - most stable choice
```

```typescript
// lib/diff/text-diff.ts
import { diffLines, diffChars, diffWords, Change } from 'diff';

export interface DiffResult {
  changes: Change[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
  };
}

export function compareLegalDocuments(
  original: string,
  revised: string,
  granularity: 'line' | 'word' | 'character' = 'line'
): DiffResult {
  let changes: Change[];
  
  switch (granularity) {
    case 'line':
      changes = diffLines(original, revised, {
        ignoreWhitespace: true,
        stripTrailingCr: true
      });
      break;
    case 'word':
      changes = diffWords(original, revised);
      break;
    case 'character':
      changes = diffChars(original, revised);
      break;
  }

  // Calculate statistics
  const stats = changes.reduce((acc, change) => {
    if (change.added) acc.additions++;
    else if (change.removed) acc.deletions++;
    else acc.modifications++;
    return acc;
  }, { additions: 0, deletions: 0, modifications: 0 });

  return { changes, stats };
}
```

#### 2. diff-match-patch (Google's High-Performance Library)
```bash
npm install diff-match-patch
# Optimized for large documents - powers Google Docs
```

```typescript
// lib/diff/semantic-diff.ts
import { diff_match_patch, patch_obj, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export class SemanticDiffer {
  private dmp: diff_match_patch;

  constructor() {
    this.dmp = new diff_match_patch();
    
    // Optimize for legal documents
    this.dmp.Diff_Timeout = 10; // 10 second timeout
    this.dmp.Diff_EditCost = 4; // Cost of empty edits
  }

  compareDocuments(text1: string, text2: string) {
    const diffs = this.dmp.diff_main(text1, text2);
    
    // Semantic cleanup for human readability
    this.dmp.diff_cleanupSemantic(diffs);
    
    return {
      diffs,
      html: this.dmp.diff_prettyHtml(diffs),
      patches: this.dmp.patch_make(text1, diffs)
    };
  }

  findSimilarClauses(clause1: string, clause2: string): number {
    const diffs = this.dmp.diff_main(clause1, clause2);
    
    // Calculate similarity score (0-1)
    const totalLength = Math.max(clause1.length, clause2.length);
    const matchLength = diffs
      .filter(diff => diff[0] === DIFF_EQUAL)
      .reduce((sum, diff) => sum + diff[1].length, 0);
    
    return matchLength / totalLength;
  }
}
```

### Visual Diff Rendering for Legal Documents
```typescript
// lib/diff/visual-diff.ts
import { Change } from 'diff';

export interface VisualDiffOptions {
  showLineNumbers: boolean;
  highlightSemantic: boolean;
  clauseGrouping: boolean;
}

export function renderLegalDiff(
  changes: Change[],
  options: VisualDiffOptions = {
    showLineNumbers: true,
    highlightSemantic: true,
    clauseGrouping: true
  }
): string {
  let html = '<div class="legal-diff">';
  let lineNumber = 1;

  changes.forEach((change, index) => {
    const lines = change.value.split('\n');
    
    lines.forEach((line, lineIndex) => {
      if (line.trim() === '' && lineIndex === lines.length - 1) return;
      
      let cssClass = '';
      let prefix = '';
      
      if (change.added) {
        cssClass = 'diff-added';
        prefix = '+ ';
      } else if (change.removed) {
        cssClass = 'diff-removed';  
        prefix = '- ';
      } else {
        cssClass = 'diff-unchanged';
        prefix = '  ';
      }

      // Highlight legal structure
      if (options.clauseGrouping && isLegalStructure(line)) {
        cssClass += ' legal-structure';
      }

      html += `<div class="diff-line ${cssClass}">`;
      
      if (options.showLineNumbers) {
        html += `<span class="line-number">${lineNumber}</span>`;
      }
      
      html += `<span class="diff-prefix">${prefix}</span>`;
      html += `<span class="diff-content">${escapeHtml(line)}</span>`;
      html += '</div>';
      
      if (!change.removed) lineNumber++;
    });
  });

  html += '</div>';
  return html;
}

function isLegalStructure(line: string): boolean {
  const patterns = [
    /^(?:Pasal|Article)\s+\d+/, // Articles
    /^\(\d+\)/, // Paragraphs  
    /^[a-z]\.\s/, // Points
    /^(?:BAB|CHAPTER)\s+[IVX]+/ // Chapters
  ];
  
  return patterns.some(pattern => pattern.test(line.trim()));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### Semantic Similarity for Clause Matching
```typescript
// lib/diff/semantic-matching.ts
import { generateEmbedding } from '../ai/embeddings';

export interface ClauseMatch {
  originalClause: string;
  revisedClause: string;
  similarity: number;
  changeType: 'modified' | 'added' | 'removed' | 'unchanged';
}

export async function findSemanticMatches(
  originalClauses: string[],
  revisedClauses: string[]
): Promise<ClauseMatch[]> {
  // Generate embeddings for all clauses
  const [originalEmbeddings, revisedEmbeddings] = await Promise.all([
    Promise.all(originalClauses.map(clause => generateEmbedding(clause))),
    Promise.all(revisedClauses.map(clause => generateEmbedding(clause)))
  ]);

  const matches: ClauseMatch[] = [];
  const usedRevised = new Set<number>();

  // Find best matches for each original clause
  for (let i = 0; i < originalClauses.length; i++) {
    let bestMatch = -1;
    let bestSimilarity = 0;

    for (let j = 0; j < revisedClauses.length; j++) {
      if (usedRevised.has(j)) continue;

      const similarity = cosineSimilarity(
        originalEmbeddings[i],
        revisedEmbeddings[j]
      );

      if (similarity > bestSimilarity && similarity > 0.8) {
        bestSimilarity = similarity;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      usedRevised.add(bestMatch);
      matches.push({
        originalClause: originalClauses[i],
        revisedClause: revisedClauses[bestMatch],
        similarity: bestSimilarity,
        changeType: bestSimilarity > 0.95 ? 'unchanged' : 'modified'
      });
    } else {
      matches.push({
        originalClause: originalClauses[i],
        revisedClause: '',
        similarity: 0,
        changeType: 'removed'
      });
    }
  }

  // Add remaining revised clauses as new
  for (let j = 0; j < revisedClauses.length; j++) {
    if (!usedRevised.has(j)) {
      matches.push({
        originalClause: '',
        revisedClause: revisedClauses[j],
        similarity: 0,
        changeType: 'added'
      });
    }
  }

  return matches;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
}
```

### Performance Optimization for Large Documents
```typescript
// lib/diff/performance.ts
export class OptimizedDiffer {
  private static CHUNK_SIZE = 10000; // Characters per chunk

  static async diffLargeDocuments(
    doc1: string,
    doc2: string
  ): Promise<DiffResult> {
    // For documents > 50KB, use chunked processing
    if (doc1.length + doc2.length > 50000) {
      return this.chunkedDiff(doc1, doc2);
    }
    
    return compareLegalDocuments(doc1, doc2);
  }

  private static chunkedDiff(doc1: string, doc2: string): DiffResult {
    const chunks1 = this.chunkDocument(doc1);
    const chunks2 = this.chunkDocument(doc2);
    
    const allChanges: Change[] = [];
    let stats = { additions: 0, deletions: 0, modifications: 0 };

    // Process chunks in parallel where possible
    const promises = chunks1.map((chunk1, i) => {
      const chunk2 = chunks2[i] || '';
      return compareLegalDocuments(chunk1, chunk2);
    });

    // Handle additional chunks in doc2
    for (let i = chunks1.length; i < chunks2.length; i++) {
      promises.push(compareLegalDocuments('', chunks2[i]));
    }

    // Aggregate results
    const results = await Promise.all(promises);
    results.forEach(result => {
      allChanges.push(...result.changes);
      stats.additions += result.stats.additions;
      stats.deletions += result.stats.deletions;
      stats.modifications += result.stats.modifications;
    });

    return { changes: allChanges, stats };
  }

  private static chunkDocument(doc: string): string[] {
    const chunks: string[] = [];
    
    for (let i = 0; i < doc.length; i += this.CHUNK_SIZE) {
      // Try to break at paragraph boundaries
      let end = Math.min(i + this.CHUNK_SIZE, doc.length);
      
      if (end < doc.length) {
        const nextBreak = doc.indexOf('\n\n', end);
        if (nextBreak !== -1 && nextBreak - end < 1000) {
          end = nextBreak;
        }
      }
      
      chunks.push(doc.substring(i, end));
    }
    
    return chunks;
  }
}
```

#### Performance Characteristics & Gotchas
- **jsdiff**: O(N*M) complexity, 4.5x faster than DOM-based alternatives
- **diff-match-patch**: Optimized for large texts, semantic cleanup available
- **Memory Usage**: Large documents (1MB+) may need chunked processing  
- **Timeout Handling**: Set reasonable timeouts (10s) for user-facing diffs

---

## Security Best Practices Summary

### File Upload Security
- Validate file types (PDF only for legal docs)
- Scan for malware before processing
- Use signed URLs for temporary access
- Implement rate limiting on uploads

### Database Security  
- Enable RLS on all tables
- Use service role keys server-side only
- Implement proper indexing for performance
- Regular backup strategies

### AI/API Security
- Store API keys in environment variables
- Implement request rate limiting
- Validate all inputs before processing
- Monitor costs and usage

### Common Gotchas to Avoid
- Don't store binary files in database (use storage)
- Don't expose Supabase service keys client-side
- Don't process files > 100MB without streaming
- Don't forget to clean up temporary files
- Always implement proper error boundaries
- Consider Indonesian language models for OCR

---

## GitHub Repository Links

### Next.js File Upload
- [Next.js Server Actions Examples](https://github.com/vercel/next.js/tree/canary/examples/next-forms)
- [TUS Upload Implementation](https://github.com/tus/tus-js-client)

### PDF Processing
- [pdf-parse](https://github.com/modesty/pdf-parse)
- [pdf.js-extract](https://github.com/ffalt/pdf.js-extract)
- [Tesseract.js](https://github.com/naptha/tesseract.js)

### Document Diffing
- [jsdiff](https://github.com/kpdecker/jsdiff) - 4.3k stars, actively maintained
- [diff-match-patch](https://github.com/google/diff-match-patch) - Google's library
- [json-diff-ts](https://github.com/ltwlf/json-diff-ts) - Modern TypeScript solution

### AI/ML Integration
- [OpenAI Node.js](https://github.com/openai/openai-node)
- [Supabase AI Examples](https://github.com/supabase-community/chatgpt-your-files)
- [LangChain.js](https://github.com/langchain-ai/langchainjs)

This research provides production-ready patterns for implementing Open-LegisAI Lite with optimal performance and security considerations for Indonesian legal document processing.