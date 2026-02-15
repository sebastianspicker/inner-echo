# Final output — Documentation merge (2026-02-15)

This document is the deliverable for the documentation merge: tree, canonical summary, list of removed files, and evidence gaps. The **docs/_archive/** folder has been deleted and all redundant/unused files have been removed.

---

## A) Final tree of `docs/`

```
docs/
├── 00_DOC_INVENTORY.md      # Inventory and classification
├── 00_FINAL_OUTPUT.md       # This file (A–D)
├── 00_OVERVIEW.md           # Canonical: doc map and conventions
├── 10_PRODUCT.md            # Canonical: product (PRD + MVP + stories)
├── 20_ARCHITECTURE.md       # Canonical: architecture + frontend
├── 30_SAFETY_ETHICS.md      # Canonical: safety and ethics
├── 40_CONDITIONS.md         # Canonical: conditions and dimensions
├── CHANGELOG.md             # What changed in the merge
├── CLEANUP_PLAN.md          # Cleanup state (removed files; no archive)
├── MIGRATION_NOTES.md       # Where to find what after merge
├── RELIABILITY.md           # Canonical: reliability and fallback
├── SECURITY.md              # Canonical: security and privacy
├── generated/
│   ├── README.md
│   ├── conditions-catalog.md
│   ├── preset-schema.json
│   └── preset-schema.md
├── references/
│   ├── README.md
│   ├── INDEX.md
│   ├── EVIDENCE_MATRIX.md
│   ├── EVIDENCE_GAPS.md
│   ├── CHANGELOG_SCIENTIFIC_ALIGNMENT.md
│   ├── dimensions/
│   │   ├── hyperarousal.md
│   │   ├── hypoarousal.md
│   │   ├── derealization.md
│   │   ├── depersonalization.md
│   │   ├── time_dilation.md
│   │   └── ...
│   └── reports/             # Reference; Scientific/ is canonical
├── scientific/
│   ├── README.md
│   └── src/conditions/      # Evidence-aligned snapshot
```

Root-level docs (reference; canonical content in docs/):

- **AGENTS.md** (root) — Canonical for standards and glossary.
- **ARCHITECTURE.md** (root) — One-line pointer to docs/20_ARCHITECTURE.md.
- **PRD.md**, **MVP.md**, **USER_STORIES.md**, **DESIGN.md** — Reference; canonical in 10_PRODUCT, 30_SAFETY_ETHICS.

---

## B) Canonical docs (summary)

| Doc | Purpose | Key content |
|-----|---------|-------------|
| **00_OVERVIEW** | Navigation and conventions | Doc map; source of truth (Scientific/, references/, conditions); linking rules. |
| **10_PRODUCT** | Product scope and MVP | Problem/solution; goals and non-goals; features; MVP scope; UX/safety/privacy; success criteria. |
| **20_ARCHITECTURE** | System design | Data flow (video/audio); modules (engine, conditions, ui, app); condition system; controls; fallback; state; safety boundary; links to RELIABILITY, SECURITY. |
| **30_SAFETY_ETHICS** | Safety and ethics | Framing (metaphorical, non-diagnostic); non-negotiables (Stop, Safe Mode, Reduced Motion, Audio optional); design principles; safety by design; UI tone; privacy; links to references and Scientific/. |
| **40_CONDITIONS** | Conditions and evidence | Condition list; dimensions; source of truth; condition→dimensions table; authoring; evidence alignment; links to Evidence Matrix, dimension docs, EVIDENCE_GAPS, AGENTS. |

Full content is in the files themselves; this table is the index.

---

## C) Files removed (cleanup completed)

| File | Classification | Reason |
|------|----------------|--------|
| docs/AGENTS.md | duplicate | Duplicate of root AGENTS.md; root is canonical. |
| docs/PLANS.md | temp | Stub only. |
| docs/PRODUCT_SENSE.md | temp | Stub only. |
| docs/QUALITY_SCORE.md | temp | Stub only. |
| docs/PHASE_01_TESTING.md … PHASE_12_*.md | outdated | Phase notes; behaviour in 20_ARCHITECTURE, RELIABILITY. |
| docs/design-docs/index.md or design-docs/ | outdated | Content in 20_ARCHITECTURE and conditions docs. |
| docs/scientific/docs/ (subtree) | duplicate | Duplicate of docs/references and reports. |
| docs/_archive/ | — | Temporary archive folder; deleted. |

---

## D) Evidence gaps (per dimension / condition)

Single source: **docs/references/EVIDENCE_GAPS.md**. Summary:

| Gap | Scope | Resolution |
|-----|--------|------------|
| **1. Dimension “dissociation”** | Dissociation condition | Map to derealization + depersonalization + time_dilation; no separate “dissociation” dimension. |
| **2. Exact safety constants** | Safe Mode / flash limits | Use repo safe_mode_clamps and AGENTS.md; do not cite Scientific/ for numeric constants not in Scientific/. |
| **3. Biomarker → sensation** | Any AV motif | No “is” or “represents” biomarker; use “suggests,” “consistent with,” “may align with.” |
| **4. Literal “what it looks like”** | All conditions | Metaphorical, non-diagnostic only; no literal-depiction claims. |
| **5. Unsupported motifs** | Any node/param not in EVIDENCE_MATRIX | Replace with supported motif or label speculative + strong safety caps. |
| **6. Time dilation direction** | time_dilation | No single “slow-motion” claim; use temporal instability; offer Reduced Motion. |
| **7. Depersonalization body** | depersonalization | No body morphing; use subtle distance (vignette, reverb, optional micro-latency). |
| **8. References outside Scientific/** | Any citation | Only Scientific/ is source of truth; else “Unsupported” or “Needs evidence.” |

Per-condition: each profile must align with **EVIDENCE_MATRIX** and dimension docs; gaps above apply to all conditions that use those dimensions or motifs.
