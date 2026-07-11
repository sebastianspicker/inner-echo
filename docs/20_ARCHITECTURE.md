# Architecture — System design and data flow

Canonical architecture doc. Merged from ARCHITECTURE and FRONTEND. Client-only; engine and conditions are separate; data-driven profiles.

---

## Overview

The application is client-only:

- Camera video via `getUserMedia()`, rendered through a Three.js WebGL pipeline as a texture.
- Visual effects applied as a node stack.
- Optional audio via WebAudio (synth or optional mic); an analyser can drive a modulation layer (Audio → Video).

Design goals: modular (engine ≠ conditions), data-driven (profiles define behaviour), safe (Stop / Safe Mode / Reduced Motion), with explicit WebGL, Canvas2D, raw-preview, and unavailable states.

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
- **UI (`src/ui/`):** WelcomeStep, ConditionComposerPanel, SafetyControls, AdvancedComposerPanel, PresetLibraryPanel, EffectControls, AudioMicControls, and the Method & Evidence dialog; optional diagnostics remain development-only.
- **Engine (`src/engine/`):** Browser runtime helpers used by the UI: `requestVideoStream`/`stopVideoStream`, `createAudioEngine`, `startOverlayLoop`, and reactive/coupling utilities. The UI owns React state; engine modules own camera, WebGL, WebAudio, render loops, and disposal.

---

## Modules and responsibilities

| Module | Responsibility |
|--------|----------------|
| **`src/engine/`** | Camera lifecycle, WebGL renderer, WebAudio, effect nodes, graph construction, runtime (state, safety, Stop Everything). No UI logic, no condition data. |
| **`src/conditions/`** | Data: `catalog.json`, `profiles/*.json`. Schema, loader, graph builder. No engine logic. |
| **`src/composer/`** | Internal collection-combination and dimension-first blend logic, dimension-to-signal mapping, interaction matrix, safety composition. |
| **`src/contractVerification/`** | Registry metadata and probe harnesses for video/audio nodes. Used by `verify:contracts`. |
| **`src/evidence/`** | Bundled evidence-doc loading and sanitized Markdown rendering for the in-app Method & Evidence dialog. |
| **`src/ui/`** | Components, collection picker, setup/composer panels, in-flow welcome, controls, evidence dialog, and accessibility. Calls engine APIs only. |
| **`src/utils/`** | Shared helpers: logger, numeric clamp, JSON parser, target-path resolver. |
| **`src/app/`** | Entry point and composition. |

Boundary: conditions data declares what to build; `graphBuilder` constructs concrete video nodes; UI hooks coordinate runtime resources without implementing shader or audio DSP logic.

## Runtime ownership path

`CameraView` is the only top-level coordinator. It keeps user-facing state in React, stores frame-loop settings in refs, and delegates long-lived resources to controllers:

- `useProfileLoad` loads `src/conditions/profiles/*.json` for the internal `preset` mode or asks the composer for a synthesized profile in internal `multimorbid`/`symptom` modes. Public labels are Curated collections, Combine collections, and Experience dimensions.
- `graphBuilder` translates profile `video_stack` entries into concrete `VideoNode` classes. Reduced Motion filtering happens before nodes are built, so runtime indices always refer to the built stack.
- `useReactivePipeline` dynamically loads the constructor-heavy graph, reactive, and canvas runtimes only after the camera is active and video metadata is available. It creates one reactive driver and one coupling engine for the active profile.
- `webglPipeline` reads the latest refs every frame, merges UI controls with reactive overrides, computes camera-source video metrics, and applies audio overrides through `audioEngine`.
- `audioEngine` owns `AudioContext`, synth/mic routing, FX rebuilding, analyser metrics, and cleanup. Audio and mic permissions remain separate user-gesture flows.

---

## Video and audio implementation

- **Video:** `THREE.VideoTexture`; post-processing-style chain (render targets); nodes implement `VideoNode` (setParams, getMaterial, dispose). Implemented nodes include grain, vignette, chromatic_aberration, temporal_smear (and others). Unknown node types are skipped with a warning.
- **WebGL module split:** `src/engine/canvas/webglPipeline.ts` is orchestrator-only; loop/params/resource helpers live under `src/engine/canvas/webgl/` for lower coupling and safer incremental changes.
- **Audio:** Native WebAudio; starts only after user gesture. Synth + FX chain from profile `audio_stack.chain`; FX include lowpass, highpass, tremolo, noise_bed, compressor_limiter, delay, reverb, flutter, pulse_tone. Condition switch: master gain ramp, dispose and rebuild chain.
- **Reactive:** Profile can define `reactive.analyser_to_params`; analyser RMS drives video or audio parameters with smoothing and clamps. The coupling engine separately maps audio metrics and video metrics into small, clamped bidirectional adjustments.

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
2. **Fallback:** Canvas2D passthrough when a valid 2D surface is available; otherwise the overlay hides to preserve the raw video preview.
3. **Unavailable:** Missing media or rendering surfaces produce an explicit unavailable state rather than optimistic effects status.
4. **Performance:** FPS guard can reduce `renderScale` (e.g. 1.0 → 0.75 → 0.5) under sustained low FPS.

See [RELIABILITY.md](RELIABILITY.md) for browser matrix, WebGL fallback details, and known issues.

---

## Runtime state and permissions

- User-facing state distinguishes camera readiness/request/active/permission/error, effects preparing/WebGL/2D/raw/unavailable, and sound/microphone off/starting/on/error.
- All permission triggers (camera, mic, AudioContext) must be bound to a user gesture.

---

## Safety and ethics (architecture boundary)

- Not a diagnostic tool; not a medical device; not therapy.
- No recording or media upload; mic and audio are optional and off by default.
- Each condition includes warnings and intensity constraints; Safe Mode and Stop Everything always available.

Full safety and ethics: [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md). Security and privacy: [SECURITY.md](SECURITY.md).
