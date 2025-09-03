# PRD — Open‑LegisAI Lite (MVP)
Owner: PO • Date: 2025-09-02 • Status: Draft v1

## 1) Problem & Opportunity
Citizens, journalists, CSOs, and DPRD secretariats struggle to quickly understand *what changed* in draft regulations and *how it conflicts* with prior laws. Manual reading is slow; changes are subtle. An AI‑assisted explainer and diff tool can drastically reduce time‑to‑clarity.

## 2) Goals & Non‑Goals
- **Goals**
  - Upload 1–2 versions of a regulation → get **plain‑language summary (Bahasa)**.
  - Show **clause‑level diffs** between versions with **side‑by‑side view**.
  - Detect **potential conflicts/overlaps** with existing laws, with **citations**.
  - One‑click **share** link for public reading.
- **Non‑Goals**
  - Legal advice, binding interpretations, or formal compliance guarantees.
  - Automated integration with closed government systems (future).

## 3) Users & JTBD
- **DPRD Secretariat Analysts** — “I need a rapid brief and change list before hearings.”
- **Journalists/CSOs** — “I need to explain implications to the public with sources.”
- **Citizens** — “I want a readable summary and what changed, quickly.”

## 4) Core Features (MVP)
1. **Document ingest (PDF/HTML)** with version tagging.
2. **Plain‑language summary (Bahasa)** (600–900 words) with glossary of terms.
3. **Clause‑level diff**: detect additions, deletions, edits; jump to changed clauses.
4. **Conflict flags**: semantic search against indexed corpus of existing laws; show likely overlaps with **snippets + citations**.
5. **Public view**: permalink page with metadata, summary, diff, and references.

## 5) Quality Bar / Acceptance
- All summaries contain **citations** (doc + page/section).
- Diffs render within **5s** for 50‑page PDFs on standard laptop.
- At least one conflict flag per meaningful overlap; precision over recall.
- Bahasa output is **clear, neutral, and non‑legalistic**.
- Page is responsive, a11y checked (keyboard/contrast/labels), and prints cleanly.

## 6) Metrics
- **TTR**: time to first readable brief (< 3 minutes after upload).
- **Usage**: # documents uploaded, # share link views.
- **Quality**: human spot‑check precision@5 for conflict flags ≥ 0.6.
- **Trust**: % sections with proper citation coverage ≥ 95%.

## 7) Constraints & Risks
- OCR quality for scans; PDF structure variability.
- Model hallucination → mitigated with strict **RAG + inline citations**.
- Sensitive content: avoid PII; allow redaction before index.

## 8) Rollout Plan
- Pilot with 1 city DPRD commission; then expand to province.
- Advisory banner: “AI‑generated summary; verify with official sources.”

## 9) Open Questions
- Which national/provincial JDIH endpoints are easiest for seed corpus?
- Do we store full PDFs or only text + offsets? (MVP: store both)
