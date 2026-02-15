## Conditions + references migration notes (2026-02-15)

### Goal

Migrate canonical condition data and research references out of `inner-echo-conditions-and-docs/` into this repo’s normal structure, then remove the SSOT folder.

### Canonical locations (post-migration)

- **Conditions (data + profiles)**: `src/conditions/**`
- **Evidence / references**: `docs/references/**`
- **Generated docs** (derived): `docs/generated/**`

### What changed

- **Condition data moved in 1:1**
  - Copied canonical files into:
    - `src/conditions/catalog.json`
    - `src/conditions/experience-dimensions.json`
    - `src/conditions/dimension-to-signal-mapping.json`
    - `src/conditions/profiles/*.json`
  - Copied canonical references into:
    - `docs/references/INDEX.md`, `docs/references/README.md`, `docs/references/EVIDENCE_MATRIX.md`
    - `docs/references/dimensions/*.md`
    - `docs/references/reports/deep-research-report*.md`

- **Runtime loading paths updated**
  - App now loads catalog and profiles from `src/conditions/**` (see `src/conditions/loader.ts`).

- **Validation script**
  - New script: `npm run conditions:validate` (`scripts/conditions-validate.ts`)
  - Loads catalog + all profiles, builds the video graph, and verifies referenced docs exist under `docs/references/**`.

- **Archive for removed pre-canonical duplicates**
  - Prior duplicates and notes live under `docs/_archive/2026-02-15/`.

### Notes

- **Removed condition**
  - **`dissociation`** existed in a prior `src/conditions/catalog.json` but is not present in the canonical catalog that was migrated in.
  - Archived at `docs/_archive/2026-02-15/src-conditions/`.

- **Docs index path alias**
  - `src/conditions/catalog.json` references `docs/references/dimensions/index.md`.
  - Canonical human index is `docs/references/INDEX.md`, so `docs/references/dimensions/index.md` exists as a small alias file.

