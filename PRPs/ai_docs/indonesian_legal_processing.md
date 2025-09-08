# Indonesian Legal Document Processing Patterns

## Document Structure Recognition

### Indonesian Legal Hierarchy Patterns

**PATTERN**: Parse legal documents using Indonesian legal structure (BAB, Pasal, Ayat, Huruf).

```typescript
// app/lib/pdf-processor.ts
export class IndonesianLegalParser {
  private readonly patterns = {
    bab: /BAB\s+([IVX]+|[A-Z]+|[0-9]+)\s*(?:\n|\r\n?)([^\n\r]+)/gi,
    bagian: /BAGIAN\s+([A-Z]+|[IVX]+|[0-9]+)\s*(?:\n|\r\n?)([^\n\r]+)/gi,
    paragraf: /Paragraf\s+([0-9]+|[IVX]+)\s*(?:\n|\r\n?)([^\n\r]+)/gi,
    pasal: /Pasal\s+(\d+[a-z]*)\s*(?:\n|\r\n?)([\s\S]*?)(?=Pasal\s+\d+|BAB\s+|BAGIAN\s+|$)/gi,
    ayat: /\((\d+)\)\s*([^()]*?)(?=\(\d+\)|$)/gi,
    huruf: /([a-z])\.\s*([^a-z.]*?)(?=[a-z]\.|$)/gi,
    angka: /(\d+)\)\s*([^0-9)]*?)(?=\d+\)|$)/gi,
  };
  
  parseDocument(text: string): LegalClause[] {
    const clauses: LegalClause[] = [];
    let sequenceOrder = 0;
    
    // Extract chapters (BAB)
    const babMatches = Array.from(text.matchAll(this.patterns.bab));
    for (const match of babMatches) {
      clauses.push({
        clause_ref: `BAB ${match[1]}`,
        clause_type: 'bab',
        text: `${match[2]}`.trim(),
        sequence_order: sequenceOrder++,
        page_from: this.extractPageNumber(match.index, text),
      });
    }
    
    // Extract articles (Pasal) with nested structure
    const pasalMatches = Array.from(text.matchAll(this.patterns.pasal));
    for (const pasalMatch of pasalMatches) {
      const pasalNumber = pasalMatch[1];
      const pasalContent = pasalMatch[2].trim();
      
      // Add the main article
      clauses.push({
        clause_ref: `Pasal ${pasalNumber}`,
        clause_type: 'pasal',
        text: pasalContent,
        sequence_order: sequenceOrder++,
        page_from: this.extractPageNumber(pasalMatch.index, text),
      });
      
      // Extract paragraphs (Ayat) within this article
      const ayatMatches = Array.from(pasalContent.matchAll(this.patterns.ayat));
      for (const ayatMatch of ayatMatches) {
        const ayatNumber = ayatMatch[1];
        const ayatContent = ayatMatch[2].trim();
        
        clauses.push({
          clause_ref: `Pasal ${pasalNumber} Ayat (${ayatNumber})`,
          clause_type: 'ayat',
          text: ayatContent,
          sequence_order: sequenceOrder++,
          page_from: this.extractPageNumber(ayatMatch.index + pasalMatch.index, text),
        });
        
        // Extract points (Huruf) within this paragraph
        const hurufMatches = Array.from(ayatContent.matchAll(this.patterns.huruf));
        for (const hurufMatch of hurufMatches) {
          const hurufLetter = hurufMatch[1];
          const hurufContent = hurufMatch[2].trim();
          
          if (hurufContent.length > 10) {
            clauses.push({
              clause_ref: `Pasal ${pasalNumber} Ayat (${ayatNumber}) Huruf ${hurufLetter}`,
              clause_type: 'huruf',
              text: hurufContent,
              sequence_order: sequenceOrder++,
            });
          }
        }
      }
    }
    
    return clauses.filter(clause => clause.text.length > 10);
  }
}
```

