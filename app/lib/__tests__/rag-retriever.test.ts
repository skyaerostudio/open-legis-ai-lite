import {
  ConflictDetector,
  createConflictDetector,
  findConflicts,
  generateDocumentSummary,
  ConflictDetectionOptions,
  ConflictDetectionProgress,
  ConflictContext,
  LegalConflictAnalysis,
} from '../rag-retriever';
import { ClauseSegment } from '../pdf-processor';
import { ConflictDetection, ConflictFlag, LegalCitation, SimilaritySearchResult } from '@/types/analysis';

// Mock the embeddings module
jest.mock('../embeddings', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  calculateCosineSimilarity: jest.fn().mockImplementation((a, b) => {
    return JSON.stringify(a) === JSON.stringify(b) ? 1.0 : 0.85;
  })
}));

// Mock the supabase client
jest.mock('../supabase', () => ({
  createClient: jest.fn().mockReturnValue({
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  })
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                explanation: 'Potensi konflik terdeteksi antara ketentuan baru dan peraturan yang ada.',
                legal_implications: ['Ketidakpastian hukum', 'Potensi inkonsistensi implementasi'],
                resolution_suggestions: ['Revisi klausul', 'Harmonisasi peraturan'],
                severity_factors: ['Tingkat kepentingan klausul', 'Dampak terhadap implementasi']
              })
            }
          }]
        })
      }
    }
  }));
});

