import { diffWords, diffSentences, diffLines, Change } from 'diff';
import { calculateCosineSimilarity } from '@/lib/embeddings';

export interface ClauseChange {
  clause_ref?: string;
  change_kind: 'added' | 'deleted' | 'modified' | 'moved';
  old_text?: string;
  new_text?: string;
  similarity_score?: number;
  page_from?: number;
  page_to?: number;
  word_changes?: Change[];
  sentence_changes?: Change[];
  significance_level: 'major' | 'minor' | 'cosmetic';
  explanation?: string;
}

export interface DiffResult {
  version_from: string;
  version_to: string;
  changes: ClauseChange[];
  summary: {
    total_changes: number;
    additions: number;
    deletions: number;
    modifications: number;
    major_changes: number;
    minor_changes: number;
  };
  metadata: {
    processing_time_ms: number;
    algorithm_version: string;
    confidence_score: number;
  };
}

export interface DocumentVersion {
  id: string;
  version_label: string;
  clauses: Array<{
    id: string;
    clause_ref?: string;
    text: string;
    page_from?: number;
    page_to?: number;
  }>;
}

/**
 * Compare two document versions and generate a comprehensive diff
 */
export async function compareDocuments(
  versionFrom: DocumentVersion,
  versionTo: DocumentVersion,
  options: {
    similarity_threshold?: number;
    include_cosmetic_changes?: boolean;
    enable_semantic_analysis?: boolean;
  } = {}
): Promise<DiffResult> {
  const startTime = Date.now();
  
  const {
    similarity_threshold = 0.8,
    include_cosmetic_changes = false,
    enable_semantic_analysis = true
  } = options;

  console.log(`Comparing documents: ${versionFrom.version_label} → ${versionTo.version_label}`);
  
  const changes: ClauseChange[] = [];
  const processedFromClauses = new Set<string>();
  const processedToClauses = new Set<string>();

  // Step 1: Find exact matches and modifications
  for (const clauseFrom of versionFrom.clauses) {
    let bestMatch: { clause: any; similarity: number } | null = null;
    
    // Look for exact or similar clauses in the target version
    for (const clauseTo of versionTo.clauses) {
      if (processedToClauses.has(clauseTo.id)) continue;
      
      const similarity = calculateTextSimilarity(clauseFrom.text, clauseTo.text);
      
      // Exact match
      if (similarity === 1.0) {
        bestMatch = { clause: clauseTo, similarity };
        break;
      }
      
      // High similarity - potential modification
      if (similarity >= similarity_threshold && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { clause: clauseTo, similarity };
      }
    }

    if (bestMatch) {
      const { clause: matchedClause, similarity } = bestMatch;
      
      if (similarity === 1.0) {
        // Exact match - no change
        processedFromClauses.add(clauseFrom.id);
        processedToClauses.add(matchedClause.id);
      } else {
        // Modification detected
        const change = await analyzeModification(
          clauseFrom, 
          matchedClause, 
          similarity,
          enable_semantic_analysis
        );
        
        if (include_cosmetic_changes || change.significance_level !== 'cosmetic') {
          changes.push(change);
        }
        
        processedFromClauses.add(clauseFrom.id);
        processedToClauses.add(matchedClause.id);
      }
    } else {
      // No match found - clause was deleted
      changes.push({
        clause_ref: clauseFrom.clause_ref,
        change_kind: 'deleted',
        old_text: clauseFrom.text,
        page_from: clauseFrom.page_from,
        page_to: clauseFrom.page_to,
        significance_level: 'major',
        explanation: 'Clause removed from document'
      });
      
      processedFromClauses.add(clauseFrom.id);
    }
  }

  // Step 2: Find additions (clauses in 'to' version that weren't matched)
  for (const clauseTo of versionTo.clauses) {
    if (!processedToClauses.has(clauseTo.id)) {
      changes.push({
        clause_ref: clauseTo.clause_ref,
        change_kind: 'added',
        new_text: clauseTo.text,
        page_from: clauseTo.page_from,
        page_to: clauseTo.page_to,
        significance_level: 'major',
        explanation: 'New clause added to document'
      });
    }
  }

  // Step 3: Detect moved clauses (optional enhancement)
  await detectMovedClauses(changes, versionFrom, versionTo);

  // Step 4: Generate summary
  const summary = generateSummary(changes);
  
  const processingTime = Date.now() - startTime;
  
  console.log(`Diff completed: ${changes.length} changes found in ${processingTime}ms`);

  return {
    version_from: versionFrom.id,
    version_to: versionTo.id,
    changes,
    summary,
    metadata: {
      processing_time_ms: processingTime,
      algorithm_version: '1.0.0',
      confidence_score: calculateConfidenceScore(changes, versionFrom.clauses.length, versionTo.clauses.length)
    }
  };
}