**GOTCHAS**:
- Legal document formatting varies between institutions
- Some documents use Roman numerals (I, II, III), others use Arabic (1, 2, 3)
- Nested structure requires careful regex to avoid overlapping matches
- Always validate extracted content length to avoid empty clauses

### Text Normalization for Indonesian Content

**PATTERN**: Fix common PDF extraction issues specific to Indonesian text.

```typescript
// app/lib/text-normalizer.ts
export class IndonesianTextNormalizer {
  normalize(text: string): string {
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
      .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
      
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
  
  // Extract and normalize citations
  normalizeCitations(text: string): LegalCitation[] {
    const citations: LegalCitation[] = [];
    
    // Pattern for Indonesian legal citations
    const citationPatterns = [
      // Undang-undang format: "UU No. 123 Tahun 2023"
      /(?:Undang[- ]?undang|UU)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
      // Peraturan Pemerintah: "PP No. 123 Tahun 2023"
      /(?:Peraturan\s+Pemerintah|PP)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
      // Keputusan Presiden: "Keppres No. 123 Tahun 2023"
      /(?:Keputusan\s+Presiden|Keppres)\s+(?:Nomor|No\.?)\s*(\d+)\s+Tahun\s+(\d{4})/gi,
    ];
    
    citationPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        citations.push({
          title: match[0],
          type: this.extractCitationType(match[0]),
          number: match[1],
          year: match[2],
          access_date: new Date().toISOString(),
        });
      });
    });
    
    return citations;
  }
  
  private extractCitationType(citation: string): string {
    if (/undang[- ]?undang|uu/i.test(citation)) return 'undang-undang';
    if (/peraturan\s+pemerintah|pp/i.test(citation)) return 'peraturan-pemerintah';
    if (/keputusan\s+presiden|keppres/i.test(citation)) return 'keputusan-presiden';
    if (/instruksi\s+presiden|inpres/i.test(citation)) return 'instruksi-presiden';
    return 'unknown';
  }
}
```

**GOTCHAS**:
- PDF extraction often mangles UTF-8 characters
- Indonesian legal documents use specific formatting conventions
- Citation formats vary between different legal document types
- Always test with real government documents, not synthetic examples

## OCR Processing for Scanned Documents

### Tesseract.js with Indonesian Language Support

**PATTERN**: Fallback to OCR when PDF text extraction fails.

```typescript
// app/lib/ocr-processor.ts
import { createWorker, Worker } from 'tesseract.js';

export class IndonesianOCRProcessor {
  private worker: Worker | null = null;
  
  async initialize() {
    if (this.worker) return;
    
    this.worker = await createWorker('ind', 1, {
      logger: m => console.log('OCR:', m),
    });
    
    // Configure for Indonesian legal documents
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789().,;:- àáéíóúÀÁÉÍÓÚ',
      tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
      preserve_interword_spaces: '1',
    });
  }
  
  async processScannedDocument(imagePath: string): Promise<string> {
    if (!this.worker) await this.initialize();
    
    try {
      const { data: { text, confidence } } = await this.worker!.recognize(imagePath);
      
      if (confidence < 50) {
        throw new Error(`OCR confidence too low: ${confidence}%`);
      }
      
      console.log(`OCR completed with ${confidence}% confidence`);
      return text;
      
    } catch (error) {
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }
  
  async processMultiPagePDF(pdfPath: string): Promise<string> {
    // Convert PDF pages to images first
    const pageImages = await this.convertPDFToImages(pdfPath);
    const pageTexts: string[] = [];
    
    for (let i = 0; i < pageImages.length; i++) {
      try {
        const text = await this.processScannedDocument(pageImages[i]);
        pageTexts.push(`--- PAGE ${i + 1} ---\n${text}`);
        
        // Update progress
        const progress = Math.round(((i + 1) / pageImages.length) * 100);
        console.log(`OCR progress: ${progress}%`);
        
      } catch (error) {
        console.warn(`Failed to OCR page ${i + 1}:`, error);
        pageTexts.push(`--- PAGE ${i + 1} (OCR FAILED) ---\n`);
      }
    }
    
    // Cleanup temp image files
    await Promise.all(pageImages.map(img => fs.unlink(img).catch(() => {})));
    
    return pageTexts.join('\n\n');
  }
  
  private async convertPDFToImages(pdfPath: string): Promise<string[]> {
    // Use pdf2pic or similar library to convert PDF pages to images
    // This is pseudocode - implement based on chosen library
    const pdf2pic = require('pdf2pic');
    
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 200,           // DPI for better OCR accuracy
      saveFilename: 'page',
      savePath: '/tmp/',
      format: 'png',
      width: 2000,           // High resolution for better OCR
      height: 3000,
    });
    
    const pages = await convert.bulk(-1); // Convert all pages
    return pages.map(page => page.path);
  }
  
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
```

