# Cleanup plan — Current state (completed)

This document records the cleanup applied after the documentation merge. The **docs/_archive/** folder has been removed and all redundant/unused files have been deleted.

---

## Keep (canonical or reference)

| Path | Role |
|------|------|
| **AGENTS.md** (root) | Canonical: standards, glossary, Definition of Done, how to add Condition. |
| **docs/00_OVERVIEW.md** | Canonical: doc map and conventions. |
| **docs/00_DOC_INVENTORY.md** | Inventory and classification. |
| **docs/10_PRODUCT.md** | Canonical product (merged PRD/MVP/stories). |
| **docs/20_ARCHITECTURE.md** | Canonical architecture (merged ARCHITECTURE+FRONTEND). |
| **docs/30_SAFETY_ETHICS.md** | Canonical safety and ethics. |
| **docs/40_CONDITIONS.md** | Canonical conditions and evidence links. |
| **docs/PRD.md**, **docs/MVP.md**, **docs/USER_STORIES.md**, **docs/DESIGN.md** | Reference; canonical content in 10_PRODUCT, 30_SAFETY_ETHICS. |
| **docs/ARCHITECTURE.md**, **docs/FRONTEND.md** | Reference; canonical merged in 20_ARCHITECTURE. |
| **docs/RELIABILITY.md**, **docs/SECURITY.md** | Canonical for reliability and security. |
| **docs/references/** (README, INDEX, EVIDENCE_MATRIX, EVIDENCE_GAPS, CHANGELOG_SCIENTIFIC_ALIGNMENT, dimensions/*) | Canonical evidence and dimension rationale. |
| **docs/references/reports/** | Reference (original deep research); Scientific/ is canonical evidence source. |
| **docs/generated/** | Generated; do not edit. |
| **docs/scientific/README.md**, **docs/scientific/src/conditions/** | Canonical evidence-aligned conditions snapshot. |
| **Scientific/** | Single source of truth for evidence. |
| **src/conditions/README.md**, EVIDENCE.md, MAPPING.md, EVIDENCE_STAND.md | Canonical for conditions folder. |
| **docs/CHANGELOG.md**, **docs/MIGRATION_NOTES.md**, **docs/CLEANUP_PLAN.md** | Changelog and migration. |

---

## Removed (cleanup completed)

| Path | Reason |
|------|--------|
| docs/AGENTS.md | Duplicate of root AGENTS.md; root is canonical. |
| docs/PLANS.md | Stub only. |
| docs/PRODUCT_SENSE.md | Stub only. |
| docs/QUALITY_SCORE.md | Stub only. |
| docs/PHASE_01_TESTING.md … PHASE_12_*.md | Phase implementation notes; behaviour in 20_ARCHITECTURE, RELIABILITY. |
| docs/design-docs/index.md (or design-docs/) | Outdated; content in 20_ARCHITECTURE and conditions docs. |
| docs/scientific/docs/ (subtree) | Duplicate of docs/references and reports. |
| docs/_archive/ | Temporary archive folder; deleted. |

---

## Root ARCHITECTURE.md

Replaced with a one-line pointer to docs/20_ARCHITECTURE.md so there is a single canonical architecture doc.
