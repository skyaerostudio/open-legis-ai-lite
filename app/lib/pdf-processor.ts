import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export interface ClauseSegment {
  clause_ref?: string;
  text: string;
  page_from?: number;
  page_to?: number;
}

export interface ProcessingResult {
  segments: ClauseSegment[];
  metadata: {
    total_pages: number;
    text_length: number;
    processing_method: 'pdf-parse' | 'ocr';
    language_detected?: string;
  };
}

/**
 * Extract text from PDF buffer with Indonesian language support
 * Falls back to OCR if text-based extraction yields poor results
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ProcessingResult> {
  try {
    // Try pdf-parse first (fastest for text-based PDFs)
    console.log('Attempting text-based PDF extraction...');
    const pdfData = await pdf(buffer);
    
    // Check if we got meaningful text (more than 100 chars, not just whitespace/junk)
    const cleanText = pdfData.text.trim();
    if (cleanText.length > 100 && hasReadableContent(cleanText)) {
      console.log(`Text extraction successful: ${cleanText.length} characters from ${pdfData.numpages} pages`);
      
      const segments = segmentTextIntoClauses(cleanText, pdfData.numpages);
      return {
        segments,
        metadata: {
          total_pages: pdfData.numpages,
          text_length: cleanText.length,
          processing_method: 'pdf-parse'
        }
      };
    }
    
    // Fallback to OCR for scanned documents
    console.log('Text-based extraction yielded poor results, attempting OCR...');
    return await extractWithOCR(buffer);
    
  } catch (error) {
    console.error('PDF processing failed:', error);
    throw new Error('Failed to process PDF document. Please ensure the file is a valid PDF.');
  }
}

/**
 * Check if extracted text contains readable content (not just extraction artifacts)
 */
function hasReadableContent(text: string): boolean {
  // Check for reasonable ratio of letters to total characters
  const letters = text.match(/[a-zA-Z]/g)?.length || 0;
  const ratio = letters / text.length;
  
  // Check for Indonesian legal document indicators
  const legalIndicators = [
    'pasal', 'ayat', 'huruf', 'bagian', 'bab', 'undang-undang', 
    'peraturan', 'keputusan', 'republik indonesia'
  ];
  
  const hasLegalContent = legalIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );
  
  return ratio > 0.6 || hasLegalContent;
}

/**
 * Extract text using OCR with Indonesian language support
 */
