import { processDocumentEmbeddings } from '../embeddings';
import { ClauseSegment } from '../pdf-processor';

// Mock OpenAI for integration testing
jest.mock('openai', () => {
  const mockEmbeddings = {
    create: jest.fn()
  };
  
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: mockEmbeddings
    }))
  };
});

describe('Embeddings Integration Tests', () => {
  const mockEmbeddingResponse = {
    data: [
      { embedding: new Array(1536).fill(0.1), index: 0 },
      { embedding: new Array(1536).fill(0.2), index: 1 },
      { embedding: new Array(1536).fill(0.3), index: 2 }
    ],
    model: 'text-embedding-3-small',
    usage: { total_tokens: 30 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockOpenAI = require('openai').default;
    const mockInstance = new mockOpenAI();
    mockInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
  });

  it('should process document segments with embeddings', async () => {
    // Sample segments that would come from PDF processor
    const segments: Array<{ text: string; clause_ref?: string }> = [
      {
        text: 'Pasal 1 - Dalam Undang-Undang ini yang dimaksud dengan perdagangan adalah tatanan kegiatan yang terkait dengan transaksi barang dan/atau jasa di dalam negeri dan melampaui batas wilayah negara.',
        clause_ref: 'pasal_1'
      },
      {
        text: 'Pasal 2 - Perdagangan diselenggarakan berasaskan demokrasi ekonomi dengan prinsip persaingan sehat, berkelanjutan, dan berkeadilan.',
        clause_ref: 'pasal_2'
      },
      {
        text: 'Pasal 3 - Pengaturan perdagangan bertujuan untuk meningkatkan pertumbuhan ekonomi nasional, menciptakan lapangan kerja, dan meningkatkan kesejahteraan masyarakat.',
        clause_ref: 'pasal_3'
      }
    ];

    const result = await processDocumentEmbeddings(segments);

    // Verify the structure
    expect(result).toHaveLength(3);
    
    // Check each result has required fields
    result.forEach((item, index) => {
      expect(item).toHaveProperty('text');
      expect(item).toHaveProperty('clause_ref');
      expect(item).toHaveProperty('embedding');
      expect(item).toHaveProperty('tokens_used');
      expect(item).toHaveProperty('cached');
      
      expect(item.text).toBe(segments[index].text);
      expect(item.clause_ref).toBe(segments[index].clause_ref);
      expect(item.embedding).toHaveLength(1536);
      expect(typeof item.tokens_used).toBe('number');
      expect(typeof item.cached).toBe('boolean');
    });
  });

  it('should handle legal document text with Indonesian content', async () => {
    const segments = [
      {
        text: 'Menimbang bahwa pembangunan perekonomian nasional pada hakikatnya adalah upaya untuk mewujudkan kesejahteraan umum dan mencerdaskan kehidupan bangsa sebagaimana diamanatkan oleh Undang-Undang Dasar Negara Republik Indonesia Tahun 1945.',
        clause_ref: 'menimbang_a'
      },
      {
        text: 'Bahwa dalam rangka mewujudkan masyarakat adil dan makmur berdasarkan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, pemerintah melaksanakan pembangunan di segala bidang.',
        clause_ref: 'menimbang_b'
      }
    ];

    const progressCallback = jest.fn();
    const result = await processDocumentEmbeddings(segments, progressCallback);

    expect(result).toHaveLength(2);
    expect(progressCallback).toHaveBeenCalled();
    
    // Verify Indonesian legal text is properly processed
    expect(result[0].text).toContain('Menimbang');
    expect(result[1].text).toContain('Pancasila');
  });

  it('should handle progress tracking for large document segments', async () => {
    // Create a larger set of segments to test progress tracking
    const segments = Array.from({ length: 10 }, (_, i) => ({
      text: `Pasal ${i + 1} - Ini adalah isi pasal ${i + 1} yang membahas tentang ketentuan hukum yang berlaku untuk kegiatan perdagangan dan industri di Indonesia.`,
      clause_ref: `pasal_${i + 1}`
    }));

    // Mock response for larger batch
    const largeMockResponse = {
      data: segments.map((_, i) => ({ embedding: new Array(1536).fill(0.1 * i), index: i })),
      model: 'text-embedding-3-small',
      usage: { total_tokens: 100 }
    };

    const mockOpenAI = require('openai').default;
    const mockInstance = new mockOpenAI();
    mockInstance.embeddings.create.mockResolvedValue(largeMockResponse);

    const progressCallback = jest.fn();
    const result = await processDocumentEmbeddings(segments, progressCallback);

    expect(result).toHaveLength(10);
    expect(progressCallback).toHaveBeenCalled();
    
    // Verify progress callback was called with appropriate progress
    const progressCalls = progressCallback.mock.calls;
    const finalCall = progressCalls[progressCalls.length - 1][0];
    expect(finalCall.percentage).toBe(100);
    expect(finalCall.total).toBe(10);
  });

  it('should handle segments without clause references', async () => {
    const segments = [
      {
        text: 'Ini adalah teks general tanpa referensi pasal khusus.'
      },
      {
        text: 'Teks lain yang juga tidak memiliki clause_ref.'
      }
    ];

    const result = await processDocumentEmbeddings(segments);

    expect(result).toHaveLength(2);
    expect(result[0].clause_ref).toBeUndefined();
    expect(result[1].clause_ref).toBeUndefined();
    expect(result[0].text).toBe(segments[0].text);
    expect(result[1].text).toBe(segments[1].text);
  });

  it('should work with actual ClauseSegment interface', async () => {
    // Test with the full ClauseSegment interface from pdf-processor
    const segments: ClauseSegment[] = [
      {
        clause_ref: 'bab_1',
        text: 'BAB I - KETENTUAN UMUM',
        page_from: 1,
        page_to: 1,
        clause_type: 'bab',
        sequence_order: 1
      },
      {
        clause_ref: 'pasal_1',
        text: 'Pasal 1 - Dalam Undang-Undang ini yang dimaksud dengan...',
        page_from: 1,
        page_to: 2,
        clause_type: 'pasal',
        sequence_order: 2
      }
    ];

    // Extract just text and clause_ref for embedding processing
    const embeddingSegments = segments.map(({ text, clause_ref }) => ({ text, clause_ref }));
    
    const result = await processDocumentEmbeddings(embeddingSegments);

    expect(result).toHaveLength(2);
    expect(result[0].clause_ref).toBe('bab_1');
    expect(result[1].clause_ref).toBe('pasal_1');
    expect(result[0].text).toContain('BAB I');
    expect(result[1].text).toContain('Pasal 1');
  });

  it('should handle error scenarios in document processing', async () => {
    const segments = [
      {
        text: 'Normal legal text',
        clause_ref: 'pasal_1'
      }
    ];

    const mockOpenAI = require('openai').default;
    const mockInstance = new mockOpenAI();
    mockInstance.embeddings.create.mockRejectedValue(new Error('invalid_api_key'));

    // Use low retry configuration to speed up test
    const retryConfig = { max_retries: 1, base_delay_ms: 10 };
    
    await expect(processDocumentEmbeddings(segments, undefined, retryConfig)).rejects.toThrow();
  }, 10000); // 10 second timeout
});