**GOTCHAS**:
- OCR is significantly slower than text extraction (10-30x)
- Indonesian language pack must be loaded - 'ind' not 'id'
- High DPI (200+) required for good accuracy on legal documents
- Always cleanup Tesseract workers to prevent memory leaks

### Smart Fallback Logic

**PATTERN**: Try text extraction first, fallback to OCR only when needed.

```typescript
// app/lib/document-processor.ts
export class SmartDocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    try {
      // Primary method: Direct PDF text extraction
      const pdfBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      
      // Check if extraction was successful
      const extractedText = pdfData.text.trim();
      const wordCount = extractedText.split(/\s+/).length;
      const hasIndonesianLegalTerms = this.detectIndonesianLegalContent(extractedText);
      
      // Use extracted text if it looks valid
      if (wordCount > 50 && hasIndonesianLegalTerms) {
        console.log(`PDF text extraction successful: ${wordCount} words`);
        return extractedText;
      }
      
      console.log(`PDF text extraction insufficient: ${wordCount} words, falling back to OCR`);
      
    } catch (error) {
      console.log(`PDF text extraction failed: ${error.message}, falling back to OCR`);
    }
    
    // Fallback method: OCR processing
    const ocrProcessor = new IndonesianOCRProcessor();
    try {
      const ocrText = await ocrProcessor.processMultiPagePDF(filePath);
      return ocrText;
    } finally {
      await ocrProcessor.cleanup();
    }
  }
  
  private detectIndonesianLegalContent(text: string): boolean {
    const legalTerms = [
      'pasal', 'ayat', 'huruf', 'angka', 'bab',
      'undang-undang', 'peraturan', 'keputusan',
      'republik indonesia', 'presiden', 'menteri',
      'dewan perwakilan rakyat', 'mahkamah',
    ];
    
    const lowerText = text.toLowerCase();
    const foundTerms = legalTerms.filter(term => lowerText.includes(term));
    
    // Require at least 3 legal terms for validation
    return foundTerms.length >= 3;
  }
}
```

**GOTCHAS**:
- Some PDFs have text but it's garbled or incomplete
- Word count alone isn't sufficient - check for legal terminology
- OCR fallback adds 5-10x processing time
- Always cleanup OCR workers even if extraction succeeds

## Legal Content Analysis

### Indonesian Legal Glossary Generation

**PATTERN**: Extract and explain legal terms for public understanding.

