# FRONTEND.md — Frontend Implementation Notes (React + TS + Three.js)

## Stack
- Vite + React + TypeScript
- Three.js (WebGL renderer)
- Web APIs: `getUserMedia`, WebAudio (optional)

---

## Frontend Architecture

### UI Layer (`src/ui/`)
- `OnboardingModal` — consent + framing + privacy notice
- `ConditionPicker` — loads from `src/conditions/catalog.json`
- `ControlsPanel` — Intensity, Safe Mode, Reduced Motion, Audio Off, Mic optional
- `WarningsPanel` — displays profile warnings
- Optional: `DebugPanel` (dev-only): renderer mode, fps, renderScale, audio/mic state

### Engine Layer (`src/engine/`)
The UI calls a small engine API surface:
- `startVideo() / stopVideo()`
- `startAudio() / stopAudio()`
- `startMic() / stopMic()` (optional)
- `setCondition(id)`
- `setControl(key, value)` (intensity, safeMode, reducedMotion, etc.)
- `stopEverything()`

The engine owns browser resources and lifecycle (tracks, contexts, render loop, WebGL disposal).

---

## Rendering Model (Three.js)

### Pipeline
- A hidden or off-screen `<video>` receives the MediaStream.
- `THREE.VideoTexture(video)` becomes the base input.
- A post-processing-style chain uses render targets (ping-pong) for stacking nodes:
  - Node A: input → RT1
  - Node B: RT1 → RT2
  - ...
  - final pass → screen

### Resize
- Canvas CSS size is the source of truth.
- Multiply by `devicePixelRatio` for internal resolution.
- Recreate or resize render targets on dimension changes.

### Performance Guard
- Maintain a moving average FPS.
- If FPS stays below threshold, reduce internal resolution (`renderScale`):
  - 1.0 → 0.75 → 0.5
- Ensure user controls remain responsive.

---

## Condition System (Data-Driven)
- `catalog.json` provides UI metadata (id, label, description, tags).
- `profiles/<id>.json` defines the behavior:
  - `video_stack`: list of nodes + params
  - `audio_stack`: optional
  - `reactive`: optional analyser mappings
  - `ui.controls`: declarative list of controls to auto-render
  - `safety`: intensity defaults, clamps, warnings

### Validation
- Use schema validation (e.g., Zod/JSON Schema) to ensure required fields.
- Unknown nodes should **warn and skip**, never crash the app.

---

## Global Controls
- **Intensity**: multiplicative scale factor applied to node params
- **Safe Mode**: enables clamping for risky params and caps intensity
- **Reduced Motion**: blocks time-based nodes and motion-heavy settings
- **Stop Everything**: stops tracks, suspends/ends audio, cancels loops, disposes WebGL, clears canvas

---

## Permissions & Browser Policies
- Request camera/mic only on explicit user action (button click).
- Track state transitions: requesting → active → denied/error.
- Provide user-friendly error messages and recovery suggestions.

---

## Audio (Phase 7 — no mic)
- **User gesture**: “Enable audio” button creates/resumes `AudioContext` and starts the engine.
- **Status UI**: off / starting / on / error (and error message when applicable).
- **Synth**: Simple dual-oscillator + optional noise bed; no microphone.
- **FX chain**: Driven by profile `audio_stack.chain` (lowpass, highpass, tremolo, noise_bed, compressor_limiter). Master volume from profile or slider.
- **Condition switch**: Audio graph is rebuilt with a short ramp to avoid clicks.
- **Stop Everything**: Audio engine is stopped (suspend context, dispose nodes). No network; no recording.

## Optional Modulation (future)
- `AnalyserNode` (RMS/FFT) and a modulation layer mapping to video parameters (smoothed, clamped) can be added later.

---

## Coding Conventions
- Keep engine logic out of UI components.
- No network calls in MVP.
- Defensive null checks (refs, media readiness).
- Always clean up in `useEffect` teardown: stop tracks, dispose materials/targets, cancel RAF loops.
