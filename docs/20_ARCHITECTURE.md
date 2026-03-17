# Architecture — System design and data flow

Canonical architecture doc. Merged from ARCHITECTURE and FRONTEND. Client-only; engine and conditions are separate; data-driven profiles.

---

## Overview

The application is client-only:

- Camera video via `getUserMedia()`, rendered through a Three.js WebGL pipeline as a texture.
- Visual effects applied as a node stack.
- Optional audio via WebAudio (synth or optional mic); an analyser can drive a modulation layer (Audio → Video).

Design goals: modular (engine ≠ conditions), data-driven (profiles define behaviour), safe (Stop / Safe Mode / Reduced Motion), with a Canvas2D fallback when WebGL init fails.

---

## Data flow

### Video pipeline

```
getUserMedia(video) → <video> element → THREE.VideoTexture
        → VideoGraph (Node1 → Node2 → … → NodeN)
        → WebGL Renderer → <canvas> overlay (under UI)
```

### Audio pipeline

```
User gesture → AudioContext
  Synth OR Mic (optional) → AudioGraph (FX chain) → Master Out
                         → Analyser (RMS/FFT)
                         → Modulation layer → VideoGraph parameters
```

---

## Stack and layers

- **Stack:** Vite, React, TypeScript, Three.js, Web APIs (`getUserMedia`, WebAudio).
- **UI (`src/ui/`):** OnboardingModal, ConditionPicker (from `catalog.json`), ControlsPanel (Intensity, Safe Mode, Reduced Motion, Audio, Mic optional), WarningsPanel; optional DebugPanel (dev-only).
- **Engine (`src/engine/`):** API used by UI: `startVideo`/`stopVideo`, `startAudio`/`stopAudio`, `startMic`/`stopMic`, `setCondition(id)`, `setControl(key, value)`, `stopEverything()`. Engine owns camera, WebGL, WebAudio, render loop, disposal.

---

## Modules and responsibilities

| Module | Responsibility |
|--------|----------------|
| **`src/engine/`** | Camera lifecycle, WebGL renderer, WebAudio, effect nodes, graph construction, runtime (state, safety, Stop Everything). No UI logic, no condition data. |
| **`src/conditions/`** | Data: `catalog.json`, `profiles/*.json`. Schema, loader, graph builder. No engine logic. |
| **`src/ui/`** | Components, condition picker, controls, onboarding, accessibility. Calls engine APIs only. |
| **`src/app/`** | Entry point and composition. |

Boundary: the engine module builds graphs from conditions data; UI calls engine APIs only.

---

## Video and audio implementation

- **Video:** `THREE.VideoTexture`; post-processing-style chain (render targets); nodes implement `VideoNode` (setParams, getMaterial, dispose). Implemented nodes include grain, vignette, chromatic_aberration, temporal_smear (and others). Unknown node types are skipped with a warning.
- **WebGL module split:** `src/engine/canvas/webglPipeline.ts` is orchestrator-only; loop/params/resource helpers live under `src/engine/canvas/webgl/` for lower coupling and safer incremental changes.
- **Audio:** Native WebAudio; starts only after user gesture. Synth + FX chain from profile `audio_stack.chain`; FX include lowpass, highpass, tremolo, noise_bed, compressor_limiter. Condition switch: master gain ramp, dispose and rebuild chain.
- **Reactive:** Profile can define `reactive.analyser_to_params`; analyser (e.g. RMS) drives video parameters with smoothing and clamps.

---

## Condition system (data-driven)

- **`catalog.json`:** UI metadata (id, label, description, tags). Picker loads from here.
- **`profiles/<id>.json`:** `video_stack`, optional `audio_stack`, `safety`, `ui.controls`, optional `reactive`. Validation via schema; unknown nodes warn and skip.

---

## Global controls

- **Intensity:** Multiplicative scale on node params (subject to safety clamps).
- **Safe Mode:** Enables extra clamps and caps intensity.
- **Reduced Motion:** Disables or replaces time-based / motion-heavy nodes.
- **Stop Everything:** Stops tracks, suspends audio, cancels loops, disposes WebGL, clears canvas.

---

## Fallback and reliability

1. **Primary:** Three.js WebGL pipeline.
2. **Fallback:** Canvas2D `drawImage` path if WebGL init fails (no effects).
3. **Performance:** FPS guard can reduce `renderScale` (e.g. 1.0 → 0.75 → 0.5) under sustained low FPS.

See [RELIABILITY.md](RELIABILITY.md) for browser matrix, WebGL fallback details, and known issues.

---

## Runtime state and permissions

- States: idle, requesting_video, video_active, requesting_audio, audio_active, (optional) mic flow, denied/error.
- All permission triggers (camera, mic, AudioContext) must be bound to a user gesture.

---

## Safety and ethics (architecture boundary)

- Not a diagnostic tool; not a medical device; not therapy.
- No recording/upload in MVP; mic optional and off by default.
- Each condition includes warnings and intensity constraints; Safe Mode and Stop Everything always available.

Full safety and ethics: [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md). Security and privacy: [SECURITY.md](SECURITY.md).
