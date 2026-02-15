# Changelog — Documentation and evidence alignment

All documentation is merged to a single evidence-based stand. **Source of truth for evidence:** Scientific/ only.

---

## 2026-02-15 — Documentation merge and cleanup

### Added

- **docs/00_OVERVIEW.md** — Documentation map and conventions; links to canonical docs and Scientific/.
- **docs/10_PRODUCT.md** — Canonical product doc (merged PRD, MVP, user-story summary).
- **docs/20_ARCHITECTURE.md** — Canonical architecture (merged ARCHITECTURE + FRONTEND).
- **docs/30_SAFETY_ETHICS.md** — Canonical safety and ethics; aligned with references and Scientific/.
- **docs/40_CONDITIONS.md** — Canonical conditions doc; dimensions and evidence links.
- **docs/00_DOC_INVENTORY.md** — Inventory and classification of doc files (canonical / duplicate / outdated / temp / removed).
- **docs/MIGRATION_NOTES.md** — Where to find content after the merge; list of removed files.

### Consolidated

- Product: PRD + MVP + USER_STORIES summary → 10_PRODUCT.md. Superseded by 10_PRODUCT for canonical product scope.
- Architecture: ARCHITECTURE + FRONTEND → 20_ARCHITECTURE.md. 20_ARCHITECTURE is canonical.
- Safety/ethics: DESIGN (principles, safety, UI tone) + references → 30_SAFETY_ETHICS.md.
- Conditions: Condition list, dimensions, evidence links → 40_CONDITIONS.md. references/ and Scientific/ are the evidence source.

### Evidence alignment (unchanged from prior work)

- All dimension docs under docs/references/dimensions/ cite Scientific/; Evidence Matrix and EVIDENCE_GAPS updated.
- Conditions (src/conditions and docs/scientific/src/conditions) aligned with Scientific/; dissociation mapped to derealization + depersonalization + time_dilation.

### Cleanup (completed)

- Root ARCHITECTURE.md replaced with a one-line pointer to docs/20_ARCHITECTURE.md.
- Redundant and unused files were removed: docs/AGENTS.md (duplicate of root AGENTS.md), PHASE_*.md, design-docs/index.md, PLANS.md, PRODUCT_SENSE.md, QUALITY_SCORE.md, and docs/scientific/docs/ (duplicate of docs/references). The temporary docs/_archive/ folder was used during cleanup and has since been deleted.
- docs/references/reports/ retained as reference (original deep research); Scientific/ is the canonical evidence source.

See **docs/MIGRATION_NOTES.md** for where to find content and **docs/00_DOC_INVENTORY.md** for classification.
