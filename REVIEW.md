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

