# Architecture

Inner Echo is a client-only Vite and React application. React owns visible state and permission flows. Engine modules own browser media, rendering, audio, reactive processing, and cleanup. Profile JSON declares the audiovisual graph that those modules construct.

## Entry and ownership

```text
index.html
  -> src/main.tsx
  -> src/app/App.tsx
  -> src/ui/CameraView.tsx
```

`CameraView` is the top-level runtime coordinator. It owns user-facing state, direct-gesture activation handlers, safety controls, setup mode, and cleanup wiring. Long-lived browser resources remain inside engine APIs and focused hooks.

## Main modules

| Path | Responsibility |
|---|---|
| `src/app/` | React composition and error boundary. |
| `src/ui/` | Welcome, setup, media controls, status, evidence dialog, safety controls, and runtime hooks. |
| `src/engine/video/` | Camera acquisition and track cleanup. |
| `src/engine/canvas/` | Overlay orchestration, WebGL pipeline, Canvas2D fallback, sizing, and video metrics. |
| `src/engine/effects/` | Implemented video nodes and shader resources. |
| `src/engine/audio/` | `AudioContext`, synth, optional microphone routing, effects, analysis, and cleanup. |
| `src/engine/reactive/` | Smoothed audio-to-video and video-to-audio mappings. |
| `src/conditions/` | Catalog, profiles, schemas, normalization, control targets, and video graph construction. |
| `src/composer/` | Dimension and profile composition with safety constraints. |
| `src/contractVerification/` | Node metadata, fake audio context, probes, and policy checks. |
| `src/evidence/` | Bundled evidence loading and sanitized Markdown rendering. |
| `src/utils/` | Deterministic parsing, numeric, logging, random, and target-path helpers. |

Registry metadata under `src/contractVerification/` is introspection-only. Runtime builders remain the executable source for graph behavior.

## Profile loading

`useProfileLoad` loads either a profile from `src/conditions/profiles/` or a composer result. Internal storage values remain `preset`, `multimorbid`, and `symptom` for compatibility. Public labels are Curated collections, Combine collections, and Experience dimensions.

Profile loading follows this sequence:

1. Load and validate catalog or profile JSON.
2. Normalize optional fields and ranges.
3. Apply composer output when a composed mode is selected.
4. Apply Safe Mode and Reduced Motion policy.
5. Build registered video and audio nodes.
6. Warn and skip, or fail explicitly, for invalid contract references according to the current validator and builder policy.

Unknown inputs must not produce a false active or healthy state.

## Video path

```text
direct user action
  -> getUserMedia(video)
  -> HTMLVideoElement
  -> THREE.VideoTexture
  -> registered VideoNode stack
  -> WebGL render targets
  -> stage canvas
```

`useReactivePipeline` defers loading of the constructor-heavy graph, reactive, and canvas runtime until camera metadata is available. `graphBuilder` constructs the profile's registered video nodes after Reduced Motion filtering. `startOverlayLoop` selects WebGL when available and owns deterministic stop and disposal.

The WebGL pipeline reads current control refs per frame, applies smoothed reactive overrides, measures video metrics, and reports renderer diagnostics. Canvas sizing and source-video metric helpers are separated from the main loop.

## Audio path

```text
direct user action
  -> AudioContext
  -> synth or optional microphone
  -> profile FX chain
  -> analyser features
  -> limiter and master output
```

`audioEngine` owns context startup, source routing, effect-chain rebuilds, microphone requests, analyser metrics, parameter updates, and cleanup. Sound and microphone activation are separate permission paths.

Profile changes update the desired audio stack. If initialization is still pending, the desired stack is retained and applied when the context becomes ready.

## Reactive coupling

Profile `reactive.analyser_to_params` entries map smoothed audio features to registered parameters. The coupling engine separately maps audio features to video parameters and low-resolution video metrics to audio parameters.

Every mapping is bounded by schema ranges, profile policy, user controls, and engine clamps. Unknown targets are skipped or rejected rather than treated as successful updates.

## Visible runtime state

The UI distinguishes:

- camera idle, requesting, active, interrupted, denied, and failed
- effects loading, WebGL, 2D fallback, raw preview, unavailable, and stopped
- sound off, starting, on, blocked, and failed
- microphone off, requesting, active, denied, and failed
- profile or catalog loading, loaded, invalid, and failed

Visible state is derived from actual runtime transitions. It is not an optimistic mirror of a clicked control.

## Fallbacks

1. Use the Three.js WebGL pipeline when renderer initialization succeeds.
2. Use Canvas2D camera passthrough when a valid 2D surface is available.
3. Hide the overlay and preserve raw camera preview when the effects surface cannot be reused safely.
4. Report unavailable when no valid rendering surface remains.

Fallback modes keep Stop Everything and surrounding controls usable. See [RELIABILITY.md](RELIABILITY.md).

## Security and cleanup boundaries

- Camera, microphone, and `AudioContext` startup require direct user actions.
- Passive preset imports cannot activate media or sound.
- Evidence HTML uses the sanitized `src/evidence/markdown.ts` path.
- The runtime contains no remote API, upload, analytics, or recording path.
- Stop Everything releases media, audio, loops, and renderer resources before reporting idle.

See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) and [SECURITY.md](SECURITY.md).
