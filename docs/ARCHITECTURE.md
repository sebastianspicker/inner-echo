# ARCHITECTURE.md — System Architecture & Data Flow

## Overview
The application is a **client-only** web experience:
- Camera video is acquired via `getUserMedia()` and rendered through a **Three.js WebGL pipeline** as a texture.
- Visual effects are applied as a **stack** (graph/pipeline of nodes).
- Optional audio is generated via **WebAudio** (and optionally microphone input), with an **analyser** feeding a modulation layer that can animate video parameters (Audio → Video).

**Key goals**
- Modular: engine ≠ conditions
- Data-driven: profiles define behavior
- Safe: Stop / Safe Mode / Reduced Motion
- Robust: WebGL fallback strategy

---

## High-Level Diagrams

### Video Pipeline
```
getUserMedia(video) → <video> element → THREE.VideoTexture
        → VideoGraph (Node1 → Node2 → ... → NodeN)
        → WebGL Renderer → <canvas> overlay (under UI)
```

### Audio Pipeline (Synth or Optional Mic)
```
User gesture → AudioContext
  Synth OR Mic(optional) → AudioGraph(FX chain) → Master Out
                         → Analyser (RMS/FFT)
                         → Modulation Engine → VideoGraph parameters
```

---

## AudioGraph Architecture (Phase 7 — no mic)

Audio is **native WebAudio only** (no Tone.js). It starts only after a **user gesture** (e.g. “Enable audio” button).

- **Context**: One shared `AudioContext`; created/resumed in `startAudioContext()` (user gesture). Status: `off` | `starting` | `on` | `error`.
- **Stop Everything**: `suspendAudioContext()` is called; engine disposes synth and FX chain. No recording; no network.
- **Source**: Synth (two sine oscillators + optional noise bed). **FX chain** from profile `audio_stack.chain`; each node implements **AudioModule**: `getInput()`, `connect()`, `setParams()`, `dispose()`.
- **Implemented FX**: `lowpass`, `highpass`, `tremolo` (rate/depth), `noise_bed`, `compressor_limiter`. Unknown node types are skipped with a console warning.
- **Condition switching**: Master gain ramps down (~25 ms), chain is disposed and rebuilt from new profile, then master ramps up to avoid clicks.
- **Paths**: `src/engine/audio/` — `contextManager.ts`, `types.ts`, `synth.ts`, `audioEngine.ts`, `audioGraphBuilder.ts`, `fx/`.

---

## Modules & Responsibilities

### `src/engine/video/`
- `camera.ts` — permissions, start/stop, stream management

### `src/engine/effects/`
- Shader-based video nodes: `grain`, `vignette`, `chromatic_aberration`, `temporal_smear`
- `VideoNode` interface: `setParams`, `getMaterial`, `dispose`

### `src/engine/audio/` (Phase 7)
- Context lifecycle (user gesture, suspend on Stop)
- Synth + FX chain from profile `audio_stack`; `AudioModule` interface
- FX: lowpass, highpass, tremolo, noise_bed, compressor_limiter

### `src/engine/canvas/`
- WebGL overlay loop (Three.js) or 2D fallback; built from profile `video_stack`

### `src/conditions/`
- `catalog.json` — list of conditions for UI
- `profiles/*.json` — condition presets (video/audio stacks, UI controls, safety)
- `schema.ts`, `loader.ts`, `graphBuilder.ts` (video); audio chain in `engine/audio/audioGraphBuilder.ts`
- optional assets: shaders, audio patches

### `src/ui/`
- Condition picker, controls panel, warnings, onboarding, accessibility helpers

---

## Runtime State Machine (Minimum)
- `idle`: no camera, no audio, no loops
- `requesting_video`: permission flow
- `video_active`: renderer active
- `requesting_audio`: audio init (user gesture)
- `audio_active`: audio graph running
- `requesting_mic`: optional mic permission flow
- `mic_active`: mic running
- `denied` / `error`: user-friendly recovery UI

**Policy:** Anything that triggers permissions must be tied to a **user gesture** to satisfy browser restrictions.

---

## Fallback & Degradation Strategy
1. **Primary**: Three.js WebGL pipeline (VideoTexture + shader nodes)
2. **Fallback**: Canvas2D drawImage path (no shaders) if WebGL initialization fails
3. **Degradation**:
   - Performance guard reduces internal resolution (`renderScale`) if FPS < threshold
   - Reduced Motion disables time-based feedback nodes and high motion options

---

## Profile Format (Conceptual)
Each condition profile includes:
- `id`, `label`, `description`, `tags`
- `safety`: `intensity_default`, `intensity_max`, `warnings`
- `video_stack`: list of nodes + params
- `audio_stack`: optional
- `reactive`: optional analyser mappings (`analyser_to_params`)
- `ui.controls`: declarative UI controls (sliders/toggles) to auto-render

---

## Safety & Ethics Boundaries
- Not a diagnostic tool; not a medical device; not therapy
- No recording/upload in MVP
- Mic is optional and disabled by default
- Each condition includes warnings + intensity constraints
- Safe Mode and Stop Everything always available
