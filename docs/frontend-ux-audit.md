# Frontend UX Audit — Current public-alpha status

Status: source-backed status of the current local checkout as of 2026-07-11. Automated browser results are recorded separately from manual assistive-technology and real-device evidence.

## Scope and evidence

Reviewed the current shell, welcome/setup flow, runtime status, safety controls, evidence dialog, responsive styles, and E2E assertions in:

- `src/index.css`
- `src/ui/CameraView.css`
- `src/ui/ConditionComposerPanel.tsx`
- `src/ui/WelcomeStep.tsx`
- `src/ui/SafetyControls.tsx`
- `src/ui/CameraHeader.tsx`
- `src/ui/CameraView.tsx`
- `src/ui/EvidenceDrawer.tsx`
- `tests/e2e/cross-browser-smoke.e2e.mjs`

The target is the confirmed public-first, guided client-only media-lab product position in [`../PRODUCT.md`](../PRODUCT.md). The intended visual system is documented in [`../DESIGN.md`](../DESIGN.md).

## Implemented public-alpha contracts

- Welcome is an in-flow disclosure. Continuing records a versioned local acknowledgement but does not request camera, microphone, or audio.
- Experience dimensions lead the guided setup; curated and combined collections remain available without changing saved/hash wire values.
- Safe Mode defaults on, Reduced Motion inherits the operating-system preference until explicitly changed, and audio/microphone default off.
- Start camera and Stop Everything remain explicit, 44px controls adjacent to the stage; controls do not auto-hide and no global single-character shortcuts remain.
- Runtime status distinguishes camera, effects, sound, loading, error, raw-preview, and unavailable states. Catalog/profile failures expose retries.
- Method & Evidence uses a native dialog with topic navigation, Escape behavior, and focus restoration.
- The initial entry defers the audiovisual runtime; raw camera can appear while effects prepare.
- Opaque surfaces, visible focus treatment, readable text tokens, and responsive stage-first layout implement the current design contract.

## Current automated evidence

- TypeScript typecheck passed.
- Vitest passed 61 files and 741 tests with the repository's longer diagnostic-test timeout.
- Coverage passed at 90.93% statements, 75.62% branches, 88.80% functions, and 93.39% lines.
- Production build passed; the initial entry was 113.26 kB gzip, about 54.8% below the former 250.71 kB baseline. The audiovisual runtime is emitted separately.
- Contract verification passed 208 checks without warnings or errors.
- Dev and preview E2E flows passed in the installed Chrome, Firefox, and WebKit Playwright engines, including the UI contract suite.
- The ten-file canonical screenshot manifest passed verification.

## Remaining release evidence

- Complete a manual VoiceOver/Safari pass and at least one NVDA/Chrome or NVDA/Firefox pass through the core workflow before claiming WCAG 2.2 AA conformance.
- Record a real Safari camera/audio smoke and one physical mobile-camera smoke; Playwright's WebKit engine does not prove either.
- Run task-based usability sessions spanning general-public, facilitator, and lived-experience perspectives before moving beyond public alpha.
- The repository-wide lint gate remains blocked by the pre-existing formatting finding in `src/engine/canvas/videoMetrics.ts`; it is outside this documentation/privacy cleanup.

This audit supports public-alpha/RC evaluation. It does not claim production, clinical, real-device, screen-reader, or user-research readiness.
