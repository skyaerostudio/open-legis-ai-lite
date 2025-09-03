import { segmentTextIntoClauses } from '../pdf-processor';

describe('PDF Processor', () => {
  describe('segmentTextIntoClauses', () => {
    it('should segment Indonesian legal text correctly', () => {
      const sampleText = `
Pasal 1
Dalam Undang-Undang ini yang dimaksud dengan:

Pasal 2
Ayat (1) Setiap warga negara berhak atas...
Ayat (2) Pelaksanaan hak sebagaimana dimaksud...

Pasal 3
Bagian Kesatu
Ketentuan Umum
      `;

      const segments = segmentTextIntoClauses(sampleText);
      
      expect(segments).toHaveLength(3);
      expect(segments[0].clause_ref).toBe('Pasal 1');
      expect(segments[1].clause_ref).toBe('Pasal 2');
      expect(segments[2].clause_ref).toBe('Pasal 3');
      expect(segments[1].text).toContain('Ayat (1)');
      expect(segments[1].text).toContain('Ayat (2)');
    });

    it('should handle empty or invalid input', () => {
      expect(segmentTextIntoClauses('')).toEqual([]);
      expect(segmentTextIntoClauses('No legal content here')).toEqual([]);
    });

    it('should filter out very short segments', () => {
      const shortText = 'Pasal 1\nShort';
      const segments = segmentTextIntoClauses(shortText);
      expect(segments).toHaveLength(0);
    });
  });
});