```typescript
// app/lib/legal-glossary.ts
export class IndonesianLegalGlossary {
  private readonly legalTerms = new Map<string, string>([
    ['pasal', 'Bagian terkecil dalam undang-undang yang mengatur suatu hal spesifik'],
    ['ayat', 'Pembagian lebih lanjut dari pasal yang berisi aturan detail'],
    ['huruf', 'Poin-poin spesifik dalam ayat yang menjelaskan hal-hal tertentu'],
    ['bab', 'Pembagian besar dalam undang-undang yang mengatur topik tertentu'],
    ['bagian', 'Subdivisi dari bab yang mengatur aspek lebih spesifik'],
    ['paragraf', 'Pengelompokan pasal-pasal yang saling berkaitan'],
    ['undang-undang', 'Peraturan tertinggi yang dibuat oleh DPR bersama Presiden'],
    ['peraturan pemerintah', 'Peraturan yang dibuat Presiden untuk melaksanakan UU'],
    ['keputusan presiden', 'Keputusan yang bersifat penetapan (beschikking)'],
    ['instruksi presiden', 'Perintah Presiden kepada bawahan untuk melakukan sesuatu'],
    ['peraturan menteri', 'Peraturan yang dibuat menteri di bidangnya'],
    ['peraturan daerah', 'Peraturan yang dibuat DPRD bersama kepala daerah'],
    ['mahkamah konstitusi', 'Lembaga peradilan yang menguji UU terhadap UUD'],
    ['mahkamah agung', 'Lembaga peradilan tertinggi untuk peradilan umum'],
    ['dewan perwakilan rakyat', 'Lembaga legislatif yang mewakili rakyat Indonesia'],
  ]);
  
  extractGlossaryFromText(text: string): Array<{ term: string; definition: string; context: string }> {
    const glossaryTerms: Array<{ term: string; definition: string; context: string }> = [];
    const lowerText = text.toLowerCase();
    
    this.legalTerms.forEach((definition, term) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = Array.from(text.matchAll(regex));
      
      if (matches.length > 0) {
        // Find context for the first occurrence
        const firstMatch = matches[0];
        const contextStart = Math.max(0, firstMatch.index! - 100);
        const contextEnd = Math.min(text.length, firstMatch.index! + term.length + 100);
        const context = text.substring(contextStart, contextEnd).trim();
        
        glossaryTerms.push({
          term: firstMatch[0], // Preserve original capitalization
          definition,
          context: `...${context}...`,
        });
      }
    });
    
    // Sort by frequency of occurrence
    return glossaryTerms.sort((a, b) => {
      const countA = (text.match(new RegExp(a.term, 'gi')) || []).length;
      const countB = (text.match(new RegExp(b.term, 'gi')) || []).length;
      return countB - countA;
    });
  }
  
  generateSimplifiedSummary(clauses: LegalClause[]): string {
    const mainPoints: string[] = [];
    
    // Extract key articles (Pasal)
    const articles = clauses.filter(c => c.clause_type === 'pasal');
    
    articles.forEach((article, index) => {
      const simplified = this.simplifyLegalText(article.text);
      if (simplified.length > 20) {
        mainPoints.push(`${index + 1}. ${simplified}`);
      }
    });
    
    return mainPoints.slice(0, 10).join('\n\n'); // Top 10 points
  }
  
  private simplifyLegalText(text: string): string {
    return text
      // Replace formal terms with simpler ones
      .replace(/\bditetapkan\b/gi, 'diputuskan')
      .replace(/\bmenyatakan\b/gi, 'mengatakan')
      .replace(/\bdengan ini\b/gi, '')
      .replace(/\badalah sebagai berikut\b/gi, 'yaitu:')
      .replace(/\btersebut\b/gi, 'itu')
      .replace(/\bdimaksud\b/gi, 'yang dimaksud')
      
      // Simplify sentence structure
      .replace(/\byang mana\b/gi, 'yang')
      .replace(/\bhal-hal yang berkaitan dengan\b/gi, 'tentang')
      .replace(/\bdalam rangka\b/gi, 'untuk')
      
      // Remove excessive formality
      .replace(/\bdengan hormat\b/gi, '')
      .replace(/\byang terhormat\b/gi, '')
      .replace(/\byang mulia\b/gi, '');
  }
}
```

**GOTCHAS**:
- Legal terminology must be explained in plain Indonesian
- Context is crucial for understanding legal terms
- Avoid over-simplification that changes meaning
- Different legal document types have different terminology patterns

### Conflict Detection Patterns

**PATTERN**: Identify potential conflicts between legal documents.

