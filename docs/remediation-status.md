# PR #26 remediation status

This document records current dispositions for the historical logic/correctness
(`LC`) and deprecation/simplification (`DS`) audits. The dated audit files remain
unchanged as evidence of what was observed at the PR #26 head.

## Scope and branch

- Remote stack base: `agent/runtime-contract-hardening` at
  `10251abf579ad29f3fb9c3789bec828c35f06ce0`.
- Remediation branch: `agent/remediate-pr26-all-issues`.
- Local execution: isolated Node 22 clone; the unrelated dirty `main` checkout is
  excluded.
- Publication and Codacy Cloud mutation remain gated on complete local checks.

## CI and reviewer findings

| Area | Status | Evidence |
|---|---|---|
| Dependency audit | Fixed locally | DOMPurify 3.4.11, Vite 8.1.4, esbuild 0.28.1, and undici 7.28.0; clean install/rebuild and `npm audit --audit-level=low` report zero vulnerabilities. |
| Audio startup races | Fixed locally | Desired-state ref and monotonic request generation invalidate stale startup; focused audio/context tests pass. |
| Microphone metrics | Fixed locally | RMS/flux remain route-weighted; centroid and bands retain spectral shape; inactive routes omit mic fields. |
| Renderer fallback | Fixed locally | Separate WebGL and 2D canvases, raw-video final fallback, truthful diagnostics, and context-loss tests. |
| Safari audio | Retained and verified | Standard constructor, `webkitAudioContext`, and unavailable-constructor tests pass; browser runtime remains part of the final gate. |
| Sanitized evidence DOM | Fixed locally | DOMPurify returns a `DocumentFragment`; React mounts a cloned fragment without `dangerouslySetInnerHTML`. |
| E2E ownership | Fixed locally | Readiness and browser-launch failures clean up; repeated destruction and port reacquisition are covered. |

## Logic and correctness audit

| Item | Disposition | Current evidence |
|---|---|---|
| LC-001 | Closed | Real `useProfileLoad` stale-resolution tests cover loading-state cleanup and latest-result ownership. |
| LC-002 | Closed | Error camera state has distinct truthful messaging and component tests. |
| LC-003 | Closed | Dedicated fallback canvas, raw-video mode, diagnostics, cleanup, and forced failure tests. |
| LC-004 | Closed | V2 corruption diagnostics and partial recovery remain visible and tested. |
| LC-005 | Closed by compatibility removal | Pre-v2 migration is no longer read or written; the old key is left untouched. |
| LC-006 | Closed | Composition rejection selects an explicit fallback and clears stale report state. |
| LC-007 | Closed | Picker coverage preserves the active valid selection when catalog options are partial. |
| LC-008 | Closed | Canonical chromatic name drives graph, coupling, mappings, registry, serializers, and generated docs. |
| LC-009 | Closed | Audio metric tests verify consistent analyser reads and route behavior. |
| LC-010 | Closed | Latest desired audio state controls status and stale startup completion. |
| LC-011 | Closed | Pure composer concurrency tests no longer claim hook coverage; hook races are tested separately. |
| LC-012 | Closed | Robustness coverage asserts direct schema rejection separately from JSON round-trip behavior. |

## Deprecation and simplification audit

| Item | Disposition | Current evidence |
|---|---|---|
| DS-001 | Closed | `ie_custom_preset` migration/read path and migration-only tests removed intentionally. |
| DS-002 | Closed | Legacy `getRms` and flat reactive override contracts removed. |
| DS-003 | Closed | `composeCore` compatibility type re-exports removed. |
| DS-004 | Closed with grace period | `chromatic_aberration` is canonical; input-only alias warns once and is scheduled for removal in `0.2.0`. |
| DS-005 | Retained and verified | `webkitAudioContext` is an explicit Safari boundary with constructor tests. |
| DS-006 | Closed | Dead storage wrappers removed from the production surface. |
| DS-007 | Closed | Duplicate audio contract types removed in favor of the condition schema. |
| DS-008 | Closed | Named pure decisions, lifecycle helpers, and focused subcomponents bring the tuned complexity scan to zero without changing state ownership. |
| DS-009 | Closed | `CameraView` lifecycle decisions are decomposed and EvidenceDrawer remains lazy; focused behavior and full unit tests pass. |
| DS-010 | Closed | Legacy migration is gone and storage/UI helpers are below the tuned complexity thresholds. |
| DS-011 | Closed | Shared transactional harness ownership and injected cleanup failures are tested. |
| DS-012 | Closed | `.nvmrc` and `engines.node` pin Node 22, matching CI. |
| DS-013 | Closed | Two-canvas and raw-video fallback contract is documented and tested. |
| DS-014 | Closed | Validation/report scripts are split into focused phases; generated output and contract reports remain stable. |

## Local verification state

Completed during remediation:

- Node 22 clean install and rebuild.
- Zero-vulnerability npm audit.
- Focused runtime, security, profile, alias, PRNG, and harness regressions.
- Typecheck, Biome lint, production build, condition validation, evidence
  verification, and contract verification (`208` OK, `0` warnings, `0` errors).
- Tuned six-tool local Codacy analysis: `0` issues and `0` tool errors across
  Biome, Jackson, Lizard, markdownlint, Opengrep, and Trivy.

Still required before publication:

- Coverage, complete E2E/preview/runtime matrix, screenshot verification, and
  two consecutive full local gate runs.
- Read-only remote check verification at the published head.
- Codacy Cloud import/reanalysis only after every local gate is green.