async function extractWithOCR(buffer: Buffer): Promise<ProcessingResult> {
  console.log('Initializing OCR worker with Indonesian language support...');
  
  // Use Indonesian language code for better accuracy with legal documents
  const worker = await createWorker('ind', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  try {
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    
    console.log(`OCR completed: ${text.length} characters extracted`);
    
    if (text.trim().length < 50) {
      throw new Error('OCR extraction failed to produce meaningful text');
    }
    
    const segments = segmentTextIntoClauses(text);
    return {
      segments,
      metadata: {
        total_pages: 1, // OCR doesn't provide reliable page count
        text_length: text.length,
        processing_method: 'ocr',
        language_detected: 'indonesian'
      }
    };
    
  } catch (error) {
    await worker.terminate();
    console.error('OCR processing failed:', error);
    throw new Error('OCR extraction failed. The document may be corrupted or contain unreadable text.');
  }
}

/**
 * Segment extracted text into legal clauses using Indonesian legal document patterns
 */
function segmentTextIntoClauses(text: string, totalPages?: number): ClauseSegment[] {
  // Indonesian legal document patterns (case-insensitive)
  const clausePatterns = [
    // Articles: "Pasal 1", "Pasal 2a", etc.
    /^Pasal\s+([\d]+[a-zA-Z]*)/gim,
    
    // Paragraphs: "Ayat (1)", "Ayat (2)", etc.
    /^Ayat\s*\(([\d]+)\)/gim,
    
    // Points: "Huruf a.", "Huruf b.", etc.
    /^Huruf\s+([a-z])\.?/gim,
    
    // Sections: "Bagian I", "Bagian Kedua", etc.
    /^Bagian\s+([IVX]+|[A-Z][a-z]+)/gim,
    
    // Chapters: "Bab I", "Bab II", etc.
    /^Bab\s+([IVX]+|[A-Z]+)/gim,
    
    // General numbered items: "1.", "2.", etc. (but not stand-alone)
    /^(\d+)\.?\s+(?=[A-Z])/gm
  ];
  
  const segments: ClauseSegment[] = [];
  
  // Split text into lines and clean up
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  let currentClause = '';
  let currentText = '';
  let currentPageFrom: number | undefined;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line starts with a clause marker
    let isClauseStart = false;
    let clauseRef = '';
    
    for (const pattern of clausePatterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(line);
      
      if (match && match.index === 0) {
        isClauseStart = true;
        clauseRef = line;
        break;
      }
    }
    
    if (isClauseStart) {
      // Save previous segment if it exists
      if (currentText.trim()) {
        segments.push({
          clause_ref: currentClause || undefined,
          text: currentText.trim(),
          page_from: currentPageFrom,
          page_to: estimatePageNumber(i, lines.length, totalPages)
        });
      }
      
      // Start new segment
      currentClause = clauseRef;
      currentText = line + '\n';
      currentPageFrom = estimatePageNumber(i, lines.length, totalPages);
      
    } else {
      // Add to current segment
      currentText += line + '\n';
    }
  }
  
  // Add final segment
  if (currentText.trim()) {
    segments.push({
      clause_ref: currentClause || undefined,
      text: currentText.trim(),
      page_from: currentPageFrom,
      page_to: estimatePageNumber(lines.length - 1, lines.length, totalPages)
    });
  }
  
  // Filter out very short segments (likely extraction artifacts)
  const filteredSegments = segments.filter(segment => {
    const wordCount = segment.text.split(/\s+/).length;
    return wordCount >= 5; // At least 5 words
  });
  
  console.log(`Segmentation complete: ${filteredSegments.length} clauses identified from ${lines.length} lines`);
  
  // If no clause patterns found, create one segment for the entire text
  if (filteredSegments.length === 0 && text.trim().length > 0) {
    return [{
      text: text.trim(),
      page_from: 1,
      page_to: totalPages
    }];
  }
  
  return filteredSegments;
}

/**
 * Estimate page number based on line position (rough approximation)
 */
function estimatePageNumber(lineIndex: number, totalLines: number, totalPages?: number): number {
  if (!totalPages || totalPages === 0) return 1;
  
  const ratio = lineIndex / totalLines;
  const estimatedPage = Math.max(1, Math.ceil(ratio * totalPages));
  
  return Math.min(estimatedPage, totalPages);
}

/**
 * Validate and clean text before processing
 */
export function validateAndCleanText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input');
  }
  
  // Remove excessive whitespace while preserving paragraph breaks
  const cleaned = text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')      // Limit consecutive newlines to 2
    .replace(/[ \t]+/g, ' ')         // Normalize spaces and tabs
    .trim();
  
  if (cleaned.length === 0) {
    throw new Error('Text input is empty after cleaning');
  }
  
  return cleaned;
}

/**
 * Get processing statistics for debugging and monitoring
 */
export function getProcessingStats(result: ProcessingResult): {
  segments_count: number;
  avg_segment_length: number;
  total_words: number;
  clauses_with_refs: number;
} {
  const segments = result.segments;
  const totalWords = segments.reduce((sum, seg) => 
    sum + seg.text.split(/\s+/).length, 0);
  
  const avgLength = segments.length > 0 
    ? Math.round(totalWords / segments.length) 
    : 0;
  
  const clausesWithRefs = segments.filter(seg => seg.clause_ref).length;
  
  return {
    segments_count: segments.length,
    avg_segment_length: avgLength,
    total_words: totalWords,
    clauses_with_refs: clausesWithRefs
  };
}