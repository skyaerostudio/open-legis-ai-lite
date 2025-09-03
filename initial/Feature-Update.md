# PRP Task — Open-LegisAI Lite UI/Functionality Fix

## Context
The current **Unggah Dokumen** section is not working. Both **drag-and-drop** and **Pilih File** features fail to function, breaking the main workflow.

The application has **3 core services**:  
1. **Ringkasan Bahasa Sederhana**  
2. **Deteksi Perubahan**  
3. **Deteksi Konflik**

Currently, these are shown as static cards (see `@image1.jpg`). They need to become **interactable selectors** that dynamically drive the rest of the UI and workflow.

Reference screenshots:  
- `@image1.png` (Unggah Dokumen + Feature Cards)  
- `@image2.png` (Cara Kerja section)

---

## Objectives
1. **Make Feature Cards Interactive**  
   - Clicking a card sets the "active service".  
   - The selected card is visually highlighted.  
   - Only one service can be active at a time.

2. **Dynamic Unggah Dokumen Section**  
   - The **upload area** changes instructions and validation rules depending on the chosen service:  
     - *Ringkasan*: Single document upload, focus on readability.  
     - *Deteksi Perubahan*: Require 2 documents for version comparison.  
     - *Deteksi Konflik*: Single document upload, semantic scan enabled.  
   - Fix and enable **file upload functionality** (drag-and-drop + Pilih File).  

3. **Dynamic Cara Kerja Section**  
   - Content updates according to the active service:  
     - *Ringkasan*: Steps → Upload → Proses (AI ringkasan) → Analisis (teks sederhana + glosarium) → Bagikan.  
     - *Perubahan*: Steps → Upload 2 versi → Proses (deteksi perbedaan) → Analisis (highlight perubahan) → Bagikan.  
     - *Konflik*: Steps → Upload → Proses (scan regulasi terkait) → Analisis (deteksi konflik tumpang tindih) → Bagikan.  

4. **Consistency Across UI/UX**  
   - Unified but adaptable design.  
   - Smooth transitions when switching services.  
   - Clear error states (e.g., wrong number of files uploaded).  

---

## Deliverables
- Updated PRP document detailing problem, objectives, and scope.  
- Interactive **feature card selector** with state management.  
- Functional/UX design plan for **dynamic upload + Cara Kerja sections**.  
- Technical fix for broken file upload component.  
- Task breakdown for implementation.  

---

## Notes
- Prioritize **modularity**: One upload component, dynamically configured per service.  
- Keep design aligned with screenshots provided.  
- Ensure **scalability** for future features.  
