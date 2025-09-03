import { FileText, Search, Share2 } from 'lucide-react';
import type { ServiceConfig } from './types';

export const serviceConfigs: ServiceConfig[] = [
  {
    id: 'ringkasan',
    title: 'Ringkasan Bahasa Sederhana',
    description: 'AI menghasilkan ringkasan 600-900 kata dalam Bahasa Indonesia yang mudah dipahami dengan glosarium istilah hukum.',
    icon: FileText,
    uploadInstructions: 'Unggah 1 dokumen hukum untuk dianalisis',
    maxFiles: 1,
    workflowSteps: [
      { number: 1, title: 'Unggah', description: 'Unggah 1 dokumen hukum' },
      { number: 2, title: 'Proses', description: 'AI mengekstrak dan menganalisis teks' },
      { number: 3, title: 'Analisis', description: 'Lihat ringkasan dengan glosarium' },
      { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
    ]
  },
  {
    id: 'perubahan',
    title: 'Deteksi Perubahan',
    description: 'Bandingkan versi dokumen secara visual dengan navigasi "lompat ke perubahan" dan highlight pada tingkat pasal.',
    icon: Search,
    uploadInstructions: 'Unggah 2 versi dokumen untuk dibandingkan',
    maxFiles: 2,
    workflowSteps: [
      { number: 1, title: 'Unggah', description: 'Unggah 2 versi dokumen' },
      { number: 2, title: 'Proses', description: 'AI mendeteksi perbedaan' },
      { number: 3, title: 'Analisis', description: 'Lihat perubahan dengan highlight' },
      { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
    ]
  },
  {
    id: 'konflik',
    title: 'Deteksi Konflik',
    description: 'Identifikasi potensi tumpang tindih dengan peraturan yang ada menggunakan pencarian semantik dengan kutipan dan referensi.',
    icon: Share2,
    uploadInstructions: 'Unggah 1 dokumen untuk pengecekan konflik',
    maxFiles: 1,
    workflowSteps: [
      { number: 1, title: 'Unggah', description: 'Unggah 1 dokumen hukum' },
      { number: 2, title: 'Proses', description: 'AI scan regulasi terkait' },
      { number: 3, title: 'Analisis', description: 'Lihat deteksi konflik dengan kutipan' },
      { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
    ]
  }
];