## Archive — 2026-02-15 (SSOT migration)

This folder contains **deprecated pre-SSOT duplicates** that previously lived under `src/conditions/**`.

Reason:
- Canonical condition data and research references now live in:
  - `src/conditions/**` (catalog, dimensions, mappings, profiles)
  - `docs/references/**` (references/evidence)
- Any contradictions must be removed from the runtime/authoring surface.

Archived paths:
- `src/conditions/catalog.json` (contained extra condition `dissociation`, not present in SSOT)
- `src/conditions/experience-dimensions.json`
- `src/conditions/dimension-to-signal-mapping.json`
- `src/conditions/profiles/*.json`

See also:
- `MIGRATION_NOTES.md` (mapping + renames + behavior changes)

# Archive 2026-02-15 — Documentation merge

These files were archived during the documentation consolidation. **Canonical** content lives in the main docs (see [docs/00_OVERVIEW.md](../00_OVERVIEW.md) and [docs/MIGRATION_NOTES.md](../MIGRATION_NOTES.md)).

## Why archived

| File | Reason |
|------|--------|
| AGENTS.md | Duplicate of root AGENTS.md; root is canonical. |
| PLANS.md | Stub only ("Not populated in Phase 0"). |
| PRODUCT_SENSE.md | Stub only. |
| QUALITY_SCORE.md | Stub only. |
| PHASE_01_TESTING.md … PHASE_12_*.md | Phase implementation notes; behaviour covered by 20_ARCHITECTURE, RELIABILITY, SECURITY. |
| design-docs/index.md | Content covered by 20_ARCHITECTURE and conditions docs; referenced Phase 5. |
| scientific_docs_copy/ | Copy of docs/references and reports; Scientific/ + docs/references/ are canonical. |

Nothing was deleted; these copies are for reference only.