```typescript
// app/lib/conflict-detector.ts
export class LegalConflictDetector {
  detectConflicts(newClauses: LegalClause[], existingLaws: LegalDocument[]): ConflictFlag[] {
    const conflicts: ConflictFlag[] = [];
    
    newClauses.forEach(clause => {
      existingLaws.forEach(existingLaw => {
        const potentialConflicts = this.findSemanticConflicts(clause, existingLaw);
        conflicts.push(...potentialConflicts);
      });
    });
    
    // Sort by confidence score (highest first)
    return conflicts.sort((a, b) => b.confidence_score - a.confidence_score);
  }
  
  private findSemanticConflicts(newClause: LegalClause, existingLaw: LegalDocument): ConflictFlag[] {
    const conflicts: ConflictFlag[] = [];
    
    // Check for contradictions
    const contradictions = this.detectContradictions(newClause.text, existingLaw.clauses);
    contradictions.forEach(conflict => {
      conflicts.push({
        conflict_type: 'contradiction',
        excerpt_original: newClause.text,
        excerpt_conflicting: conflict.text,
        overlap_score: conflict.similarity,
        confidence_score: this.calculateConfidence(conflict),
        explanation: this.generateExplanation('contradiction', newClause, conflict),
      });
    });
    
    // Check for overlapping jurisdictions
    const overlaps = this.detectJurisdictionOverlaps(newClause, existingLaw);
    overlaps.forEach(overlap => {
      conflicts.push({
        conflict_type: 'overlap',
        excerpt_original: newClause.text,
        excerpt_conflicting: overlap.text,
        overlap_score: overlap.similarity,
        confidence_score: this.calculateConfidence(overlap),
        explanation: this.generateExplanation('overlap', newClause, overlap),
      });
    });
    
    return conflicts;
  }
  
  private detectContradictions(newText: string, existingClauses: LegalClause[]): Array<{ text: string; similarity: number }> {
    const contradictions: Array<{ text: string; similarity: number }> = [];
    
    // Keywords that often indicate contradictions
    const contradictionPatterns = [
      /tidak\s+boleh.*(?:boleh|dapat|diperkenankan)/i,
      /dilarang.*(?:diizinkan|diperbolehkan)/i,
      /wajib.*(?:tidak\s+wajib|bebas|opsional)/i,
      /maksimal.*melebihi/i,
      /minimal.*kurang\s+dari/i,
    ];
    
    existingClauses.forEach(existingClause => {
      // Use semantic similarity to find related clauses
      const similarity = this.calculateSemanticSimilarity(newText, existingClause.text);
      
      if (similarity > 0.7) { // High similarity threshold
        // Check for contradiction patterns
        const hasContradiction = contradictionPatterns.some(pattern => {
          return pattern.test(newText + ' ' + existingClause.text);
        });
        
        if (hasContradiction) {
          contradictions.push({
            text: existingClause.text,
            similarity,
          });
        }
      }
    });
    
    return contradictions;
  }
  
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // This would use embedding vectors in real implementation
    // For now, use simple keyword matching
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }
  
  private generateExplanation(conflictType: string, newClause: LegalClause, existingClause: any): string {
    switch (conflictType) {
      case 'contradiction':
        return `Pasal ini tampaknya bertentangan dengan aturan yang sudah ada. Terdapat perbedaan dalam hal pengaturan yang sama, yang dapat menyebabkan kebingungan dalam implementasi.`;
      
      case 'overlap':
        return `Terdapat tumpang tindih kewenangan atau ruang lingkup pengaturan dengan peraturan yang sudah ada. Ini dapat menyebabkan ketidakjelasan tentang aturan mana yang berlaku.`;
      
      default:
        return `Ditemukan potensi konflik dengan peraturan yang sudah ada yang memerlukan kajian lebih lanjut.`;
    }
  }
}
```

**GOTCHAS**:
- Semantic similarity requires embeddings for accurate results
- Legal conflicts are complex and context-dependent
- False positives are common without domain expertise
- Always provide clear explanations in Indonesian for public understanding