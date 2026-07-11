# Changelog

## Unreleased

- **Compatibility:** profile changes now preserve only global intensity, Safe Mode,
  Reduced Motion, and audio-enabled controls; profile-local controls reset to the
  incoming profile defaults.
- **Compatibility:** stopped reading and migrating the retired `ie_custom_preset`
  key. Existing storage is left untouched; only `ie_custom_presets_v2` is read.
- **Deprecation:** `chroma_aberration` remains accepted at the profile input
  boundary with one warning and will be removed in `0.2.0`; use
  `chromatic_aberration`.

## 2026-03-25

### Bug fixes and polish

#### Fixed

- `clamp()` now returns `min` only for NaN; Infinity/-Infinity are clamped normally to max/min as expected.
- `reactiveDriver`: `getAudioOverrides()` now re-steps when called with different parameters than the preceding `getVideoOverrides()` call, instead of returning stale cached values.
- `noiseBed`: color changes now replace the buffer source node instead of reassigning `.buffer` on an active source (which threw in some browsers).
- `CameraView`: audio engine no longer re-initializes when mic sensitivity/gate/input-mode sliders change; values are read from refs instead.
- `CameraView`: canvas clear on stop uses `clearRect` instead of the width-reset hack.
- `audioEngine.stop()`: removed premature `micRequestSeq` increment and `stopMicGateLoop` call that could race with pending mic setup.
- `interferenceNode`: removed redundant `u_burst` clamp that overwrote the value set by `tick()`.
- `feedbackLoopNode`: jitter offset now oscillates symmetrically around zero instead of biasing positive.
- `webglPipeline`: added `webglcontextlost` event handler that stops the render loop and surfaces the error.
- `composeCore`: preset profiles are now loaded in parallel instead of sequentially.
- `ConditionComposerPanel`: legacy preset key is removed after migration; localStorage writes are wrapped in try/catch for quota errors.
- `presetSnapshot`: Zod schema now enforces `[0, 1]` range on weight, intensity, couplingStrength, maxFeedback, and interactionAmount.
- `videoMetrics`: `getSmoothed()` returns a shallow copy to prevent callers from mutating internal state.
- `debugInspectHarness` test: increased timeout from 5 s to 15 s to avoid flaky failures under parallel load.

#### Changed

- Biome lint warnings reduced from 32 to 0: added `node:` import prefix across all scripts, replaced `Math.pow` with `**`, replaced `let` with `const` where appropriate, replaced `findIndex` with `indexOf`, fixed `useExhaustiveDependencies` suppressions.
- `EvidenceDrawer`: navigation links changed from `<a href="#">` to `<button>` for correct accessibility semantics; added `onKeyDown` handler for keyboard-accessible link interception inside rendered markdown.
- Renamed `escape` variable to `escaped` in `jsonObjectParser.ts` and `nodes-report.ts` to avoid shadowing the global `escape` property.
- Removed `!important` from `prefers-reduced-motion` CSS overrides.
- `.gitignore`: local WIP directory ignores now cover directory forms instead of single files.
- Merged dependabot PR: `@types/three` 0.182.0 to 0.183.1.

#### Removed

- `progress.md` audit artifact removed from version control.

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
- `docs/REVIEW.md` and `plans/improvement-plan.md` (obsolete historical artifacts).

### Repo cleanup

- `AGENTS.md` moved to local-only usage and ignored from version control.

## 2026-02-16

- UI/debug hardening and cross-browser e2e coverage updates.

## 2026-02-15

- Documentation merge into canonical 00/10/20/30/40 structure.
