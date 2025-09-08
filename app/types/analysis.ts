// AI analysis and result types for legal document processing

// Document summarization results (Ringkasan service)
export interface DocumentSummary {
  summary: string;
  key_points: string[];
  glossary: Array<{
    term: string;
    definition: string;
    category?: 'legal' | 'technical' | 'administrative';
    context?: string;
  }>;
  citations: Array<{
    text: string;
    source: string;
    page?: number;
    clause_ref?: string;
    url?: string;
  }>;
  metadata: {
    word_count: number;
    reading_time_minutes: number;
    complexity_score: number; // 1-5 scale
    language_level: 'elementary' | 'intermediate' | 'advanced';
    document_structure_score: number; // How well-structured the document is
  };
  processing_info: {
    model_used: string;
    processing_time_seconds: number;
    generated_at: string;
    version: string;
  };
}

// Document comparison results (Deteksi Perubahan service)
export interface DocumentComparison {
  changes: DocumentDiff[];
  summary: string;
  statistics: {
    total_changes: number;
    additions: number;
    deletions: number;
    modifications: number;
    moves: number;
    significance_distribution: {
      critical: number;
      major: number;
      minor: number;
      trivial: number;
    };
  };
  processing_info: {
    comparison_method: 'clause' | 'semantic' | 'hybrid';
    processing_time_seconds: number;
    generated_at: string;
  };
}

export interface DocumentDiff {
  id: string;
  clause_ref?: string;
  change_type: 'added' | 'deleted' | 'modified' | 'moved';
  old_text?: string;
  new_text?: string;
  similarity_score?: number; // 0-1 for modifications
  significance_score: number; // 1-5 scale
  sequence_order: number;
  context: {
    before?: string;
    after?: string;
  };
  explanation?: string; // AI-generated explanation of the change
  legal_implications?: string[]; // Potential legal implications
}

// Conflict detection results (Deteksi Konflik service)
export interface ConflictDetection {
  conflicts: ConflictFlag[];
  summary: string;
  risk_assessment: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  overall_compatibility_score: number; // 0-1 scale
  processing_info: {
    corpus_searched: number; // Number of documents searched
    similarity_threshold: number;
    processing_time_seconds: number;
    generated_at: string;
  };
}

export interface ConflictFlag {
  id: string;
  conflicting_law_title: string;
  conflicting_law_ref?: string;
  overlap_score: number; // 0-1 similarity score
  conflict_type: 'contradiction' | 'overlap' | 'gap' | 'inconsistency';
  excerpt_original: string;
  excerpt_conflicting: string;
  explanation: string;
  citation_data: LegalCitation;
  confidence_score: number; // 0-1 confidence in the conflict detection
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution_suggestion?: string;
  legal_precedent?: string;
}

// Legal citation standardization
export interface LegalCitation {
  title: string;
  type: 'undang-undang' | 'peraturan-pemerintah' | 'keputusan-presiden' | 'instruksi-presiden' | 'peraturan-menteri' | 'peraturan-daerah' | 'other';
  number: string;
  year: string;
  article?: string;
  paragraph?: string;
  section?: string;
  url?: string;
  jurisdiction: 'national' | 'provincial' | 'municipal';
  status: 'active' | 'amended' | 'repealed' | 'suspended';
  access_date: string;
  issuing_authority?: string;
}

// Indonesian legal glossary and terminology
export interface LegalGlossaryTerm {
  term: string;
  definition: string;
  category: 'constitutional' | 'administrative' | 'civil' | 'criminal' | 'commercial' | 'procedural';
  alternative_terms: string[];
  usage_context: 'formal' | 'informal' | 'technical';
  examples: string[];
  related_terms: string[];
  source_authority?: string;
}

// AI processing results for different analysis types
export interface AIAnalysisResult {
  job_id: string;
  service_type: 'ringkasan' | 'perubahan' | 'konflik';
  status: 'completed' | 'partial' | 'failed';
  confidence_score: number; // Overall confidence in the analysis
  results: DocumentSummary | DocumentComparison | ConflictDetection;
  warnings: string[];
  limitations: string[];
  quality_indicators: {
    text_extraction_quality: number; // 0-1
    structure_recognition_accuracy: number; // 0-1
    ai_analysis_confidence: number; // 0-1
    completeness_score: number; // 0-1
  };
  processing_metadata: {
    total_clauses_processed: number;
    failed_clauses: number;
    processing_time_breakdown: Record<string, number>;
    model_versions: Record<string, string>;
  };
}

