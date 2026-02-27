# Migration Notes (Current)

This file documents where canonical content lives after doc consolidation and cleanup.

## Canonical map

| Topic | Canonical path |
|---|---|
| Contributor standards and safety guardrails | `AGENTS.md` |
| Product scope and goals | `docs/10_PRODUCT.md` |
| Architecture and runtime boundaries | `docs/20_ARCHITECTURE.md` |
| Safety and ethics | `docs/30_SAFETY_ETHICS.md` |
| Conditions model | `docs/40_CONDITIONS.md` |
| Evidence corpus and matrix | `docs/references/**` + `docs/REFERENCES_AUDIT.md` |
| Generated condition docs/schema | `docs/generated/**` |
| Reliability and browser matrix | `docs/RELIABILITY.md` |
| Security and privacy posture | `docs/SECURITY.md` |
| Release-candidate runbook | `docs/RELEASE_RC.md` |

## Historical artifacts

The following files remain intentionally as historical context (non-canonical):

- `docs/REVIEW.md`
- `plans/improvement-plan.md`

## Removed/merged patterns

- Duplicate AGENTS copy in `docs/` removed; root `AGENTS.md` is canonical.
- Stub/phase-specific transient docs remain removed.
- Evidence links now point to maintained `docs/references/**` paths.

## Validation expectation

After doc moves/cleanups, run the quality gates:

- `npm run check` (recommended full gate: verify + e2e)
- `npm run screenshots:readme`
- `npm run screenshots:verify`
- `npm run lint`
- `npm test`
- `npm run verify`
- `npm run test:e2e`
