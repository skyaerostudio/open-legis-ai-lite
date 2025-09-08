import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export interface ClauseSegment {
  clause_ref?: string;
  text: string;
  page_from?: number;
  page_to?: number;
  clause_type?: 'bab' | 'bagian' | 'paragraf' | 'pasal' | 'ayat' | 'huruf' | 'angka' | 'general';
  sequence_order?: number;
}

export interface ProcessingResult {
  segments: ClauseSegment[];
  metadata: {
    total_pages: number;
    text_length: number;
    processing_method: 'pdf-parse' | 'ocr';
    language_detected?: string;
    ocr_confidence?: number;
    processing_duration?: number;
  };
}

export interface LegalCitation {
  title: string;
  type: string;
  number?: string;
  year?: string;
  access_date: string;
}

/**
 * Normalize Indonesian text to fix common PDF extraction issues
 */
function normalizeIndonesianText(text: string): string {
  return text
    // Fix common PDF encoding issues
    .replace(/â€™/g, "'")      // Smart apostrophe
    .replace(/â€œ/g, '"')      // Left smart quote
    .replace(/â€\u009d/g, '"') // Right smart quote  
    .replace(/â€"/g, '–')      // En dash
    .replace(/â€"/g, '—')      // Em dash
    
    // Fix Indonesian-specific character issues
    .replace(/\u00C0/g, 'À')   // À
    .replace(/\u00C1/g, 'Á')   // Á
    .replace(/\u00C9/g, 'É')   // É
    .replace(/\u00CD/g, 'Í')   // Í
    .replace(/\u00D3/g, 'Ó')   // Ó
    .replace(/\u00DA/g, 'Ú')   // Ú
    
    // Normalize whitespace
    .replace(/\r\n/g, '\n')    // Windows line endings
    .replace(/\r/g, '\n')      // Mac line endings
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple empty lines
    .replace(/[ \t]+/g, ' ')   // Multiple spaces/tabs
    .replace(/^\s+|\s+$/gm, '') // Trim leading/trailing whitespace per line
    
    // Fix common legal document formatting
    .replace(/(\d+)\s*\.\s*([A-Z])/g, '$1. $2') // Number + period spacing
    .replace(/([a-z])\s*\.\s*([A-Z])/g, '$1. $2') // Letter + period spacing
    .replace(/\(\s*(\d+)\s*\)/g, '($1)')         // Parentheses spacing
    
    // Normalize Indonesian legal terms
    .replace(/\bUndang[- ]?undang\b/gi, 'Undang-undang')
    .replace(/\bPeraturan\s+Pemerintah\b/gi, 'Peraturan Pemerintah')
    .replace(/\bKeputusan\s+Presiden\b/gi, 'Keputusan Presiden')
    .replace(/\bInstruksi\s+Presiden\b/gi, 'Instruksi Presiden');
}

/**
 * Enhanced check for readable Indonesian legal content
 */
function hasReadableIndonesianContent(text: string): boolean {
  // Check for reasonable ratio of letters to total characters
  const letters = text.match(/[a-zA-ZÀ-ÿ]/g)?.length || 0;
  const ratio = letters / text.length;
  
  // Extended Indonesian legal document indicators
  const legalIndicators = [
    'pasal', 'ayat', 'huruf', 'angka', 'bagian', 'bab', 'paragraf',
    'undang-undang', 'peraturan', 'keputusan', 'instruksi',
    'republik indonesia', 'presiden', 'menteri',
    'dewan perwakilan rakyat', 'mahkamah', 'pemerintah',
    'ditetapkan', 'berlaku', 'diberlakukan', 'dicabut'
  ];
  
  const lowerText = text.toLowerCase();
  const foundTerms = legalIndicators.filter(term => lowerText.includes(term));
  
  // Check for legal document structure patterns
  const hasLegalStructure = /\b(pasal|ayat|huruf|bab)\s+\d+/i.test(text) ||
                           /\((\d+)\)/.test(text) ||
                           /\b[a-z]\./i.test(text);
  
  // Require either good character ratio OR multiple legal terms OR clear legal structure
  return ratio > 0.6 || foundTerms.length >= 3 || hasLegalStructure;
}

/**
 * Extract text from PDF buffer with Indonesian language support
 * Falls back to OCR if text-based extraction yields poor results
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Try pdf-parse first (fastest for text-based PDFs)
    console.log('Attempting text-based PDF extraction...');
    const pdfData = await pdf(buffer);
    
    // Normalize and clean extracted text
    const rawText = pdfData.text || '';
    const normalizedText = normalizeIndonesianText(rawText.trim());
    
    // Check if we got meaningful text using enhanced validation
    if (normalizedText.length > 100 && hasReadableIndonesianContent(normalizedText)) {
      console.log(`Text extraction successful: ${normalizedText.length} characters from ${pdfData.numpages} pages`);
      
      const segments = segmentTextIntoLegalClauses(normalizedText, pdfData.numpages);
      const processingDuration = Date.now() - startTime;
      
      return {
        segments,
        metadata: {
          total_pages: pdfData.numpages,
          text_length: normalizedText.length,
          processing_method: 'pdf-parse',
          language_detected: 'indonesian',
          processing_duration: processingDuration
        }
      };
    }
    
    // Fallback to OCR for scanned documents
    console.log('Text-based extraction yielded poor results, attempting OCR...');
    return await extractWithIndonesianOCR(buffer, startTime);
    
  } catch (error) {
    console.error('PDF processing failed:', error);
    
    // Try OCR as final fallback if PDF parsing completely fails
    try {
      console.log('PDF parsing failed completely, attempting OCR fallback...');
      return await extractWithIndonesianOCR(buffer, startTime);
    } catch (ocrError) {
      console.error('OCR fallback also failed:', ocrError);
      throw new Error('Failed to process PDF document. The file may be corrupted, password-protected, or contain unreadable content.');
    }
  }
}


/**
 * Extract text using enhanced OCR with Indonesian language support
 */
async function extractWithIndonesianOCR(buffer: Buffer, startTime: number): Promise<ProcessingResult> {
  console.log('Initializing OCR worker with Indonesian language support...');
  
  // Use Indonesian language code with enhanced configuration
  const worker = await createWorker('ind', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  try {
    // Configure OCR for Indonesian legal documents
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789().,;:- ÀÁÉÍÓÚàáéíóú',
      preserve_interword_spaces: '1',
    });
    
    const { data: { text, confidence } } = await worker.recognize(buffer);
    await worker.terminate();
    
    console.log(`OCR completed: ${text.length} characters extracted with ${confidence}% confidence`);
    
    if (text.trim().length < 50) {
      throw new Error(`OCR extraction failed to produce meaningful text (only ${text.trim().length} characters)`);
    }
    
    if (confidence < 30) {
      console.warn(`Low OCR confidence: ${confidence}%. Results may be unreliable.`);
    }
    
    // Normalize OCR text and segment
    const normalizedText = normalizeIndonesianText(text);
    const segments = segmentTextIntoLegalClauses(normalizedText);
    const processingDuration = Date.now() - startTime;
    
    return {
      segments,
      metadata: {
        total_pages: 1, // OCR doesn't provide reliable page count
        text_length: normalizedText.length,
        processing_method: 'ocr',
        language_detected: 'indonesian',
        ocr_confidence: confidence,
        processing_duration: processingDuration
      }
    };
    
  } catch (error) {
    await worker.terminate();
    console.error('Enhanced OCR processing failed:', error);
    throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. The document may be corrupted, of poor quality, or contain unreadable text.`);
  }
}

/**
 * Segment extracted text into legal clauses using comprehensive Indonesian legal document patterns
 */
function segmentTextIntoLegalClauses(text: string, totalPages?: number): ClauseSegment[] {
  // Enhanced Indonesian legal document patterns (case-insensitive)
  const legalPatterns = {
    // Chapters: "BAB I", "BAB II", "BAB 1", etc.
    bab: /^BAB\s+([IVX]+|[A-Z]+|[0-9]+)\s*(?:\n|\r\n?)([^\n\r]+)/gim,
    
    // Sections: "BAGIAN Pertama", "BAGIAN I", "BAGIAN 1", etc.
    bagian: /^BAGIAN\s+([A-Z]+|[IVX]+|[0-9]+|Pertama|Kedua|Ketiga|Keempat|Kelima)\s*(?:\n|\r\n?)([^\n\r]+)/gim,
    
    // Paragraphs: "Paragraf 1", "Paragraf I", etc.
    paragraf: /^Paragraf\s+([0-9]+|[IVX]+)\s*(?:\n|\r\n?)([^\n\r]+)/gim,
    
    // Articles: "Pasal 1", "Pasal 2a", "Pasal 123bis", etc.
    pasal: /^Pasal\s+(\d+[a-zA-Z]*(?:\s+bis|\s+ter)?)\s*(?:\n|\r\n?)/gim,
    
    // Paragraphs within articles: "(1)", "(2)", etc.
    ayat: /^\s*\((\d+)\)\s+/gim,
    
    // Points: "a.", "b.", "huruf a.", etc.
    huruf: /^\s*(?:huruf\s+)?([a-z])\.\s+/gim,
    
    // Numbers: "1)", "2)", "angka 1)", etc.
    angka: /^\s*(?:angka\s+)?(\d+)\)\s+/gim
  };

  const segments: ClauseSegment[] = [];
  let sequenceOrder = 0;
  
  // Split text into lines and clean up
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const textContent = lines.join('\n');
  
  // Process hierarchical structure
  
  // 1. Extract chapters (BAB)
  const babMatches = Array.from(textContent.matchAll(legalPatterns.bab));
  for (const match of babMatches) {
    segments.push({
      clause_ref: `BAB ${match[1]}`,
      clause_type: 'bab',
      text: `BAB ${match[1]} - ${match[2]}`.trim(),
      sequence_order: sequenceOrder++,
      page_from: estimatePageFromIndex(match.index!, textContent, totalPages),
    });
  }
  
  // 2. Extract sections (BAGIAN)
  const bagianMatches = Array.from(textContent.matchAll(legalPatterns.bagian));
  for (const match of bagianMatches) {
    segments.push({
      clause_ref: `BAGIAN ${match[1]}`,
      clause_type: 'bagian',
      text: `BAGIAN ${match[1]} - ${match[2]}`.trim(),
      sequence_order: sequenceOrder++,
      page_from: estimatePageFromIndex(match.index!, textContent, totalPages),
    });
  }
  
  // 3. Extract paragraphs (Paragraf)
  const paragrafMatches = Array.from(textContent.matchAll(legalPatterns.paragraf));
  for (const match of paragrafMatches) {
    segments.push({
      clause_ref: `Paragraf ${match[1]}`,
      clause_type: 'paragraf',
      text: `Paragraf ${match[1]} - ${match[2]}`.trim(),
      sequence_order: sequenceOrder++,
      page_from: estimatePageFromIndex(match.index!, textContent, totalPages),
    });
  }
  
  // 4. Extract articles (Pasal) with their content
  const pasalMatches = Array.from(textContent.matchAll(legalPatterns.pasal));
  for (let i = 0; i < pasalMatches.length; i++) {
    const pasalMatch = pasalMatches[i];
    const pasalNumber = pasalMatch[1];
    
    // Find the end of this article (next Pasal or end of text)
    const nextPasalIndex = i < pasalMatches.length - 1 ? pasalMatches[i + 1].index! : textContent.length;
    const pasalContent = textContent.substring(pasalMatch.index!, nextPasalIndex).trim();
    
    // Extract main article content (everything except nested ayat/huruf)
    const mainContent = pasalContent.split(/\n\s*\(\d+\)/)[0].trim();
    
    segments.push({
      clause_ref: `Pasal ${pasalNumber}`,
      clause_type: 'pasal',
      text: mainContent,
      sequence_order: sequenceOrder++,
      page_from: estimatePageFromIndex(pasalMatch.index!, textContent, totalPages),
    });
    
    // Extract paragraphs (Ayat) within this article
    const ayatMatches = Array.from(pasalContent.matchAll(legalPatterns.ayat));
    for (const ayatMatch of ayatMatches) {
      const ayatNumber = ayatMatch[1];
      
      // Find ayat content (up to next ayat or end)
      const ayatStart = ayatMatch.index! + ayatMatch[0].length;
      const nextAyatMatch = ayatMatches.find(m => m.index! > ayatMatch.index!);
      const ayatEnd = nextAyatMatch ? nextAyatMatch.index! : pasalContent.length;
      const ayatContent = pasalContent.substring(ayatStart, ayatEnd).trim();
      
      if (ayatContent.length > 10) {
        segments.push({
          clause_ref: `Pasal ${pasalNumber} Ayat (${ayatNumber})`,
          clause_type: 'ayat',
          text: ayatContent,
          sequence_order: sequenceOrder++,
          page_from: estimatePageFromIndex(pasalMatch.index! + ayatMatch.index!, textContent, totalPages),
        });
        
        // Extract points (Huruf) within this paragraph
        const hurufMatches = Array.from(ayatContent.matchAll(legalPatterns.huruf));
        for (const hurufMatch of hurufMatches) {
          const hurufLetter = hurufMatch[1];
          
          // Find huruf content
          const hurufStart = hurufMatch.index! + hurufMatch[0].length;
          const nextHurufMatch = hurufMatches.find(m => m.index! > hurufMatch.index!);
          const hurufEnd = nextHurufMatch ? nextHurufMatch.index! : ayatContent.length;
          const hurufContent = ayatContent.substring(hurufStart, hurufEnd).trim();
          
          if (hurufContent.length > 5) {
            segments.push({
              clause_ref: `Pasal ${pasalNumber} Ayat (${ayatNumber}) Huruf ${hurufLetter}`,
              clause_type: 'huruf',
              text: hurufContent,
              sequence_order: sequenceOrder++,
            });
          }
        }
      }
    }
  }
  
  // Filter out very short segments and segments with only formatting
  const filteredSegments = segments.filter(segment => {
    const cleanText = segment.text.replace(/[^a-zA-Z\s]/g, '').trim();
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 2).length;
    return wordCount >= 3; // At least 3 meaningful words
  });
  
  console.log(`Enhanced segmentation complete: ${filteredSegments.length} clauses identified from ${lines.length} lines`);
  
  // If no structured clauses found, try simple paragraph-based segmentation
  if (filteredSegments.length === 0 && text.trim().length > 0) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    return paragraphs.map((paragraph, index) => ({
      text: paragraph.trim(),
      clause_type: 'general' as const,
      sequence_order: index,
      page_from: estimatePageNumber(index, paragraphs.length, totalPages),
      page_to: estimatePageNumber(index, paragraphs.length, totalPages)
    }));
  }
  
  return filteredSegments;
}

/**
 * Estimate page number based on character position in text
 */
function estimatePageFromIndex(charIndex: number, fullText: string, totalPages?: number): number {
  if (!totalPages || totalPages === 0) return 1;
  
  const ratio = charIndex / fullText.length;
  const estimatedPage = Math.max(1, Math.ceil(ratio * totalPages));
  
  return Math.min(estimatedPage, totalPages);
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
 * Validate and clean text before processing with Indonesian-specific normalization
 */
export function validateAndCleanText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input');
  }
  
  // Apply Indonesian normalization
  const normalized = normalizeIndonesianText(text);
  
  if (normalized.length === 0) {
    throw new Error('Text input is empty after normalization');
  }
  
  if (normalized.length < 10) {
    throw new Error('Text input is too short to be a meaningful document');
  }
  
  return normalized;
}

/**
 * Extract and normalize Indonesian legal citations from text
 */
export function extractLegalCitations(text: string): LegalCitation[] {
  const citations: LegalCitation[] = [];
  
  // Pattern for Indonesian legal citations
  const citationPatterns = [
    // Undang-undang format: "UU No. 123 Tahun 2023"
    /(?:Undang[- ]?undang|UU)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
    // Peraturan Pemerintah: "PP No. 123 Tahun 2023"
    /(?:Peraturan\s+Pemerintah|PP)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
    // Keputusan Presiden: "Keppres No. 123 Tahun 2023"
    /(?:Keputusan\s+Presiden|Keppres)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
    // Instruksi Presiden: "Inpres No. 123 Tahun 2023"
    /(?:Instruksi\s+Presiden|Inpres)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
  ];
  
  citationPatterns.forEach(pattern => {
    const matches = Array.from(text.matchAll(pattern));
    matches.forEach(match => {
      citations.push({
        title: match[0],
        type: extractCitationType(match[0]),
        number: match[1],
        year: match[2],
        access_date: new Date().toISOString(),
      });
    });
  });
  
  // Remove duplicates based on title
  const uniqueCitations = citations.filter((citation, index, arr) => 
    arr.findIndex(c => c.title.toLowerCase() === citation.title.toLowerCase()) === index
  );
  
  return uniqueCitations;
}

/**
 * Extract citation type from citation text
 */
function extractCitationType(citation: string): string {
  const lower = citation.toLowerCase();
  if (/undang[- ]?undang|\buu\b/i.test(lower)) return 'undang-undang';
  if (/peraturan\s+pemerintah|\bpp\b/i.test(lower)) return 'peraturan-pemerintah';
  if (/keputusan\s+presiden|keppres/i.test(lower)) return 'keputusan-presiden';
  if (/instruksi\s+presiden|inpres/i.test(lower)) return 'instruksi-presiden';
  if (/peraturan\s+menteri/i.test(lower)) return 'peraturan-menteri';
  if (/peraturan\s+daerah|perda/i.test(lower)) return 'peraturan-daerah';
  return 'unknown';
}

/**
 * Get comprehensive processing statistics for debugging and monitoring
 */
export function getProcessingStats(result: ProcessingResult): {
  segments_count: number;
  avg_segment_length: number;
  total_words: number;
  clauses_with_refs: number;
  clause_types: Record<string, number>;
  processing_quality_score: number;
  citations_found?: number;
} {
  const segments = result.segments;
  const totalWords = segments.reduce((sum, seg) => 
    sum + seg.text.split(/\s+/).length, 0);
  
  const avgLength = segments.length > 0 
    ? Math.round(totalWords / segments.length) 
    : 0;
  
  const clausesWithRefs = segments.filter(seg => seg.clause_ref).length;
  
  // Count clause types
  const clauseTypes: Record<string, number> = {};
  segments.forEach(seg => {
    const type = seg.clause_type || 'unknown';
    clauseTypes[type] = (clauseTypes[type] || 0) + 1;
  });
  
  // Calculate processing quality score (0-100)
  let qualityScore = 0;
  if (segments.length > 0) {
    const structuredRatio = clausesWithRefs / segments.length;
    const avgWordsPerSegment = totalWords / segments.length;
    const hasLegalStructure = Object.keys(clauseTypes).some(type => 
      ['bab', 'bagian', 'pasal', 'ayat'].includes(type));
    
    qualityScore = Math.min(100, Math.round(
      (structuredRatio * 40) +           // 40% for structured clauses
      (Math.min(avgWordsPerSegment / 50, 1) * 30) + // 30% for reasonable segment length
      (hasLegalStructure ? 30 : 10)      // 30% for legal structure presence
    ));
  }
  
  // Count citations if available
  const fullText = segments.map(s => s.text).join(' ');
  const citations = extractLegalCitations(fullText);
  
  return {
    segments_count: segments.length,
    avg_segment_length: avgLength,
    total_words: totalWords,
    clauses_with_refs: clausesWithRefs,
    clause_types: clauseTypes,
    processing_quality_score: qualityScore,
    citations_found: citations.length
  };
}

/**
 * Check if document appears to be a valid Indonesian legal document
 */
export function validateIndonesianLegalDocument(text: string): {
  is_valid: boolean;
  confidence: number;
  issues: string[];
} {
  const issues: string[] = [];
  let confidence = 0;
  
  // Check minimum length
  if (text.length < 500) {
    issues.push('Document is too short for a legal document');
  } else {
    confidence += 20;
  }
  
  // Check for legal terminology
  const legalTerms = ['pasal', 'ayat', 'undang-undang', 'peraturan', 'republik indonesia'];
  const foundTerms = legalTerms.filter(term => text.toLowerCase().includes(term));
  
  if (foundTerms.length < 2) {
    issues.push('Insufficient legal terminology found');
  } else {
    confidence += Math.min(foundTerms.length * 15, 40);
  }
  
  // Check for legal document structure
  const hasArticles = /pasal\s+\d+/i.test(text);
  const hasParagraphs = /\(\d+\)/.test(text);
  const hasChapters = /bab\s+[ivx\d]+/i.test(text);
  
  if (hasArticles) confidence += 20;
  if (hasParagraphs) confidence += 10;
  if (hasChapters) confidence += 10;
  
  if (!hasArticles && !hasParagraphs) {
    issues.push('No clear legal document structure detected');
  }
  
  const isValid = issues.length === 0 && confidence >= 50;
  
  return {
    is_valid: isValid,
    confidence: Math.min(confidence, 100),
    issues
  };
}