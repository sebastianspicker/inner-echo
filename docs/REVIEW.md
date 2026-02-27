# inner-echo — Principal Engineer Review (Historical, 2026-02-15)

> Historical review context. Use current quality gates (`npm run check`) and canonical docs for present-state decisions.

Scope: runtime app (WebGL/WebAudio), composition layer, evidence UX, scripts/tests/DX.

Hard rule compliance: **no changes were made under `src/conditions/**`** (see “Verification & proof”).

---

## Architecture

### High — `CameraView.tsx` is an orchestration “god component”
- **Symptoms**: owns camera lifecycle, audio lifecycle, composition, overlay loop wiring, evidence drawer routing, and debug rendering.
- **Risks**: hard-to-reason cleanup ordering; effect dependency mistakes can cause unintended re-inits; harder to test.
- **Quick wins**
  - Keep render-loop-only values in refs (already partially done).
  - Extract lifecycle hooks: `useCameraController`, `useAudioController`, `useOverlayController`.
  - Keep composition pure and validated (see fixes below).
- **Longer-term**: add an explicit “runtime state machine” (idle/requesting/active/error) to centralize stop/start transitions.

### Medium — Composer settings boundary (profile-shaping vs runtime modulation)
- **Observation**: some settings are “profile shaping” (safe mode clamps, reduced motion filtering, max feedback caps) while others are runtime-only (coupling strength, mic enable).
- **Risk**: accidental recomposition/restart when toggling debug/coupling/mic.
- **Fix applied**: composition effect no longer recomputes for mic/coupling/debug toggles; those are treated as runtime-only.

### Medium — Interaction matrix existed but was not applied
- **Risk**: UI exposed “Interaction Amount” without effect (silent no-op).
- **Fix applied**: dimension motifs now apply a conservative nonlinear amplification based on the interaction matrix, bounded and clamped.

---

## Performance

### High — avoidable per-frame allocations in the WebGL pipeline
- **Observation**: `webglPipeline.ts` created new objects each frame for merged control values and per-node params.
- **Impact**: GC pressure and perf variability on mid-tier devices.
- **Fix applied**:
  - Reuse `mergedControlValues` and a mutable `baseParams` object.
  - Avoid per-node `{ ...baseParams }` allocations by mutating `nodeIndex`.

### Medium — avoidable per-frame allocations in `CameraView` override plumbing
- **Observation**: the override combiner used object spreads each frame (`{ ...a, ...b }`).
- **Fix applied**: reuse scratch objects and perform in-place merges.

### Low — bundle size warning (single large chunk)
- **Observation**: build warns about chunks > 500kB; evidence corpus markdown is a major contributor.
- **Recommendation**:
  - Keep evidence docs behind route-level dynamic imports.
  - Consider splitting “engine” vs “evidence UI” chunks using Rollup `manualChunks`.

---

## Reliability

### High — defensive validation for composed profiles
- **Observation**: SSOT profiles are validated on load, but the **composed** profile is constructed at runtime and previously wasn’t schema-validated.
- **Fix applied**: validate composed profile against `profileSchema`; on failure, fall back to a clean baseline profile + warning.

### Medium — start/stop ordering and cleanup expectations
- **Observation**: app correctly implements “Stop Everything” across overlay + audio + mic + video.
- **Recommendation**:
  - Ensure any future additions (new analyzers, extra timers) are always wired through `handleStop` and overlay/audio stop paths.

---

## Security & Privacy

### High — privacy posture is good (local-only)
- **Checked**: no `fetch()` use in `src/` (no analytics/upload calls).
- **Mic**: requested only via user action; has explicit enable/disable flows.
- **Local storage**: onboarding acceptance stored in `localStorage` (non-sensitive).

### Medium — logging
- **Observation**: warnings are emitted for schema failures/unknown nodes; acceptable for dev and helpful for safety.
- **Recommendation**: consider a “quiet mode” for production logs if needed (while keeping critical safety warnings).

---

## Developer Experience (DX)

### High — `npm run lint` missing
- **Impact**: “lint must pass” couldn’t be satisfied; CI scripts would fail.
- **Fix applied**: added a minimal `lint` script as **typecheck**:
  - `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit`

### Low — npm warning `Unknown env config "devdir"`
- **Likely cause**: user-level `.npmrc` setting.
- **Recommendation**: harmless, but consider documenting or removing repo-level npm config if present.

---

## What was fixed/added in this pass (implementation)

- **DX**: add `npm run lint` (typecheck).
- **Reliability**: schema-validate composed profiles and fall back safely.
- **Performance**:
  - reduce per-frame allocations in `src/engine/canvas/webglPipeline.ts`
  - reduce per-frame allocations in `src/ui/CameraView.tsx` override merge path
