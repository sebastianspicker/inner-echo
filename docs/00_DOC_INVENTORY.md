# Documentation Inventory

Purpose: current, source-backed inventory of maintained documentation and generated artifacts in the local checkout as of 2026-07-11.

## Canonical docs

| Path | Status | Notes |
|---|---|---|
| `README.md` | canonical | Project overview and local dev entrypoint. |
| `PRODUCT.md` | canonical | Public product position, audience, boundaries, and accessibility commitment. |
| `DESIGN.md` | canonical | Public-alpha visual system and UI guardrails. |
| `docs/frontend-ux-audit.md` | canonical | Source-reviewed public-alpha UX baseline and verification priorities. |
| `docs/00_OVERVIEW.md` | canonical | Navigation index for docs. |
| `docs/10_PRODUCT.md` | canonical | Product goals, scope, and non-goals. |
| `docs/20_ARCHITECTURE.md` | canonical | Runtime architecture and module boundaries. |
| `docs/30_SAFETY_ETHICS.md` | canonical | Safety, ethics, and UX guardrails. |
| `docs/40_CONDITIONS.md` | canonical | Condition model and evidence linkage. |
| `docs/RELIABILITY.md` | canonical | Browser support and fallback expectations. |
| `docs/SECURITY.md` | canonical | Privacy/security constraints and release checks. |
| `docs/RELEASE_RC.md` | canonical | Single-pass release-candidate runbook and tagging workflow. |
| `docs/CONTRACT_VERIFICATION.md` | canonical | Contract verification expectations. |
| `docs/CHANGELOG.md` | canonical | High-level repository documentation changelog. |

## Evidence docs

| Path | Status | Notes |
|---|---|---|
| `docs/references/README.md` | canonical | Evidence methodology and boundaries. |
| `docs/references/INDEX.md` | canonical | Human navigation index for evidence docs. |
| `docs/references/EVIDENCE_MATRIX.md` | canonical | Dimension-to-motif evidence matrix. |
| `docs/references/dimensions/*.md` | canonical | Dimension rationale pages. |
| `docs/references/conditions/*.md` | canonical | Condition evidence summaries. |
| `docs/references/motifs/*.md` | canonical | Motif evidence summaries. |
| `docs/references/reports/*.md` | canonical | Long-form research synthesis corpus. |
| `docs/REFERENCES_AUDIT.md` | canonical | Generated/maintained reference wiring report. |

## Generated docs

| Path | Status | Notes |
|---|---|---|
| `docs/generated/README.md` | generated | Generation workflow contract. |
| `docs/generated/conditions-catalog.md` | generated | Derived from `src/conditions/**`. |
| `docs/generated/preset-schema.json` | generated | Derived schema output. |
| `docs/generated/preset-schema.md` | generated | Human-readable schema output. |

## Historical and local-only docs

| Path | Status | Notes |
|---|---|---|
| `docs/archive/` | local archive | Historical migration, audit, plan, status, and ledger artifacts retained only for local context. This directory is ignored and should not be committed or used as active navigation. |

## Public repository boundary

- `assets/readme/screenshots/` is the only maintained public screenshot set. Its manifest is verified by `npm run screenshots:verify`.
- `.env.example` contains non-secret local defaults. All other `.env*` files and common credential/key formats are ignored at any repository depth.
- `.codacy/`, `.codegraph/`, `.serena/`, `.impeccable/`, `.codex/`, editor metadata, `reports/`, `coverage/`, `dist/`, and ad-hoc `screenshots/` are local-only.
- Generated documentation under `docs/generated/` is public because it is reproducible from repository contracts. Build and analysis output is not public documentation.

## Cleanup policy

- Keep canonical docs internally link-consistent.
- Keep generated docs reproducible from scripts; do not hand-edit.
- Keep historical and completed remediation artifacts out of active docs; archive them locally or delete them when superseded.
- Remove duplicate stubs, phase scraps, plan files, ledgers, and status files when they are superseded.
- Do not publish absolute workstation paths, private contact details, credentials, local tool state, or raw camera material.
