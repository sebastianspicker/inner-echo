# Architecture

Inner Echo is a client-only Vite and React application. React owns visible state and permission flows. Runtime modules own browser media, rendering, audio, reactive processing, and cleanup. Profile JSON declares the audiovisual graph that those modules construct.

Durable implementation boundaries are recorded under [`decisions/`](decisions/README.md). Those
records govern media activation, runtime ownership, and production diagnostics; this overview
describes the resulting architecture.

## Entry and ownership

```text
index.html
  -> src/main.tsx
  -> src/app/App.tsx
  -> src/app/experience/ExperienceWorkspace.tsx
```

`ExperienceWorkspace` is the top-level runtime coordinator. It owns user-facing state, direct-gesture activation handlers, safety controls, setup mode, and cleanup wiring. Long-lived browser resources remain inside engine APIs and focused hooks.

## Main modules

| Path | Responsibility |
|---|---|
| `src/app/` | React composition and error boundary. |
| `src/app/experience/components/` | Welcome, setup, media controls, status, and safety controls. |
| `src/app/experience/evidence/` | Evidence dialog and document rendering. |
| `src/app/experience/hooks/` and `src/app/experience/session/` | Runtime hooks and session orchestration. |
| `src/runtime/camera/` | Camera acquisition and track cleanup. |
| `src/runtime/visual/overlay/` | Overlay orchestration, WebGL pipeline, Canvas2D fallback, sizing, and video metrics. |
| `src/runtime/visual/effects/` | Implemented video nodes and shader resources. |
| `src/runtime/audio/` | `AudioContext`, synth, optional microphone routing, effects, analysis, and cleanup. |
| `src/runtime/coupling/` | Smoothed audio-to-video and video-to-audio mappings. |
| `src/content/experience/` | Catalog, profiles, and dimension mappings. |
| `src/domain/experience/` | Schemas, normalization, safety, motion, and control targets. |
| `src/domain/experience/composition/` | Dimension and profile composition with safety constraints. |
| `src/runtime/visual/graph/` | Video graph construction. |
| `tools/contracts/probes/` | Node metadata, fake audio context, probes, and policy checks. |
| `src/content/evidence/` | Bundled evidence loading and sanitized Markdown rendering. |
| `src/shared/` | Small browser-independent primitives that are genuinely shared across application layers. |
| `src/platform/` | Browser-facing diagnostics infrastructure. |
| `tools/` | Build, deployment, documentation, validation, and contract-verification programs. Tool-only helpers stay here. |

Registry metadata under `tools/contracts/probes/` is introspection-only. Runtime builders remain the executable source for graph behavior.

## Dependency direction

The application follows one-way dependencies rather than a generic layering framework:

```text
app -> content, domain, runtime, platform, shared
runtime -> domain, platform, shared
content -> domain, platform, shared
domain -> shared
platform -> shared
```

`domain` contains deterministic profile, composition, safety, and motion-policy decisions. It does not know which browser implementations exist. The application injects the immutable, constructor-free capability identifiers exposed by `runtime` when it composes an experience. Executable factories are typed exhaustively against those identifiers but remain behind the runtime boundary. `runtime` consumes validated domain values and owns side effects. `content` adapts bundled JSON and evidence into domain values, but the domain never loads files itself.

`npm run architecture:check` rejects forbidden relative-import edges and cycles within `src/`. A separate domain-only TypeScript project omits browser libraries, preventing `domain` and `shared` code from acquiring browser dependencies through globals. These checks complement linting and behavioral tests.

## Profile loading

`useProfileLoad` loads either a profile from `src/content/experience/profiles/` or a composer result. Persisted mode values remain `preset`, `multimorbid`, and `symptom` for compatibility. Public labels are Curated collections, Combine collections, and Experience dimensions.

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

`useReactivePipeline` defers loading of the constructor-heavy graph, coupling, and overlay runtime until camera metadata is available. `buildVideoNodes` constructs the profile's registered video nodes after Reduced Motion filtering. `startOverlayLoop` selects WebGL when available and owns deterministic stop and disposal. `npm run bundle:verify` inspects Vite's manifest to ensure the initial static closure excludes Three.js and video constructors while the lazy graph closure owns them.

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

`createAudioEngine` owns context startup, source routing, effect-chain rebuilds, microphone requests, analyser metrics, parameter updates, and cleanup. Sound and microphone activation are separate permission paths.

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
- Evidence HTML uses the sanitized `src/content/evidence/markdown.ts` path.
- The runtime contains no remote API, upload, analytics, or recording path.
- Stop Everything releases media, audio, loops, and renderer resources before reporting idle.

See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) and [SECURITY.md](SECURITY.md).
