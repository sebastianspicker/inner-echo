# Documentation inventory and classification

Purpose: list documentation files and classify them (canonical / duplicate / outdated / temp / removed). Used to support the merge and cleanup.  
**Source of truth for evidence:** `Scientific/` only. No external citations; unsubstantiated claims are labeled "Evidence gap".

---

## Root level

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **AGENTS.md** | Standards, guardrails, glossary, Definition of Done, how to add a Condition, safety (Stop/Safe Mode/Reduced Motion). | **canonical** | Keep as single agent/contributor entry point. |
| **ARCHITECTURE.md** | Short system architecture, data flow, module boundaries. | **duplicate** | Root file is now a one-line pointer to `docs/20_ARCHITECTURE.md` (canonical). |

---

## docs/ (top-level)

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **PRD.md** | Product requirements: problem, solution, non-goals, features, safety/ethics, privacy. | **canonical** | Merge into `docs/10_PRODUCT.md`. |
| **MVP.md** | MVP scope, in/out of scope, acceptance criteria. | **canonical** | Merge into `docs/10_PRODUCT.md`. |
| **DESIGN.md** | Creative & ethical design, principles, example mappings, safety by design, UI tone. | **canonical** | Merge into `docs/30_SAFETY_ETHICS.md` (ethics/safety) and `docs/40_CONDITIONS.md` (mapping examples → reference Evidence only). |
| **USER_STORIES.md** | Epics and user stories with acceptance criteria. | **canonical** | Merge into `docs/10_PRODUCT.md` (condensed) or keep as appendix; link from 10_PRODUCT. |
| **ARCHITECTURE.md** | System architecture, data flow, AudioGraph, modules. | **canonical** | Becomes backbone of `docs/20_ARCHITECTURE.md`. |
| **FRONTEND.md** | Frontend stack, UI/engine layers, rendering, condition system. | **canonical** | Merge into `docs/20_ARCHITECTURE.md`. |
| **RELIABILITY.md** | Browser matrix, WebGL fallback, known issues. | **canonical** | Keep; link from 20_ARCHITECTURE or 00_OVERVIEW. |
| **SECURITY.md** | Privacy, no third-party calls, permissions, CSP. | **canonical** | Keep; link from 30_SAFETY_ETHICS. |
| **AGENTS.md** | "How We Work", principles, glossary, repo layout. | **duplicate** | Removed; root AGENTS.md is canonical. |
| **PLANS.md** | Placeholder: "Execution plans… Not populated in Phase 0." | **temp** | Removed (stub only). |
| **PRODUCT_SENSE.md** | Placeholder: "Structure only in Phase 0." | **temp** | Removed (stub only). |
| **QUALITY_SCORE.md** | Placeholder: "Structure only in Phase 0." | **temp** | Removed (stub only). |
| **PHASE_01_TESTING.md** | Phase 1 manual testing guide (camera). | **removed** | Phase implementation note; behaviour in 20_ARCHITECTURE, RELIABILITY. |
| **PHASE_02_TESTING.md** | Phase 2 testing. | **removed** | Same. |
| **PHASE_06_VIDEO_EFFECTS_AUTO_UI_PERF_GUARD.md** | Phase 6 implementation notes. | **removed** | Same. |
| **PHASE_08_AUDIO_TO_VIDEO_MODULATION.md** | Phase 8 implementation notes. | **removed** | Same. |
| **PHASE_09_MIC_OPTIONAL_SAFETY.md** | Phase 9 mic safety. | **removed** | Same. |
| **PHASE_12_RELEASE_READINESS.md** | Phase 12 release checklist. | **removed** | Same. |

---

## docs/design-docs/

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **index.md** | Data-driven conditions (Phase 5), planned contents. | **outdated** | Removed; content in ARCHITECTURE and conditions docs. |

---

## docs/references/

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **README.md** | References folder purpose; Scientific/ as source of truth; safety; file layout. | **canonical** | Keep. |
| **INDEX.md** | Dimension index (links to dimension docs). | **canonical** | Keep. |
| **EVIDENCE_MATRIX.md** | Dimension → phenomena → motifs → Scientific citation; evidence strength. | **canonical** | Keep. |
| **EVIDENCE_GAPS.md** | List of evidence gaps (Scientific/ silent). | **canonical** | Keep. |
| **CHANGELOG_SCIENTIFIC_ALIGNMENT.md** | Changelog of Scientific/ alignment. | **canonical** | Keep. |
| **dimensions/*.md** (13 files) | Per-dimension rationale (Scientific-backed). | **canonical** | Keep. |
| **reports/deep-research-report.md** | Original deep research (hyperarousal, hypervigilance, panic_peaks). | **canonical** | Kept; Scientific/ is canonical; reports are reference. |
| **reports/deep-research-report-2.md** | Original deep research (remaining dimensions). | **canonical** | Same. |

---

## docs/scientific/

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **README.md** | Role of docs/scientific; sync with src/conditions. | **canonical** | Keep (short). |
| **src/conditions/** (catalog, profiles, experience-dimensions, dimension-to-signal-mapping) | Canonical scientific-aligned conditions (result of analysis). | **canonical** | Keep; referenced as evidence-aligned snapshot. |
| **docs/scientific/docs/references/** | Full copy of docs/references (INDEX, README, EVIDENCE_MATRIX, dimensions, reports). | **duplicate** | Removed; use docs/references + Scientific/ only. |

---

## docs/generated/

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **README.md** | How to generate; do not edit. | **canonical** | Keep. |
| **conditions-catalog.md** | Generated conditions table. | **canonical** | Keep (generated). |
| **preset-schema.md**, **preset-schema.json** | Generated schema for profiles. | **canonical** | Keep (generated). |

---

## Scientific/

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **INVENTORY.md** | List of Scientific files; topics; key claims; safety. | **canonical** | Keep. |
| **BIBLIOGRAPHY.md** | DOIs/PMIDs/URLs as in Scientific/. | **canonical** | Keep. |
| **deep-research-report.md** | Evidence for hyperarousal, hypervigilance, panic_peaks. | **canonical** | Keep. |
| **deep-research-report-2.md** | Evidence for remaining dimensions. | **canonical** | Keep. |

---

## src/conditions/

| File | Purpose | Classification | Decision + reason |
|------|---------|----------------|-------------------|
| **README.md** | Condition authoring layer; files; safety; implementer notes. | **canonical** | Keep. |
| **EVIDENCE.md** | Quick index: dimension → evidence strength → rationale doc. | **canonical** | Keep. |
| **MAPPING.md** | Condition → dimensions (starter set); evidence strength; safety note. | **canonical** | Keep. |
| **EVIDENCE_STAND.md** | Which JSON the repo uses; evidence status; sync with docs/scientific. | **canonical** | Keep. |

---

## Summary counts

- **canonical:** 28 (root AGENTS; docs references + dimensions; Scientific/; src/conditions; consolidated 00–40).
- **duplicate:** 3 (root ARCHITECTURE vs docs/ARCHITECTURE; docs/AGENTS vs root AGENTS; docs/scientific/docs/references vs docs/references).
- **outdated:** 1 (design-docs/index).
- **temp:** 3 (PLANS, PRODUCT_SENSE, QUALITY_SCORE).
- **removed:** PHASE_*.md, design-docs, docs/AGENTS.md, docs/PLANS.md, docs/PRODUCT_SENSE.md, docs/QUALITY_SCORE.md, docs/scientific/docs/; docs/_archive/ deleted.