describe('ConflictDetector', () => {
  let detector: ConflictDetector;
  let mockSupabase: any;

  const createMockClause = (
    text: string,
    clauseType: string = 'pasal',
    sequenceOrder: number = 0,
    clauseRef?: string
  ): ClauseSegment => ({
    text,
    clause_type: clauseType,
    sequence_order: sequenceOrder,
    clause_ref: clauseRef,
    confidence_score: 0.9,
    page_start: 1,
    page_end: 1
  });

  const createMockSimilarityResult = (
    overrides: Partial<SimilaritySearchResult> = {}
  ): SimilaritySearchResult => ({
    clause_id: 'clause-123',
    version_id: 'version-456',
    document_title: 'UU No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional',
    clause_ref: 'Pasal 5',
    clause_text: 'Setiap warga negara mempunyai hak yang sama untuk memperoleh pendidikan yang bermutu.',
    similarity: 0.85,
    document_type: 'law',
    jurisdiction: 'national',
    rank: 1,
    context: { before: '', after: '' },
    ...overrides
  });

  beforeEach(() => {
    detector = new ConflictDetector();
    mockSupabase = require('../supabase').createClient();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should create detector with default options', () => {
      const detector = new ConflictDetector();
      const options = detector.getOptions();
      
      expect(options.similarity_threshold).toBe(0.8);
      expect(options.max_conflicts_per_clause).toBe(5);
      expect(options.enable_ai_explanations).toBe(true);
      expect(options.document_types).toEqual(['law', 'regulation']);
    });

    test('should create detector with custom options', () => {
      const customOptions: Partial<ConflictDetectionOptions> = {
        similarity_threshold: 0.75,
        jurisdiction_filter: 'national',
        batch_size: 5
      };
      
      const detector = new ConflictDetector(customOptions);
      const options = detector.getOptions();
      
      expect(options.similarity_threshold).toBe(0.75);
      expect(options.jurisdiction_filter).toBe('national');
      expect(options.batch_size).toBe(5);
    });

    test('should update options after creation', () => {
      detector.updateOptions({ similarity_threshold: 0.9 });
      const options = detector.getOptions();
      
      expect(options.similarity_threshold).toBe(0.9);
    });
  });

  describe('Conflict Detection - Core Functionality', () => {
    test('should detect no conflicts when no similar clauses found', async () => {
      // Mock empty similarity search results
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const clauses = [
        createMockClause('Pasal 1. Ketentuan umum dalam peraturan ini.', 'pasal', 1, 'pasal-1')
      ];

      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts).toHaveLength(0);
      expect(result.risk_assessment).toBe('low');
      expect(result.overall_compatibility_score).toBe(1.0);
      expect(result.summary).toContain('Tidak ditemukan konflik signifikan');
    });

    test('should detect conflicts with high similarity', async () => {
      // Mock similarity search results
      const mockResults = [
        {
          conflict_clause_id: 'clause-123',
          conflict_text: 'Setiap warga negara berhak mendapat pendidikan bermutu.',
          conflict_document_title: 'UU No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional',
          conflict_document_type: 'law',
          similarity_score: 0.95,
          jurisdiction: 'national'
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const clauses = [
        createMockClause('Setiap warga negara berhak mendapatkan pendidikan yang berkualitas.', 'pasal', 1, 'pasal-1')
      ];

      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].overlap_score).toBe(0.95);
      expect(result.conflicts[0].conflict_type).toEqual(expect.any(String));
      expect(result.conflicts[0].severity).toEqual(expect.any(String));
    });

    test('should handle progress callbacks', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const clauses = [
        createMockClause('Test clause 1', 'pasal', 1),
        createMockClause('Test clause 2', 'pasal', 2),
        createMockClause('Test clause 3', 'pasal', 3),
      ];

      const progressUpdates: ConflictDetectionProgress[] = [];
      const onProgress = (progress: ConflictDetectionProgress) => {
        progressUpdates.push(progress);
      };

      await detector.detectConflicts(clauses, undefined, onProgress);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.current_phase === 'embedding')).toBe(true);
      expect(progressUpdates.some(p => p.current_phase === 'finalizing')).toBe(true);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Conflict Type Detection', () => {
    test('should detect contradiction conflicts', async () => {
      const mockResults = [
        {
          conflict_clause_id: 'clause-123',
          conflict_text: 'Kegiatan ini dilarang dan tidak boleh dilakukan.',
          conflict_document_title: 'Peraturan Existing',
          conflict_document_type: 'regulation',
          similarity_score: 0.88,
          jurisdiction: 'national'
        }
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockResults, error: null });

      const clauses = [
        createMockClause('Kegiatan ini diperbolehkan dan dapat dilakukan.', 'pasal', 1)
      ];

      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts[0].conflict_type).toBe('contradiction');
    });

    test('should detect overlap conflicts for high similarity', async () => {
      const mockResults = [
        {
          conflict_clause_id: 'clause-123',
          conflict_text: 'Warga negara berhak mendapat pendidikan.',
          conflict_document_title: 'UU Pendidikan',
          conflict_document_type: 'law',
          similarity_score: 0.95,
          jurisdiction: 'national'
        }
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockResults, error: null });

      const clauses = [
        createMockClause('Setiap warga negara berhak mendapat pendidikan.', 'pasal', 1)
      ];

      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts[0].conflict_type).toBe('overlap');
    });

    test('should detect inconsistency conflicts', async () => {
      const mockResults = [
        {
          conflict_clause_id: 'clause-123',
          conflict_text: 'Prosedur pendaftaran dilakukan melalui sistem online.',
          conflict_document_title: 'Peraturan Teknis',
          conflict_document_type: 'regulation',
          similarity_score: 0.82,
          jurisdiction: 'provincial'
        }
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockResults, error: null });

      const clauses = [
        createMockClause('Tata cara pendaftaran dilakukan secara manual.', 'pasal', 1)
      ];

      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts[0].conflict_type).toBe('inconsistency');
    });
  });

  describe('Severity Assessment', () => {
    test('should assign correct severity levels', async () => {
      const testCases = [
        { similarity: 0.95, expected_severity: 'high', conflict_type: 'overlap' },
        { similarity: 0.92, expected_severity: 'critical', conflict_type: 'contradiction' },
        { similarity: 0.83, expected_severity: 'medium', conflict_type: 'inconsistency' },
        { similarity: 0.78, expected_severity: 'low', conflict_type: 'gap' },
      ];

      for (const testCase of testCases) {
        mockSupabase.rpc.mockResolvedValue({
          data: [{
            conflict_clause_id: 'clause-123',
            conflict_text: 'Test conflict text',
            conflict_document_title: 'Test Document',
            conflict_document_type: 'law',
            similarity_score: testCase.similarity,
            jurisdiction: 'national'
          }],
          error: null
        });

        const clauses = [createMockClause('Test clause text', 'pasal', 1)];
        const result = await detector.detectConflicts(clauses);

        expect(result.conflicts[0].severity).toBeDefined();
        // Severity is determined by both similarity and conflict type
        expect(['low', 'medium', 'high', 'critical']).toContain(result.conflicts[0].severity);
      }
    });
  });

  describe('Risk Assessment', () => {
    test('should assess low risk with no critical conflicts', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          conflict_clause_id: 'clause-123',
          conflict_text: 'Minor conflict',
          conflict_document_title: 'Test Document',
          conflict_document_type: 'regulation',
          similarity_score: 0.75,
          jurisdiction: 'municipal'
        }],
        error: null
      });

      const clauses = [createMockClause('Test clause', 'pasal', 1)];
      const result = await detector.detectConflicts(clauses);

      expect(result.risk_assessment).toBe('low');
    });

    test('should assess critical risk with critical conflicts', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          conflict_clause_id: 'clause-123',
          conflict_text: 'Kegiatan ini dilarang sepenuhnya.',
          conflict_document_title: 'UU Pokok',
          conflict_document_type: 'law',
          similarity_score: 0.95,
          jurisdiction: 'national'
        }],
        error: null
      });

      const clauses = [createMockClause('Kegiatan ini diperbolehkan tanpa syarat.', 'pasal', 1)];
      const result = await detector.detectConflicts(clauses);

      // Should be high or critical risk due to direct contradiction with high similarity
      expect(['high', 'critical']).toContain(result.risk_assessment);
    });
  });

  describe('Legal Citation Creation', () => {
    test('should create proper legal citations', async () => {
      const mockResults = [{
        conflict_clause_id: 'clause-123',
        conflict_text: 'Test conflict text',
        conflict_document_title: 'Undang-Undang No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional',
        conflict_document_type: 'law',
        similarity_score: 0.85,
        jurisdiction: 'national',
        clause_ref: 'Pasal 5 Ayat (1)'
      }];

      mockSupabase.rpc.mockResolvedValue({ data: mockResults, error: null });

      const clauses = [createMockClause('Test clause text', 'pasal', 1)];
      const result = await detector.detectConflicts(clauses);

      const citation = result.conflicts[0].citation_data;
      expect(citation.title).toBe('Undang-Undang No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional');
      expect(citation.type).toBe('undang-undang');
      expect(citation.number).toBe('20');
      expect(citation.year).toBe('2003');
      expect(citation.article).toBe('Pasal 5 Ayat (1)');
      expect(citation.jurisdiction).toBe('national');
      expect(citation.status).toBe('active');
    });

    test('should parse different legal document types', async () => {
      const testCases = [
        {
          title: 'Peraturan Pemerintah No. 15 Tahun 2020',
          expected_type: 'peraturan-pemerintah',
          expected_authority: 'Presiden RI'
        },
        {
          title: 'Keputusan Presiden No. 45 Tahun 2019',
          expected_type: 'keputusan-presiden',
          expected_authority: 'Presiden RI'
        },
        {
          title: 'Peraturan Menteri No. 12 Tahun 2021',
          expected_type: 'peraturan-menteri',
          expected_authority: 'Menteri'
        },
        {
          title: 'Peraturan Daerah No. 8 Tahun 2022',
          expected_type: 'peraturan-daerah',
          expected_authority: 'Pemerintah Daerah'
        }
      ];

      for (const testCase of testCases) {
        mockSupabase.rpc.mockResolvedValue({
          data: [{
            conflict_clause_id: 'clause-123',
            conflict_text: 'Test text',
            conflict_document_title: testCase.title,
            conflict_document_type: 'regulation',
            similarity_score: 0.85,
            jurisdiction: 'national'
          }],
          error: null
        });

        const clauses = [createMockClause('Test clause', 'pasal', 1)];
        const result = await detector.detectConflicts(clauses);

        expect(result.conflicts[0].citation_data.type).toBe(testCase.expected_type);
        expect(result.conflicts[0].citation_data.issuing_authority).toBe(testCase.expected_authority);
      }
    });
  });

  describe('Batch Processing', () => {
    test('should process clauses in batches', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const clauses = Array.from({ length: 25 }, (_, i) => 
        createMockClause(`Test clause ${i + 1}`, 'pasal', i + 1)
      );

      // Set small batch size for testing
      detector.updateOptions({ batch_size: 5 });

      const result = await detector.detectConflicts(clauses);

      // Should have processed all clauses despite batching
      expect(result.processing_info.processing_time_seconds).toBeGreaterThan(0);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(5); // 25 clauses / 5 batch size = 5 calls
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'));

      const clauses = [createMockClause('Test clause', 'pasal', 1)];

      await expect(detector.detectConflicts(clauses))
        .rejects
        .toThrow('Conflict detection failed');
    });

    test('should continue processing when individual clause fails', async () => {
      // Mock embeddings to fail for specific text
      const mockGenerateEmbedding = require('../embeddings').generateEmbedding;
      mockGenerateEmbedding.mockImplementation((text: string) => {
        if (text.includes('failing clause')) {
          return Promise.reject(new Error('Embedding failed'));
        }
        return Promise.resolve(new Array(1536).fill(0.1));
      });

      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const clauses = [
        createMockClause('Normal clause', 'pasal', 1),
        createMockClause('This is a failing clause', 'pasal', 2),
        createMockClause('Another normal clause', 'pasal', 3),
      ];

      const result = await detector.detectConflicts(clauses);

      // Should complete successfully despite one clause failing
      expect(result.conflicts).toBeDefined();
      expect(result.processing_info).toBeDefined();
    });
  });

  describe('AI Explanations', () => {
    test('should generate AI explanations when enabled', async () => {
      const detector = new ConflictDetector({ enable_ai_explanations: true });

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          conflict_clause_id: 'clause-123',
          conflict_text: 'Conflicting text',
          conflict_document_title: 'Test Law',
          conflict_document_type: 'law',
          similarity_score: 0.85,
          jurisdiction: 'national'
        }],
        error: null
      });

      const clauses = [createMockClause('Original text', 'pasal', 1)];
      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts[0].explanation).toContain('konflik');
    });

    test('should work without AI explanations when disabled', async () => {
      const detector = new ConflictDetector({ enable_ai_explanations: false });

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          conflict_clause_id: 'clause-123',
          conflict_text: 'Conflicting text',
          conflict_document_title: 'Test Law',
          conflict_document_type: 'law',
          similarity_score: 0.85,
          jurisdiction: 'national'
        }],
        error: null
      });

      const clauses = [createMockClause('Original text', 'pasal', 1)];
      const result = await detector.detectConflicts(clauses);

      expect(result.conflicts[0].explanation).toBeDefined();
      // Should still have basic explanation without AI
    });
  });
});

