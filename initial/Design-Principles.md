# Design Principles — Open‑LegisAI Lite
Owner: UX • Date: 2025-09-02 • Version: 1.0

## Experience Tenets
1) **Clarity first** — Bahasa ringkas, non‑legalistik. 
2) **Trust by citation** — Every claim has a source excerpt and link.
3) **Change visibility** — Diff defaults to “Changed only”, with jump‑to‑clause.
4) **Print‑ready** — Single column article mode prints cleanly.

## Visual System (starter)
- **Type**: Inter 14/16 body; 18/24 lead; 24/28 h2.
- **Color**: Neutral grayscale with one accent; avoid “legal red/green” for change coloring; use underline + margin marks.
- **Spacing rhythm**: 8‑pt grid, sections ≥ 32px apart; lists with consistent indent & gap.
- **Components**: FileCard (upload), DiffPane, CiteCallout, GlossaryPill.

## Acceptance Checklist
- 100% keyboard navigation; focus outline visible.
- Headings form a logical outline (h1→h3).
- All citations expandable; copy‑citation button present.
- Diff alignment does not cause reflow jumps while scrolling.
