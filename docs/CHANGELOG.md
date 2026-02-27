# Changelog

## 2026-02-27

### Release candidate readiness (`0.1.0-rc.1`)

#### Added

- RC scripts:
  - `npm run screenshots:capture`
  - `npm run screenshots:convert`
  - `npm run screenshots:readme`
  - `npm run screenshots:verify`
  - `npm run release:rc:local`
  - `npm run release:rc:checklist`
- Deterministic README screenshot pipeline:
  - `tests/e2e/readme-screenshots.mjs`
  - `scripts/convert-readme-screenshots.mjs`
  - `scripts/verify-readme-screenshots.mjs`
  - `assets/readme/screenshots/manifest.json`
- Screenshot manifest test:
  - `tests/screenshotManifest.test.ts`
- New RC runbook:
  - `docs/RELEASE_RC.md`

#### Changed

- `package.json` version bumped to `0.1.0-rc.1`.
- CI includes `release_candidate_gate` job for RC parity (`npm run release:rc:local` + `npm run screenshots:verify`).
- README restructured for RC with curated screenshot tour and explicit screenshot generation policy.
- `docs/RELIABILITY.md` and `docs/SECURITY.md` now define explicit RC workflow and tagging flow.

#### Known limitations

- Production build may still emit large bundle warnings from Vite.
- RC tags remain provisional until manual smoke and CI parity are both green.

### Added

- Root `AGENTS.md` restored as canonical contributor/safety guide.
- New shared fallback profile module: `src/conditions/fallbackProfiles.ts`.
- New preset snapshot module with versioned payloads: `src/ui/presetSnapshot.ts`.
- New URL share codec for presets: `src/ui/presetShare.ts`.
- New reusable control primitives: `src/ui/controls/LabeledSlider.tsx`, `src/ui/controls/ToggleField.tsx`.
- New hooks for controller boundaries:
  - `src/ui/hooks/useCameraController.ts`
  - `src/ui/hooks/useAudioController.ts`
  - `src/ui/hooks/useOverlayController.ts`
  - `src/ui/hooks/useImmersiveIdleState.ts`
- New scripts aliases:
  - `npm run check`
  - `npm run clean:local`
- New regression tests:
  - `tests/presetSnapshot.test.ts`
  - `tests/presetShare.test.ts`
  - `tests/dpdrReactiveTarget.test.ts`
  - `tests/webglParams.test.ts`
  - `tests/webglLoop.test.ts`

### Changed

- `docs/00_DOC_INVENTORY.md`, `docs/MIGRATION_NOTES.md` rewritten to current canonical state.
- `src/conditions/profiles/dpdr.json` reactive target fixed (`video.haze.amount`), resolving contract mismatch.
- `scripts/conditions-validate.ts` now treats unresolved reactive targets as errors (aligned with contract verification).
- Runtime logging standardized to `src/utils/logger.ts` across loader/graph/reactive/audio/onboarding/debug paths.
- `ConditionComposerPanel` now includes:
  - Preset Library v2 (save/load/delete/overwrite)
  - URL hash import/export sharing
  - Condition and dimension search/filter
- `CameraView` now includes keyboard shortcuts (`K`, `E`, `D`) and extracted idle-state/controller helpers.
- `DebugPanel` now supports structured JSON diagnostics export.
- `webglPipeline` internals split into dedicated helpers:
  - `src/engine/canvas/webgl/params.ts`
  - `src/engine/canvas/webgl/loop.ts`
  - `src/engine/canvas/webgl/resources.ts`
  - plus existing `constants.ts`, `diagnostics.ts`, `renderHelpers.ts`.
- UI controls migrated off legacy `camera-view__*` selectors to unified `ie-*` control primitives in:
  - `src/ui/AudioMicControls.tsx`
  - `src/ui/EffectControls.tsx`
  - `src/ui/CameraView.css`
- Mobile UX pass:
  - sticky header actions on small screens
  - simplified one-column scroll hierarchy in the control panel.
- Accessibility pass:
  - stronger `:focus-visible` treatment for interactive controls
  - `EvidenceDrawer` focus restore + Tab trap + ArrowUp/ArrowDown keyboard navigation in evidence nav.

### Removed

- `docs/AGENTS.md` (duplicate copy under `docs/`).

## 2026-02-16

- UI/debug hardening and cross-browser e2e coverage updates.

## 2026-02-15

- Documentation merge into canonical 00/10/20/30/40 structure.
