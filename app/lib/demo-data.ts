export interface DemoDocument {
  title: string;
  summary: string;
  changes: Array<{
    type: 'added' | 'modified' | 'deleted';
    clause: string;
    description: string;
  }>;
  conflicts: Array<{
    law: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export const sampleAnalysis: DemoDocument = {
  title: "Peraturan Daerah tentang Pajak Hotel - Revisi 2024",
  summary: "Peraturan ini mengatur tarif pajak hotel yang naik dari 10% menjadi 12% untuk hotel berbintang dan dari 5% menjadi 7% untuk hotel non-bintang. Perubahan ini bertujuan untuk meningkatkan Pendapatan Asli Daerah (PAD) sambil tetap menjaga daya saing sektor pariwisata. Aturan baru juga memperjelas definisi hotel dan fasilitas yang dikenakan pajak, termasuk layanan tambahan seperti spa dan pusat kebugaran yang terintegrasi dengan hotel.",
  changes: [
    {
      type: 'modified',
      clause: 'Pasal 5 Ayat 1',
      description: 'Perubahan tarif pajak hotel berbintang dari 10% menjadi 12%'
    },
    {
      type: 'modified', 
      clause: 'Pasal 5 Ayat 2',
      description: 'Perubahan tarif pajak hotel non-bintang dari 5% menjadi 7%'
    },
    {
      type: 'added',
      clause: 'Pasal 7 Ayat 3',
      description: 'Penambahan kewajiban pelaporan bulanan untuk hotel dengan omzet di atas 500 juta'
    },
    {
      type: 'modified',
      clause: 'Pasal 12',
      description: 'Perjelas definisi fasilitas hotel yang dikenakan pajak termasuk spa dan gym'
    }
  ],
  conflicts: [
    {
      law: "UU No. 28 Tahun 2009 tentang Pajak Daerah dan Retribusi Daerah",
      description: "Tarif pajak hotel maksimal yang diizinkan adalah 10% sesuai Pasal 35. Tarif 12% berpotensi melanggar ketentuan ini.",
      severity: 'high'
    },
    {
      law: "Peraturan Daerah tentang Pajak Restoran No. 5/2020",
      description: "Definisi fasilitas hotel dalam peraturan ini berbeda dengan definisi di Perda Pajak Restoran, dapat menyebabkan kebingungan implementasi.",
      severity: 'medium'
    },
    {
      law: "Keputusan Walikota tentang Standar Hotel No. 12/2023",
      description: "Kriteria hotel berbintang dalam peraturan ini tidak selaras dengan standar yang ditetapkan dalam Keputusan Walikota.",
      severity: 'low'
    }
  ]
};