- **Composer**: apply nonlinear interaction gains to dimension motifs (bounded + clamped).
- **Tests**:
  - add `tests/interactionMatrix.test.ts`
  - add `tests/graphBuilder.test.ts`

---

## Verification & proof

Commands run:
- `npm run build` ✅
- `npm test` ✅
- `npm run lint` ✅

**`src/conditions/**` unchanged proof**:
- `git diff --name-only` contains no `src/conditions/**` entries.

## Inner Echo — Review (principal engineer)

Date: 2026-02-15

### Scope & guardrails

- **Read-only contract**: `src/conditions/**` is treated as immutable SSOT. No changes to condition definitions.
- **Behavior preservation**: keep the current artistic intent and runtime behavior; improvements are reliability/perf/testability oriented.
- **Approach**: small, reviewable commits (bugfixes → tests/validation → perf).

---

## Architecture review

### Findings

- **Large orchestration component** (`src/ui/CameraView.tsx`)  
  - **Severity**: Medium  
  - **Impact**: The component owns camera lifecycle, overlay lifecycle, audio lifecycle, composer state, and debug tooling. This makes correctness harder to reason about (especially cross-cutting teardown and state consistency).
  - **Quick wins**:
    - Extract small helpers (e.g., “start overlay loop”, “wire reactive options”) into local functions.
    - Consolidate “settings” into refs where the render loop needs live values.

- **Coupling settings staleness risk** (`couplingStrength`, `maxFeedback`)  
  - **Severity**: High  
  - **Impact**: The coupling engine and reactive options can accidentally capture stale values if created once and not updated when sliders/toggles change.
  - **Fix**: Make render-loop modulation read settings from stable refs (or provide update methods).

- **Condition layer boundaries are mostly clean**  
  - Loader validates via Zod (`src/conditions/loader.ts` + `src/conditions/schema.ts`).
  - Graph builder skips unknown nodes safely (`src/conditions/graphBuilder.ts`).

---

## Performance review

### Findings

- **Per-frame allocations in audio analysis** (`src/engine/audio/audioEngine.ts`)  
  - **Severity**: High  
  - **Impact**: `computeRms()` and `computeSpectralFeatures()` allocate new `Float32Array`s each call. When called per frame (coupling), this pressures GC and can cause hitches.
  - **Fix**: Reuse typed arrays in-engine (scratch buffers) and avoid per-call allocation.

- **Per-frame object allocations in reactive/coupling**  
  - **Severity**: Medium  
  - **Impact**: Reactive driver + coupling engine allocate fresh objects each frame.
  - **Fix**: Reuse output objects (clear keys each step) since callers spread/copy.

- **WebGL disposal is generally good**  
  - **Severity**: Low  
  - **Notes**: `webglPipeline` disposes render targets and trackers on stop; ensure all node resources are disposed (follow-up audit in effects).

---

## Reliability review (media lifecycle, cleanup, edge cases)

### Findings

- **Mic request reentrancy** (`requestMic`)  
  - **Severity**: Medium  
  - **Impact**: Calling mic request while mic is already active can leak tracks/nodes.
  - **Fix**: Stop existing mic path before re-requesting.

- **Teardown guarantees**  
  - **Severity**: Medium  
  - **Notes**: `Stop Everything` stops overlay, audio engine, mic, and video tracks. AudioContext is closed (strong teardown). Ensure any pending timeouts are cleared.

- **Device switching / track end events**  
  - **Severity**: Low  
  - **Notes**: Not currently handling “camera unplugged / track ended” explicitly. Should be handled as a follow-up.

---

## Security & privacy

### Findings

- **No telemetry/network calls** in runtime code  
  - **Severity**: Low  
  - **Notes**: No analytics SDKs found in `src/`.

- **Logging consistency**  
  - **Severity**: Medium  
  - **Impact**: Several modules use raw `console.warn`. There is a `logger` abstraction that avoids noisy prod logs.
  - **Fix**: Use `logger.warn/error` in non-dev critical paths; never log device IDs or stream details.

---

## DX (tooling, scripts, linting)

### Findings

- **Testing framework**  
  - **Severity**: Medium  
  - **Impact**: No unit test runner configured; hard to lock in safety clamps/validation.
  - **Fix**: Add `vitest` + a small set of tests around clamps and validation helpers.

---

## Planned fixes (implemented in subsequent commits)

1. **Bugfixes**
   - Ensure coupling settings are live (no stale captures).
   - Make mic request idempotent / safe on re-entry.

2. **Validation & tests**
   - Add unit tests for clamp logic (Safe Mode intensity cap, reduced motion node disable list).
   - Add small runtime validation helper tests (Zod schemas, loader behavior where feasible).

3. **Performance**
   - Reuse typed arrays in audio analysis to avoid per-frame allocations.
   - Reuse output objects in reactive and coupling engines.