/**
 * Analyze a modification between two similar clauses
 */
async function analyzeModification(
  clauseFrom: any,
  clauseTo: any,
  similarity: number,
  enableSemanticAnalysis: boolean
): Promise<ClauseChange> {
  // Generate word-level and sentence-level diffs
  const wordChanges = diffWords(clauseFrom.text, clauseTo.text);
  const sentenceChanges = diffSentences(clauseFrom.text, clauseTo.text);
  
  // Calculate significance level
  const significance = calculateSignificanceLevel(wordChanges, similarity);
  
  let explanation = generateChangeExplanation(wordChanges, significance);
  
  // Optional: Use AI for semantic analysis of complex changes
  if (enableSemanticAnalysis && significance === 'major') {
    try {
      explanation = await getSemanticAnalysis(clauseFrom.text, clauseTo.text);
    } catch (error) {
      console.warn('Semantic analysis failed, using rule-based explanation');
    }
  }

  return {
    clause_ref: clauseFrom.clause_ref || clauseTo.clause_ref,
    change_kind: 'modified',
    old_text: clauseFrom.text,
    new_text: clauseTo.text,
    similarity_score: similarity,
    page_from: clauseTo.page_from,
    page_to: clauseTo.page_to,
    word_changes: wordChanges,
    sentence_changes: sentenceChanges,
    significance_level: significance,
    explanation
  };
}

/**
 * Calculate text similarity using multiple methods
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0;
  
  // Normalize texts
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  if (norm1 === norm2) return 1.0;
  
  // Calculate Levenshtein-based similarity
  const editDistance = calculateEditDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const levenshteinSimilarity = maxLength > 0 ? 1 - (editDistance / maxLength) : 1;
  
  // Calculate word-based similarity
  const words1 = norm1.split(/\s+/);
  const words2 = norm2.split(/\s+/);
  const wordSimilarity = calculateJaccardSimilarity(words1, words2);
  
  // Combined similarity (weighted average)
  return (levenshteinSimilarity * 0.3) + (wordSimilarity * 0.7);
}

/**
 * Normalize text for comparison (Indonesian legal document specific)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

/**
 * Calculate edit distance (Levenshtein distance)
 */
function calculateEditDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate Jaccard similarity between two word arrays
 */