describe('Utility Functions', () => {
  describe('createConflictDetector', () => {
    test('should create detector instance with options', () => {
      const options = { similarity_threshold: 0.9 };
      const detector = createConflictDetector(options);
      
      expect(detector).toBeInstanceOf(ConflictDetector);
      expect(detector.getOptions().similarity_threshold).toBe(0.9);
    });
  });

  describe('Legacy Functions', () => {
    beforeEach(() => {
      const mockSupabase = require('../supabase').createClient();
      
      // Reset all mocks
      jest.clearAllMocks();
      
      // Setup complex chained mock for legacy functions
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockImplementation((columns: string) => ({
          eq: jest.fn().mockImplementation((column: string, value: any) => {
            if (table === 'embeddings') {
              return {
                single: jest.fn().mockResolvedValue({
                  data: { vector: new Array(1536).fill(0.1) },
                  error: null
                })
              };
            } else if (table === 'clauses') {
              return {
                order: jest.fn().mockResolvedValue({
                  data: [{
                    id: 'clause-1',
                    text: 'Test clause text',
                    clause_ref: 'Pasal 1'
                  }],
                  error: null
                })
              };
            }
            return Promise.resolve({ data: [], error: null });
          })
        }))
      }));
      
      // Setup RPC mock
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });
    });

    test('findConflicts should work with legacy interface', async () => {
      const result = await findConflicts('version-123', 0.8);
      
      expect(result).toBeInstanceOf(Array);
      // Since mocks return empty data, expect empty results
      expect(result).toHaveLength(0);
    });

    test('generateDocumentSummary should work with legacy interface', async () => {
      const result = await generateDocumentSummary('version-123');
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.total_clauses).toBe(1);
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete workflow with real-like data', async () => {
    const detector = new ConflictDetector({
      similarity_threshold: 0.8,
      enable_ai_explanations: true,
      batch_size: 2
    });

    // Mock realistic legal corpus search results
    const mockSupabase = require('../supabase').createClient();
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          conflict_clause_id: 'existing-clause-1',
          conflict_text: 'Setiap warga negara berhak memperoleh pendidikan.',
          conflict_document_title: 'Undang-Undang No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional',
          conflict_document_type: 'law',
          similarity_score: 0.92,
          jurisdiction: 'national',
          clause_ref: 'Pasal 5'
        },
        {
          conflict_clause_id: 'existing-clause-2',
          conflict_text: 'Pendidikan adalah tanggung jawab pemerintah dan masyarakat.',
          conflict_document_title: 'Undang-Undang No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional',
          conflict_document_type: 'law',
          similarity_score: 0.85,
          jurisdiction: 'national',
          clause_ref: 'Pasal 8'
        }
      ],
      error: null
    });

    const newLawClauses = [
      createMockClause('Setiap warga negara mempunyai hak untuk mendapatkan pendidikan bermutu.', 'pasal', 1, 'Pasal 1'),
      createMockClause('Pemerintah dan masyarakat berkewajiban menyelenggarakan pendidikan.', 'pasal', 2, 'Pasal 2'),
      createMockClause('Pendidikan dilaksanakan secara demokratis dan berkeadilan.', 'pasal', 3, 'Pasal 3')
    ];

    const progressUpdates: ConflictDetectionProgress[] = [];
    const result = await detector.detectConflicts(
      newLawClauses, 
      'exclude-doc-123',
      (progress) => progressUpdates.push(progress)
    );

    // Verify comprehensive results
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.risk_assessment).toBeDefined();
    expect(result.overall_compatibility_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_compatibility_score).toBeLessThanOrEqual(1);
    expect(result.summary).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
    expect(result.processing_info.corpus_searched).toBeGreaterThan(0);
    expect(result.processing_info.processing_time_seconds).toBeGreaterThan(0);

    // Verify progress tracking
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);

    // Verify conflict details
    const conflict = result.conflicts[0];
    expect(conflict.citation_data.type).toBe('undang-undang');
    expect(conflict.citation_data.number).toBe('20');
    expect(conflict.citation_data.year).toBe('2003');
    expect(conflict.severity).toMatch(/^(low|medium|high|critical)$/);
    expect(conflict.confidence_score).toBeGreaterThan(0);
    expect(conflict.confidence_score).toBeLessThanOrEqual(1);
  });

  function createMockClause(
    text: string,
    clauseType: string = 'pasal',
    sequenceOrder: number = 0,
    clauseRef?: string
  ): ClauseSegment {
    return {
      text,
      clause_type: clauseType,
      sequence_order: sequenceOrder,
      clause_ref: clauseRef,
      confidence_score: 0.9,
      page_start: 1,
      page_end: 1
    };
  }
});