// Text analysis and processing utilities
export interface TextAnalysisResult {
  original_text: string;
  normalized_text: string;
  extracted_entities: LegalEntity[];
  sentiment_score?: number;
  readability_score: number;
  language_detection: {
    language: string;
    confidence: number;
  };
  structure_analysis: {
    clause_count: number;
    average_clause_length: number;
    complexity_indicators: string[];
  };
}

export interface LegalEntity {
  text: string;
  type: 'law_reference' | 'institution' | 'person' | 'location' | 'date' | 'monetary' | 'legal_term';
  start_offset: number;
  end_offset: number;
  confidence: number;
  metadata?: Record<string, any>;
}

// Semantic similarity and vector search
export interface SimilaritySearchResult {
  clause_id: string;
  version_id: string;
  document_title: string;
  clause_ref: string;
  clause_text: string;
  similarity: number;
  document_type: string;
  jurisdiction: string;
  rank: number;
  context: {
    before: string;
    after: string;
  };
}

export interface SemanticSearchQuery {
  query_text: string;
  filters: {
    document_types?: string[];
    jurisdictions?: string[];
    minimum_similarity?: number;
    exclude_document_id?: string;
  };
  options: {
    max_results: number;
    include_context: boolean;
    similarity_threshold: number;
  };
}

// Quality assessment and validation
export interface AnalysisQualityReport {
  overall_score: number; // 0-100
  dimensions: {
    accuracy: QualityDimension;
    completeness: QualityDimension;
    relevance: QualityDimension;
    clarity: QualityDimension;
    consistency: QualityDimension;
  };
  issues_found: QualityIssue[];
  recommendations: string[];
  confidence_intervals: Record<string, { min: number; max: number }>;
}

export interface QualityDimension {
  score: number; // 0-100
  weight: number; // Importance weight
  indicators: QualityIndicator[];
  description: string;
}

export interface QualityIndicator {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  description: string;
}

export interface QualityIssue {
  type: 'missing_citation' | 'low_confidence' | 'inconsistent_terminology' | 'incomplete_analysis' | 'formatting_error';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
  suggested_fix?: string;
}

// Export and sharing
export interface ExportConfiguration {
  format: 'pdf' | 'docx' | 'html' | 'json' | 'csv';
  sections: {
    include_summary: boolean;
    include_detailed_changes: boolean;
    include_conflicts: boolean;
    include_citations: boolean;
    include_glossary: boolean;
    include_metadata: boolean;
  };
  styling: {
    language: 'indonesian' | 'english';
    color_scheme: 'default' | 'high_contrast' | 'print_friendly';
    font_size: 'small' | 'medium' | 'large';
    include_logo: boolean;
  };
  accessibility: {
    alt_text_for_images: boolean;
    high_contrast_mode: boolean;
    screen_reader_optimized: boolean;
  };
}

export interface SharedAnalysisResult {
  share_id: string;
  job_id: string;
  is_public: boolean;
  access_level: 'public' | 'protected' | 'private';
  password_protected: boolean;
  expiration_date?: string;
  view_count: number;
  created_at: string;
  last_accessed?: string;
  share_url: string;
  metadata: {
    title: string;
    description?: string;
    tags: string[];
    created_by?: string;
  };
}

// Historical analysis and trending
export interface AnalysisTrends {
  period: 'daily' | 'weekly' | 'monthly';
  service_usage: Record<'ringkasan' | 'perubahan' | 'konflik', {
    request_count: number;
    success_rate: number;
    average_processing_time: number;
  }>;
  popular_document_types: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  common_conflicts: Array<{
    conflict_type: ConflictFlag['conflict_type'];
    count: number;
    typical_severity: string;
  }>;
  user_engagement: {
    total_analyses: number;
    shared_publicly: number;
    average_session_duration: number;
  };
}

// Utility types for type safety
export type AnalysisResultUnion = DocumentSummary | DocumentComparison | ConflictDetection;
export type ServiceResultType<T extends 'ringkasan' | 'perubahan' | 'konflik'> = 
  T extends 'ringkasan' ? DocumentSummary :
  T extends 'perubahan' ? DocumentComparison :
  T extends 'konflik' ? ConflictDetection :
  never;

// Legacy compatibility (re-exports for backward compatibility)
export type DiffResult = DocumentComparison;
export type ComparisonResult = DocumentComparison;
export type ProcessingResult = AIAnalysisResult;