function calculateJaccardSimilarity(words1: string[], words2: string[]): number {
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate significance level of a change
 */
function calculateSignificanceLevel(wordChanges: Change[], similarity: number): 'major' | 'minor' | 'cosmetic' {
  const totalWords = wordChanges.reduce((sum, change) => sum + (change.value?.split(/\s+/).length || 0), 0);
  const changedWords = wordChanges
    .filter(change => change.added || change.removed)
    .reduce((sum, change) => sum + (change.value?.split(/\s+/).length || 0), 0);
  
  const changeRatio = totalWords > 0 ? changedWords / totalWords : 0;
  
  // Major changes: >30% word changes or low similarity
  if (changeRatio > 0.3 || similarity < 0.5) {
    return 'major';
  }
  
  // Minor changes: 10-30% word changes
  if (changeRatio > 0.1) {
    return 'minor';
  }
  
  // Cosmetic changes: <10% word changes (punctuation, spacing, etc.)
  return 'cosmetic';
}

/**
 * Generate explanation for changes
 */
function generateChangeExplanation(wordChanges: Change[], significance: string): string {
  const additions = wordChanges.filter(c => c.added);
  const deletions = wordChanges.filter(c => c.removed);
  
  if (additions.length === 0 && deletions.length === 0) {
    return 'No significant changes detected';
  }
  
  let explanation = '';
  
  if (deletions.length > 0) {
    const deletedText = deletions.map(c => c.value).join('').trim();
    explanation += `Removed: "${deletedText.substring(0, 100)}${deletedText.length > 100 ? '...' : ''}"`;
  }
  
  if (additions.length > 0) {
    const addedText = additions.map(c => c.value).join('').trim();
    if (explanation) explanation += ' | ';
    explanation += `Added: "${addedText.substring(0, 100)}${addedText.length > 100 ? '...' : ''}"`;
  }
  
  return explanation || `${significance} change detected`;
}

/**
 * Optional: Get semantic analysis using AI (placeholder for future enhancement)
 */
async function getSemanticAnalysis(oldText: string, newText: string): Promise<string> {
  // This would integrate with OpenAI API to provide semantic change analysis
  // For now, return a placeholder
  return `Semantic analysis: Text modified with potential legal implications`;
}

/**
 * Detect moved clauses (advanced feature)
 */
async function detectMovedClauses(changes: ClauseChange[], versionFrom: DocumentVersion, versionTo: DocumentVersion): Promise<void> {
  // Advanced algorithm to detect if clauses were moved rather than deleted/added
  // This would analyze clause patterns and positions
  // Implementation would be more complex - placeholder for now
}

/**
 * Generate summary statistics
 */
function generateSummary(changes: ClauseChange[]): DiffResult['summary'] {
  const additions = changes.filter(c => c.change_kind === 'added').length;
  const deletions = changes.filter(c => c.change_kind === 'deleted').length;
  const modifications = changes.filter(c => c.change_kind === 'modified').length;
  const major_changes = changes.filter(c => c.significance_level === 'major').length;
  const minor_changes = changes.filter(c => c.significance_level === 'minor').length;
  
  return {
    total_changes: changes.length,
    additions,
    deletions,
    modifications,
    major_changes,
    minor_changes
  };
}

/**
 * Calculate overall confidence score for the diff
 */
function calculateConfidenceScore(changes: ClauseChange[], fromCount: number, toCount: number): number {
  if (changes.length === 0) return 1.0;
  
  const avgSimilarity = changes
    .filter(c => c.similarity_score !== undefined)
    .reduce((sum, c) => sum + (c.similarity_score || 0), 0) / changes.length;
  
  const structuralSimilarity = Math.min(fromCount, toCount) / Math.max(fromCount, toCount);
  
  return (avgSimilarity * 0.6) + (structuralSimilarity * 0.4);
}

/**
 * Create a diff for storing in database
 */
export async function createDiffRecord(
  versionFromId: string,
  versionToId: string,
  diffResult: DiffResult
): Promise<any> {
  const diffRecords = diffResult.changes.map(change => ({
    v_from: versionFromId,
    v_to: versionToId,
    clause_ref: change.clause_ref,
    change_kind: change.change_kind,
    score: change.similarity_score || null,
    diff_data: {
      old_text: change.old_text,
      new_text: change.new_text,
      word_changes: change.word_changes,
      sentence_changes: change.sentence_changes,
      significance_level: change.significance_level,
      explanation: change.explanation,
      page_info: {
        page_from: change.page_from,
        page_to: change.page_to
      }
    }
  }));
  
  return {
    records: diffRecords,
    summary: diffResult.summary,
    metadata: diffResult.metadata
  };
}

/**
 * Get human-readable diff summary
 */
export function getDiffSummary(diffResult: DiffResult): string {
  const { summary } = diffResult;
  
  if (summary.total_changes === 0) {
    return 'No changes detected between document versions.';
  }
  
  const parts = [];
  
  if (summary.additions > 0) {
    parts.push(`${summary.additions} clause${summary.additions === 1 ? '' : 's'} added`);
  }
  
  if (summary.deletions > 0) {
    parts.push(`${summary.deletions} clause${summary.deletions === 1 ? '' : 's'} removed`);
  }
  
  if (summary.modifications > 0) {
    parts.push(`${summary.modifications} clause${summary.modifications === 1 ? '' : 's'} modified`);
  }
  
  let result = parts.join(', ');
  
  if (summary.major_changes > 0) {
    result += ` (${summary.major_changes} major change${summary.major_changes === 1 ? '' : 's'})`;
  }
  
  return result;
}