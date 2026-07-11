# Code Index

Source-file inventory before cleanup or refactor. This is documentation-only and
does not claim behavioral verification.

Evidence used: repository file listing, `package.json` scripts, imports/exports,
line counts, `README.md`, `docs/20_ARCHITECTURE.md`, and
`docs/CONTRACT_VERIFICATION.md`.

Status labels:
- `active`: imported by runtime/tests/scripts or named in npm scripts.
- `generated`: generated/build output; do not edit by hand.
- `unclear`: usage could not be proven from static imports alone.
- `compat`: compatibility or migration path; preserve only with evidence.

## Runtime and App Entry Points

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `index.html` | HTML | Vite HTML shell mounting `src/main.tsx`. | entrypoint | Vite, `src/main.tsx` | active; no obvious smell inspected. |
| `src/main.tsx` | TSX | React root bootstrap; renders `ErrorBoundary` and `App`; imports global CSS. | entrypoint | `react-dom/client`, `src/app/App.tsx`, `src/index.css` | active; small. |
| `src/app/App.tsx` | TSX | App composition; exports default `App` wrapping `CameraView`. | entrypoint/UI | `src/ui/CameraView.tsx`, `CameraView.css` | active; small. |
| `src/index.css` | CSS | Global design tokens, page base styles, and reset-like app styles. | UI | imported by `src/main.tsx` | active; inspect visually before UI refactor. |
| `vite.config.ts` | TS | Vite/Vitest config; exports `defineConfig` with React plugin, test env, security headers. | config | `vitest/config`, `@vitejs/plugin-react` | active; security headers are runtime-adjacent. |
| `tsconfig.json` | JSON | Main TypeScript project config. | config | TypeScript build/test tooling | active. |
| `tsconfig.node.json` | JSON | Node-side TypeScript config for scripts/config. | config | TypeScript build/test tooling | active. |
| `biome.json` | JSON | Biome lint/format configuration. | config | `npm run lint` | active. |
| `src/vite-env.d.ts` | TS declaration | Vite ambient type reference. | config | Vite types | active by convention; no direct imports expected. |

## UI Layer

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/ui/CameraView.tsx` | TSX | Top-level runtime coordinator; exports `CameraView`; owns camera/audio state, refs, profile controls, evidence drawer, debug panel. | UI/adapter/entrypoint | UI hooks/components, `requestVideoStream`, `createAudioEngine`, `startOverlayLoop`, profile/schema utilities | active; highest-risk UI file. Smells: 883 lines, many states/refs, TODO for lazy loading evidence bundle, complex state transitions. |
| `src/ui/CameraView.css` | CSS | Main app layout, controls, callouts, debug/evidence integration styles. | UI | imported by `App.tsx` | active; large CSS surface, visual QA required. |
| `src/ui/CameraHeader.tsx` | TSX | Header/status/actions; exports `CameraHeader`. | UI | camera messages, camera/audio status types, evidence doc paths | active; status truthfulness matters. |
| `src/ui/CameraStage.tsx` | TSX | Video/canvas stage component and camera/audio status surface. | UI | audio status type | active. |
| `src/ui/AudioMicControls.tsx` | TSX | Audio/mic controls; exports props and `AudioMicControls`. | UI | audio status/mode types, `LabeledSlider` | active; user-gesture and mic status behavior is high risk. |
| `src/ui/EffectControls.tsx` | TSX | Profile-driven effect sliders/toggles; exports props and `EffectControls`. | UI | `resolveControl`, `LabeledSlider`, `ToggleField` | active; depends on control target contract. |
| `src/ui/ConditionPicker.tsx` | TSX | Catalog picker; exports `ConditionPicker`. | UI | `CatalogEntry`, CSS | active. |
| `src/ui/ConditionPicker.css` | CSS | Picker styles. | UI | imported by `ConditionPicker.tsx` | active. |
| `src/ui/ConditionComposerPanel.tsx` | TSX | Preset/dimension composer UI, URL hash and localStorage preset library handling; exports `ConditionComposerPanel`. | UI/domain adapter/storage | composer API, loader, preset codec, clipboard, async hook, child list components | active; likely overcomplicated. Smells: 666 lines, localStorage migration path, many UI/storage responsibilities. |
| `src/ui/ConditionComposerPanel.css` | CSS | Composer panel styles. | UI | imported by `ConditionComposerPanel.tsx` | active; large CSS surface. |
| `src/ui/MultimorbidPresetList.tsx` | TSX | Preset list and weight controls; exports `MultimorbidPresetList`. | UI | composer types, catalog, evidence helpers | active. |
| `src/ui/SymptomDimensionList.tsx` | TSX | Symptom dimension list and weight controls; exports props and `SymptomDimensionList`. | UI | composer types, evidence helpers | active. |
| `src/ui/DebugPanel.tsx` | TSX | Dev/debug runtime telemetry and copy actions; exports `DebugPanel`. | UI/adapter | overlay diagnostics, audio debug state, clipboard, logger | active; can mislead if debug values drift from runtime truth. |
| `src/ui/DebugPanel.css` | CSS | Debug panel styles. | UI | imported by `DebugPanel.tsx` | active. |
| `src/ui/EvidenceDrawer.tsx` | TSX | Evidence drawer; loads Markdown and renders sanitized HTML; exports `EvidenceDrawer`. | UI/adapter | `src/evidence/docs.ts`, `src/evidence/markdown.ts`, async hook, logger | active; security-sensitive HTML boundary. |
| `src/ui/EvidenceDrawer.css` | CSS | Evidence drawer styles. | UI | imported by `EvidenceDrawer.tsx` | active. |
| `src/ui/ErrorBoundary.tsx` | TSX | React error boundary; exports `ErrorBoundary`. | UI/error handling | React class component, logger, CSS | active; user-visible error path. |
| `src/ui/ErrorBoundary.css` | CSS | Error boundary styles. | UI | imported by `ErrorBoundary.tsx` | active. |
| `src/ui/OnboardingModal.tsx` | TSX | Onboarding acknowledgement and localStorage flag; exports `getOnboardingAccepted`, `setOnboardingAccepted`, `OnboardingModal`. | UI/storage | logger, CSS | active; storage errors are caught, user-gesture flow adjacent. |
| `src/ui/OnboardingModal.css` | CSS | Onboarding modal styles. | UI | imported by `OnboardingModal.tsx` | active. |
| `src/ui/cameraMessages.ts` | TS | User-facing camera labels/errors; exports `getCameraStateLabel`, `getCameraErrorMessage`. | UI/domain adapter | camera state type | active; labels must not imply fake success. |
| `src/ui/clipboard.ts` | TS | Clipboard wrapper with injected writer support; exports `copyTextToClipboard`. | adapter | browser `navigator.clipboard` | active; weak error detail intentionally returns false. |
| `src/ui/composerUtils.tsx` | TSX | Composer list helpers and evidence button; exports `upsertPreset`, `upsertDimension`, `strengthBadge`, `EvidenceButton`. | UI/domain helper | composer types, `clamp01` | active. |
| `src/ui/controls/LabeledSlider.tsx` | TSX | Reusable labeled slider; exports `LabeledSlider`. | UI | React props only | active; single-use abstraction risk is low because reused. |
| `src/ui/controls/ToggleField.tsx` | TSX | Reusable checkbox/toggle field; exports `ToggleField`. | UI | React props only | active; reused. |
| `src/ui/evidenceHref.ts` | TS | Maps in-app evidence doc paths to public docs URLs; exports `resolveEvidenceHref`. | UI/adapter | `EvidenceDocPath` | active; uses URL construction fallback. |
| `src/ui/presetShare.ts` | TS | URL hash encode/decode helpers; exports `encodePresetToHash`, `decodePresetFromHash`. | storage/adapter | `presetSnapshot` | active; malformed hash path covered by tests. |
| `src/ui/presetSnapshot.ts` | TS | Preset snapshot schema, encoding, decoding, and legacy migration; exports payload/snapshot helpers and `migrateLegacyPresetPayload`. | storage/compat | `zod`, composer types, `clamp01` | active compat path; prove legacy use before preserving long term. |

## UI Hooks

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/ui/hooks/useAsyncEffect.ts` | TS | Cancel-aware async effect helper; exports `useAsyncEffect`. | UI helper | React `useEffect` | active; generic abstraction used in several components. |
| `src/ui/hooks/useAudioController.ts` | TS | Audio start/stop button state guard; exports `useAudioController`. | UI adapter | audio status type | active. |
| `src/ui/hooks/useCameraController.ts` | TS | Derived camera start/stop UI disable state; exports `useCameraController`. | UI adapter | camera/audio/mic statuses | active. |
| `src/ui/hooks/useCatalog.ts` | TS | Loads condition catalog on mount; exports `useCatalog`. | UI adapter | `loadCatalog`, `useAsyncEffect`, logger | active. |
| `src/ui/hooks/useImmersiveIdleState.ts` | TS | Tracks idle/immersive UI state from camera state; exports `useImmersiveIdleState`. | UI state helper | camera state type | active. |
| `src/ui/hooks/useOverlayController.ts` | TS | Reads overlay/audio diagnostics and applied clamps; exports `useOverlayController`. | UI adapter | overlay/audio controls, profile normalization | active; must remain side-effect-light. |
| `src/ui/hooks/useProfileLoad.ts` | TS | Loads selected profile or composed profile and synchronizes default controls; exports `useProfileLoad`. | UI/domain adapter | loader, control targets, fallback profile, composer, async hook | active; async race/error path and fallback behavior are high risk. |
| `src/ui/hooks/useReactivePipeline.ts` | TS | Starts/stops video nodes, overlay loop, reactive driver, and coupling engine; exports `useReactivePipeline`. | adapter/runtime coordinator | graph builder, engine canvas, reactive engine, safety normalization | active; high-risk resource lifecycle. |

## Condition Data and Contracts

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/conditions/schema.ts` | TS | Zod schemas and inferred types for catalog, profiles, UI controls, audio/video stacks, evidence dimensions, and mapping files. | domain logic/contract | `zod` | active; high-risk compatibility contract. |
| `src/conditions/loader.ts` | TS | Dynamic catalog/profile loader; exports `loadCatalog`, `loadProfile`. | adapter/domain logic | Vite JSON import/glob, schemas, logger | active; returns `null` on failure, so callers must avoid false success. |
| `src/conditions/graphBuilder.ts` | TS | Video node factory and profile-to-node builder; exports `NODE_FACTORY`, temporal node set, node skip/index helpers. | domain logic/adapter | effect node classes, normalize, logger | active; high-risk contract boundary. Smells: manual factory and skip/index mapping can drift. |
| `src/conditions/controlTargets.ts` | TS | Resolves UI control target strings to video/audio targets; exports `resolveControl`, `getDefaultControlValues`. | domain logic | target parser, graph builder index helpers, schema types | active; overcomplication risk from target routing branches. |
| `src/conditions/normalize.ts` | TS | Safety/reduced-motion helpers; exports `getSafetyContext`, `getReducedMotionDisableNodes`, `clampIntensity`. | domain logic | global safety clamps, numeric clamp | active. |
| `src/conditions/ssotClamps.ts` | TS | Global safety clamp constants; exports `GLOBAL_SAFETY_CLAMPS`. | domain logic/contract | none | active; safety-sensitive constants. |
| `src/conditions/fallbackProfiles.ts` | TS | Baseline and composed fallback profile; exports `BASELINE_PROFILE`, `createComposeFallbackProfile`. | domain logic/fallback | profile type | active; fallback path must stay visibly partial, not fake success. |
| `src/conditions/catalog.json` | JSON | UI catalog of selectable condition profiles. | data/contract | validated by schema and scripts | active. |
| `src/conditions/profiles/none.json` | JSON | Clean baseline profile. | data/contract | schema, graph builder, UI | active. |
| `src/conditions/profiles/adhd.json` | JSON | ADHD metaphor preset with video/audio/reactive/safety config. | data/contract | schema, contract verification | active. |
| `src/conditions/profiles/anxiety.json` | JSON | Anxiety metaphor preset. | data/contract | schema, contract verification | active. |
| `src/conditions/profiles/depression.json` | JSON | Depression metaphor preset. | data/contract | schema, contract verification | active. |
| `src/conditions/profiles/dpdr.json` | JSON | DPDR metaphor preset. | data/contract | schema, contract verification | active; directly tested for reactive target. |
| `src/conditions/profiles/ocd.json` | JSON | OCD metaphor preset. | data/contract | schema, contract verification | active. |
| `src/conditions/profiles/panic.json` | JSON | Panic metaphor preset. | data/contract | schema, contract verification | active. |
| `src/conditions/profiles/trauma_ptsd.json` | JSON | Trauma/PTSD metaphor preset. | data/contract | schema, contract verification | active. |
| `src/conditions/experience-dimensions.json` | JSON | Symptom-first dimension definitions and evidence metadata. | data/contract | composer schemas/scripts | active. |
| `src/conditions/dimension-to-signal-mapping.json` | JSON | Large mapping from dimensions to video/audio motifs and safety advice. | data/contract | composer, validation scripts | active; high drift risk due size and evidence coupling. |
| `src/conditions/README.md` | Markdown | Condition-system documentation. | docs | human guidance | active docs. |
| `src/conditions/EVIDENCE.md` | Markdown | Condition evidence notes. | docs | human guidance | active docs. |
| `src/conditions/MAPPING.md` | Markdown | Mapping notes. | docs | human guidance | active docs. |

## Composer Domain Logic

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/composer/types.ts` | TS | Composer type model and `clamp01` re-export. | domain logic | numeric utility | active. |
| `src/composer/index.ts` | TS | Barrel export for composer API. | adapter/public API | local composer modules | active. |
| `src/composer/compose.ts` | TS | Runtime wrapper around core composer; exports `composeEffectiveProfile` and report types. | domain logic/adapter | profile loader/schema, fallback profile, mapping/dim providers, logger | active; fallback path should remain explicit. |
| `src/composer/composeCore.ts` | TS | Main composition algorithm; exports report/result/source types and `composeEffectiveProfileCore`. | domain logic | blend/safety helpers, interaction matrix, implemented node sets | active; likely overcomplicated. Smells: 384 lines, back-compat type re-export, many merge paths. |
| `src/composer/composeBlend.ts` | TS | Weighted stack/param merge utilities; exports merge/order/motif helpers. | domain logic | schema types, composer types | active; likely overcomplicated, many normalization branches. |
| `src/composer/composeSafety.ts` | TS | Safety clamp/warning derivation for composed profiles; exports clamp and derive helpers. | domain logic | profile types, blend helpers, numeric clamp | active. |
| `src/composer/dimensionToSignalMapping.ts` | TS | Loads and validates dimension mapping JSON; exports `getDimensionMappingEntry`. | domain adapter | mapping JSON, schema, logger | active; returns null on invalid/missing entries. |
| `src/composer/experienceDimensions.ts` | TS | Loads and validates experience dimensions JSON; exports `getExperienceDimensions`. | domain adapter | dimensions JSON, schema, logger | active. |
| `src/composer/interactionMatrix.ts` | TS | Conservative interaction-gain table; exports `getInteractionGain`. | domain logic | `clamp01` | active; hardcoded matrix should be evidence-audited before expansion. |

## Engine: Audio

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/engine/audio/index.ts` | TS | Barrel export for audio types, context manager, engine, graph builder, FX. | adapter/public API | local audio modules | active. |
| `src/engine/audio/types.ts` | TS | Audio status, mode, metrics, module, and stack types. | contract | WebAudio concepts | active. |
| `src/engine/audio/contextManager.ts` | TS | Shared AudioContext lifecycle; exports context start/close/listener helpers. | adapter/runtime | WebAudio, logger | active; user-gesture and status correctness are high risk. |
| `src/engine/audio/audioEngine.ts` | TS | Owns WebAudio runtime, synth/mic/mix routing, analyser metrics, FX rebuilds, mic gate, cleanup; exports `createAudioEngine` and control/debug types. | runtime/domain logic | context manager, synth, FX, graph builder, numeric, logger | active; highest-risk. Smells: 639 lines, many mutable resources, broad state transitions, swallowed disconnect errors mostly intentional. |
| `src/engine/audio/audioGraphBuilder.ts` | TS | Builds/connects audio FX chains; exports `AUDIO_NODE_TYPE_KEYS`, `buildAudioChain`, `connectAudioChain`, `rampGain`, type guards. | domain adapter | audio FX factories, logger | active; unknown nodes skipped with warnings. |
| `src/engine/audio/synth.ts` | TS | Synth source module; exports `createSynth`. | runtime/domain logic | WebAudio oscillators/noise buffers | active. |
| `src/engine/audio/fx/index.ts` | TS | Barrel export for audio FX factories. | adapter/public API | local FX modules | active. |
| `src/engine/audio/fx/lowpass.ts` | TS | Low-pass filter FX; exports `createLowpass`. | domain logic | WebAudio BiquadFilter, clamp | active. |
| `src/engine/audio/fx/highpass.ts` | TS | High-pass filter FX; exports `createHighpass`. | domain logic | WebAudio BiquadFilter, clamp | active. |
| `src/engine/audio/fx/tremolo.ts` | TS | Tremolo FX; exports `createTremolo`. | domain logic | WebAudio oscillator/gain, clamp | active. |
| `src/engine/audio/fx/noiseBed.ts` | TS | Noise bed FX; exports `createNoiseBed`. | domain logic | WebAudio buffers, clamp | active; seeded/random behavior is contract-tested. |
| `src/engine/audio/fx/compressor.ts` | TS | Compressor/limiter FX; exports `createCompressor`. | domain logic | WebAudio DynamicsCompressor, clamp | active. |
| `src/engine/audio/fx/delay.ts` | TS | Delay FX; exports `createDelay`. | domain logic | WebAudio Delay/Gain, clamp | active. |
| `src/engine/audio/fx/reverb.ts` | TS | Convolver reverb FX; exports `createReverb`. | domain logic | WebAudio Convolver, generated impulse, clamp | active. |
| `src/engine/audio/fx/flutter.ts` | TS | Flutter modulation FX; exports `createFlutter`. | domain logic | WebAudio oscillator/gain/delay, clamp | active. |
| `src/engine/audio/fx/pulseTone.ts` | TS | Pulse tone FX; exports `createPulseTone`. | domain logic | WebAudio oscillator/gain, clamp | active. |

## Engine: Video, Canvas, WebGL, Effects

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/engine/video/types.ts` | TS | Camera state/error types. | contract | browser media APIs | active. |
| `src/engine/video/camera.ts` | TS | Camera permission and cleanup helpers; exports `requestVideoStream`, `stopVideoStream`. | adapter/runtime | `navigator.mediaDevices.getUserMedia` | active; permission gate is high risk. |
| `src/engine/video/index.ts` | TS | Barrel export for video API/types. | adapter/public API | `camera.ts`, `types.ts` | active. |
| `src/engine/canvas/index.ts` | TS | Chooses WebGL overlay with Canvas2D fallback; exports overlay types, `startOverlayLoop`, `syncCanvasToContainer`. | adapter/runtime | `overlayRenderer`, `webglPipeline`, logger callbacks | active; fallback correctness is high risk. |
| `src/engine/canvas/overlayRenderer.ts` | TS | Canvas2D fallback renderer; exports `syncCanvasToContainer`, `startOverlayLoop`. | runtime/fallback | Canvas2D API | active via fallback; prove with WebGL failure smoke before cleanup. |
| `src/engine/canvas/webglPipeline.ts` | TS | Three.js render loop, node chain, reactive/audio overrides, diagnostics, context loss handling; exports `startWebGLOverlayLoop`. | runtime | Three.js, webgl helpers, video metrics, audio metrics | active; highest-risk. Smells: 557 lines, compat `getRms` option, complex cleanup and render-loop state. |
| `src/engine/canvas/webglPipelineTypes.ts` | TS | Video pipeline param contract. | contract | effect node params | active. |
| `src/engine/canvas/videoMetrics.ts` | TS | Frame metric sampler/tracker; exports `createVideoMetricsTracker`. | domain logic/runtime | numeric smoothing | active. |
| `src/engine/canvas/webgl/constants.ts` | TS | FPS thresholds and render scales. | config/domain constants | none | active. |
| `src/engine/canvas/webgl/diagnostics.ts` | TS | WebGL resource diagnostics; exports create/update helpers. | runtime diagnostics | none | active. |
| `src/engine/canvas/webgl/loop.ts` | TS | Render-scale decision logic; exports `computeNextRenderScaleIndex`. | domain logic | constants via callers | active. |
| `src/engine/canvas/webgl/params.ts` | TS | UV, reactive override, and control-value merge helpers. | domain logic/runtime helper | none | active; route/merge behavior needs tests for new params. |
| `src/engine/canvas/webgl/renderHelpers.ts` | TS | Fullscreen quad material/geometry/render helpers; exports render helpers and `toNodeName`. | runtime helper | Three.js | active. |
| `src/engine/canvas/webgl/resources.ts` | TS | Render target and temporal ping-pong allocation/disposal. | runtime helper | Three.js render targets | active; resource leaks are high risk. |
| `src/engine/effects/VideoNode.ts` | TS | Video node interface and param contract. | contract | Three.js `Texture`, `Material` | active; public engine contract. |
| `src/engine/effects/index.ts` | TS | Barrel export for all video nodes. | adapter/public API | local node classes | active; factory/registry can drift from this. |
| `src/engine/effects/paramUtils.ts` | TS | Shared shader/node param helpers; exports clamp, UV helpers, param resolvers. | domain helper | numeric clamp | active. |
| `src/engine/effects/chromaticAberrationNode.ts` | TS | Shader node; exports `ChromaticAberrationNode`. | runtime/effect | Three.js, `paramUtils` | active if referenced by factory/profile/registry; otherwise prove by `verify:contracts`. |
| `src/engine/effects/colorGradeNode.ts` | TS | Shader node; exports `ColorGradeNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/edgeSharpenNode.ts` | TS | Shader node; exports `EdgeSharpenNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/feedbackLoopNode.ts` | TS | Shader node; exports `FeedbackLoopNode`. | runtime/effect | Three.js, `paramUtils` | active; temporal/feedback behavior should be audited. |
| `src/engine/effects/focusJitterNode.ts` | TS | Shader node; exports `FocusJitterNode`. | runtime/effect | Three.js, `paramUtils` | active; motion-heavy node. |
| `src/engine/effects/gazeTunnelNode.ts` | TS | Shader node; exports `GazeTunnelNode`. | runtime/effect | Three.js, `paramUtils` | active in current tree; new/untracked in git status, verify before relying. |
| `src/engine/effects/glassVeilNode.ts` | TS | Shader node; exports `GlassVeilNode`. | runtime/effect | Three.js, `paramUtils` | active in current tree; new/untracked in git status, verify before relying. |
| `src/engine/effects/grainNode.ts` | TS | Shader node; exports `GrainNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/gridHintNode.ts` | TS | Shader node; exports `GridHintNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/hazeNode.ts` | TS | Shader node; exports `HazeNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/interferenceNode.ts` | TS | Shader node; exports `InterferenceNode`. | runtime/effect | Three.js, `paramUtils` | active; has dedicated tests. |
| `src/engine/effects/intrusionBurstNode.ts` | TS | Shader node; exports `IntrusionBurstNode`. | runtime/effect | Three.js, `paramUtils` | active in current tree; new/untracked in git status, verify before relying. |
| `src/engine/effects/pulseNode.ts` | TS | Shader node; exports `PulseNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/salienceCompetitionNode.ts` | TS | Shader node; exports `SalienceCompetitionNode`. | runtime/effect | Three.js, `paramUtils` | active in current tree; new/untracked in git status, verify before relying. |
| `src/engine/effects/softBlurNode.ts` | TS | Shader node; exports `SoftBlurNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/effects/somaticPulseNode.ts` | TS | Shader node; exports `SomaticPulseNode`. | runtime/effect | Three.js, `paramUtils` | active in current tree; new/untracked in git status, verify before relying. |
| `src/engine/effects/temporalSmearNode.ts` | TS | Shader node; exports `TemporalSmearNode`. | runtime/effect | Three.js, `paramUtils` | active; temporal behavior is high risk. |
| `src/engine/effects/vignetteNode.ts` | TS | Shader node; exports `VignetteNode`. | runtime/effect | Three.js, `paramUtils` | active. |
| `src/engine/nodeTypes.ts` | TS | Implemented audio/video node set bridge for composer and reports. | contract adapter | graph builder, audio graph builder | active; may import runtime factories for metadata. |

## Reactive Engine

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/engine/reactive/index.ts` | TS | Barrel export for reactive API. | adapter/public API | local reactive modules | active. |
| `src/engine/reactive/analyserToParamsResolver.ts` | TS | Resolves profile reactive targets to built video/audio targets; exports `resolveAnalyserTarget`. | domain logic | graph builder index helpers, target parser | active; target-index correctness is high risk. |
| `src/engine/reactive/reactiveDriver.ts` | TS | Converts analyser metrics into smoothed video/audio overrides; exports `createReactiveDriver`. | domain logic/runtime | profile entries, target resolver, numeric smoothing, logger | active. |
| `src/engine/reactive/couplingEngine.ts` | TS | Bidirectional audio/video coupling heuristics; exports `createCouplingEngine`. | domain logic/runtime | profile safety, reduced motion, audio/video metrics, numeric smoothing | active; likely overcomplicated. Smells: 575 lines, heuristic branching, many safety clamps. |

## Evidence and Utilities

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/evidence/docs.ts` | TS | Evidence document manifest and dynamic Markdown loading; exports `listEvidenceDocPaths`, `loadEvidenceDoc`, `isEvidenceDocPath`. | adapter | Vite raw Markdown imports, logger | active; paths are public UX contract. |
| `src/evidence/markdown.ts` | TS | Sanitized Markdown-to-HTML rendering; exports `renderEvidenceMarkdown`. | adapter/security boundary | `marked`, `dompurify` | active; high-risk HTML boundary. |
| `src/utils/jsonObjectParser.ts` | TS | Robust first-JSON-object extraction; exports `parseFirstJsonObject`. | domain helper | JSON parser | active; scripts rely on it for docs with embedded JSON. |
| `src/utils/logger.ts` | TS | Environment-aware console logger; exports `logger`. | adapter | `import.meta.env` | active; privacy-sensitive logging convention. |
| `src/utils/numeric.ts` | TS | Numeric clamp/smoothing helpers; exports `clamp`, `clamp01`, `smoothStep`. | domain helper | none | active. |
| `src/utils/targetPath.ts` | TS | Parses scoped target strings; exports `parseScopedTarget`. | domain helper/contract | none | active. |

## Contract Verification

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `src/contractVerification/types.ts` | TS | Contract-verification type model. | contract/test support | none | active. |
| `src/contractVerification/utils.ts` | TS | Contract helper functions; exports object path and seeded random helpers. | test/support | none | active. |
| `src/contractVerification/fakeAudioContext.ts` | TS | Fake WebAudio implementation for tests/probes; exports fake context/node classes and buffer hash. | test/support | WebAudio-like contracts | active; test fake can drift from browser behavior. |
| `src/contractVerification/audioNodeRegistry.ts` | TS | Audio node metadata/probes; exports `audioNodeDefinitions`. | contract/test support | FX factories, fake audio context, contract utils | active; high-risk registry drift. |
| `src/contractVerification/videoNodeRegistry.ts` | TS | Video node metadata/probes; exports `videoNodeDefinitions`. | contract/test support | video node classes, contract utils | active; high-risk registry drift. |

## Scripts

| File | Type | Responsibility and main exports | Runtime role | Direct dependencies worth knowing | Status / smells |
|---|---|---|---|---|---|
| `scripts/conditions-validate.ts` | TS script | Validates catalog/profiles/docs and graph/reactive targets. | script | condition schema, graph builder, reactive resolver | active via `npm run conditions:validate`. |
| `scripts/composer-validate.ts` | TS script | Validates composer mappings, dimensions, finite numbers, and profile composition invariants. | script | profile schema, composer core, JSON parser | active via `npm run composer:validate`; uses file reads rather than Vite imports. |
| `scripts/evidence-verify.ts` | TS script | Verifies evidence references and docs exist. | script | JSON parser, docs/filesystem | active via `npm run evidence:verify`. |
| `scripts/evidence-pages-gen.ts` | TS script | Generates evidence pages from reference docs. | script/generated output | filesystem, JSON parser | active via `npm run evidence:gen`; 708 lines, likely overcomplicated. |
| `scripts/gen-docs.ts` | TS script | Generates docs/generated condition catalog and schemas. | script/generated output | filesystem, zod JSON schema, condition schemas | active via `npm run docs:gen`. |
| `scripts/nodes-report.ts` | TS script | Reports node usage across profiles/mappings. | script | JSON parser, implemented node sets, schemas | active via `npm run nodes:report`. |
| `scripts/references-audit.ts` | TS script | Audits references and writes reference audit output. | script | JSON parser, schemas, filesystem | active via `npm run references:audit`. |
| `scripts/runtime-matrix.ts` | TS script | Launches app in Playwright and checks runtime/audio/mic matrix. | script/runtime smoke | child process, Playwright | active via `npm run runtime:matrix`; high-risk smoke harness with many catch/continue paths. |
| `scripts/debug-inspect.ts` | TS script | Runs inspect harness and prints warnings/errors. | script | `scripts/lib/inspectHarness.ts` | active via `npm run debug:inspect`. |
| `scripts/verify-contracts.ts` | TS script | Runs contract verifier and writes JSON/Markdown reports. | script/generated output | `scripts/lib/verifyContracts.ts`, contract types | active via `npm run verify:contracts`. |
| `scripts/run-preview-smoke.mjs` | MJS script | Starts Vite preview and requests base URL. | script/runtime smoke | child process, fetch | active via `npm run test:e2e:preview`. |
| `scripts/convert-readme-screenshots.mjs` | MJS script | Converts README PNG screenshots to WebP. | script/generated output | `sharp`, filesystem | active via screenshot scripts. |
| `scripts/verify-readme-screenshots.mjs` | MJS script | Validates screenshot manifest/assets/README references. | script | `sharp`, filesystem | active via `npm run screenshots:verify`. |
| `scripts/lib/jsonContracts.ts` | TS library | Loads profile/mapping contract references for verifier. | script library | filesystem, profile schema, JSON parser, contract types | active; 295 lines, parse/reference logic deserves tests when changed. |
| `scripts/lib/verifyContracts.ts` | TS library | Contract verification engine; exports numeric/probe helpers and `verifyContracts`. | script library/domain logic | graph builder, schemas, registries, resolver | active; likely overcomplicated, 666 lines. |
| `scripts/lib/inspectHarness.ts` | TS library | Runtime inspect harness for profiles, video nodes, audio chains, disposal, finite values. | script library/runtime test | Three.js, graph builder, fake audio context, audio graph builder | active; likely overcomplicated, 624 lines. |

## Tests

These files are active if the relevant `vitest` or npm E2E command is run. They
are not production code, but they define the current safety net.

| File | Type | Primary target | Runtime role | Status / smells |
|---|---|---|---|---|
| `tests/analyserResolver.test.ts` | TS | `resolveAnalyserTarget` | test | active. |
| `tests/audioEngine.test.ts` | TS | `createAudioEngine` lifecycle/mic/routing | test | active; large fake-heavy test. |
| `tests/audioEngineInitRace.test.ts` | TS | audio init race behavior | test | active. |
| `tests/audioFx.test.ts` | TS | audio FX factories | test | active. |
| `tests/audioFxPartialParams.test.ts` | TS | partial param defaults for FX | test | active; new/untracked in git status. |
| `tests/audioGraphBuilder.test.ts` | TS | audio graph builder | test | active. |
| `tests/clipboard.test.ts` | TS | clipboard adapter | test | active. |
| `tests/compose.test.ts` | TS | runtime composer wrapper | test | active. |
| `tests/composeBlend.test.ts` | TS | blend/merge helpers | test | active; large. |
| `tests/composeCore.test.ts` | TS | core composition algorithm | test | active; large. |
| `tests/composerControls.test.tsx` | TSX | reusable controls | test | active. |
| `tests/composerSafetyClamps.test.ts` | TS | composer safety clamps | test | active. |
| `tests/composerUtils.test.tsx` | TSX | composer UI helpers | test | active. |
| `tests/conditionComposerPanelHash.test.tsx` | TSX | composer URL hash behavior | test | active. |
| `tests/conditionComposerPanelStrength.test.tsx` | TSX | composer evidence strength sorting/rendering | test | active. |
| `tests/conditionPicker.test.tsx` | TSX | condition picker UI | test | active. |
| `tests/contractProbe.test.ts` | TS | contract probe metadata behavior | test | active. |
| `tests/contractUsageRegression.test.ts` | TS | selected contract usage regressions | test | active. |
| `tests/controlTargets.test.ts` | TS | UI control target resolution/defaults | test | active. |
| `tests/couplingEngine.test.ts` | TS | coupling engine behavior | test | active; large heuristic coverage. |
| `tests/debugInspectHarness.test.ts` | TS | inspect harness smoke | test | active. |
| `tests/dimensionSchemas.test.ts` | TS | dimension/mapping schemas | test | active. |
| `tests/dimensionToSignalMapping.test.ts` | TS | mapping loader | test | active. |
| `tests/dpdrReactiveTarget.test.ts` | TS | DPDR profile reactive target | test | active. |
| `tests/effectControls.test.tsx` | TSX | effect controls | test | active. |
| `tests/effectControlsExtra.test.tsx` | TSX | additional effect controls states | test | active. |
| `tests/errorBoundary.test.tsx` | TSX | error boundary | test | active. |
| `tests/evidenceHref.test.ts` | TS | evidence URL resolver | test | active. |
| `tests/evidenceMarkdown.test.ts` | TS | Markdown sanitizer/rendering | test | active; security-sensitive. |
| `tests/fallbackProfiles.test.ts` | TS | fallback profile behavior | test | active. |
| `tests/graphBuilder.test.ts` | TS | video graph builder | test | active. |
| `tests/interactionMatrix.test.ts` | TS | interaction matrix | test | active. |
| `tests/interferenceNode.test.ts` | TS | interference shader node | test | active. |
| `tests/jsonObjectParser.test.ts` | TS | JSON object parser | test | active. |
| `tests/loader.test.ts` | TS | condition loader/schema failures | test | active. |
| `tests/logger.test.ts` | TS | logger behavior | test | active. |
| `tests/multimorbidPresetList.test.tsx` | TSX | preset list UI | test | active. |
| `tests/normalize.test.ts` | TS | safety normalization | test | active. |
| `tests/numeric.test.ts` | TS | numeric helpers | test | active. |
| `tests/onboardingModal.test.tsx` | TSX | onboarding localStorage/UI | test | active. |
| `tests/paramUtils.test.ts` | TS | effect param utils | test | active. |
| `tests/presetCodecRobustness.test.ts` | TS | preset URL codec robustness | test | active. |
| `tests/presetShare.test.ts` | TS | preset hash share helpers | test | active. |
| `tests/presetSnapshot.test.ts` | TS | snapshot schema/legacy migration | test | active; compat coverage. |
| `tests/profileDistinctiveness.test.ts` | TS | profile distinctiveness/contracts | test | active; new/untracked in git status. |
| `tests/profileLoadRace.test.ts` | TS | composed profile race/ordering behavior | test | active. |
| `tests/reactiveDriver.test.ts` | TS | reactive driver | test | active. |
| `tests/screenshotManifest.test.ts` | TS | screenshot manifest | test | active. |
| `tests/symptomDimensionList.test.tsx` | TSX | symptom list UI | test | active. |
| `tests/synth.test.ts` | TS | synth module | test | active. |
| `tests/targetPath.test.ts` | TS | target path parser | test | active. |
| `tests/useAsyncEffect.test.ts` | TS | async effect cancellation | test | active. |
| `tests/useProfileLoad.test.tsx` | TSX | profile load hook | test | active; new/untracked in git status. |
| `tests/videoEffectNodes.test.ts` | TS | video node classes | test | active; broad but may not prove visual quality. |
| `tests/webglLoop.test.ts` | TS | render scale decision logic | test | active. |
| `tests/webglParams.test.ts` | TS | WebGL param merging/UV helpers | test | active. |
| `tests/e2e/ui-debug.e2e.mjs` | MJS | browser UI/debug flows and rapid switching | test/E2E | active via `npm run test:e2e:ui`; 622 lines, likely overcomplicated harness. |
| `tests/e2e/cross-browser-smoke.e2e.mjs` | MJS | Chrome/Firefox/WebKit synthetic camera smoke | test/E2E | active via `npm run test:e2e:cross-browser`; cross-browser risk surface. |
| `tests/e2e/readme-screenshots.mjs` | MJS | README screenshot capture | test/generated output | active via screenshot scripts. |

## Generated, Build, and Artifact Areas

| Path | Type | Responsibility | Runtime role | Status / smells |
|---|---|---|---|---|
| `dist/` | build output | Vite production build output. | generated | generated; not inspected file-by-file. |
| `reports/contract-verification.*` | generated report | Contract verifier output. | generated | generated; not source of truth. |
| `docs/generated/` | generated docs | Generated condition catalog/schema docs. | generated | generated; edit scripts/source data instead. |
| `assets/readme/screenshots/` | generated/static assets | README screenshots and manifest. | generated/static | verify with screenshot scripts before release changes. |
| `node_modules/` | dependencies | Installed packages. | generated/vendor | not inspected. |
| `.github/` | CI/dependency automation | Workflow/dependabot config. | config | present but outside this source index scope; current worktree shows unrelated edits. |

## Highest-Risk Files

1. `src/ui/CameraView.tsx` - central state coordinator for camera, audio, profile, storage, debug, and evidence UI.
2. `src/ui/hooks/useReactivePipeline.ts` - owns runtime loop lifecycle and cross-domain coupling setup/teardown.
3. `src/engine/audio/audioEngine.ts` and `src/engine/audio/contextManager.ts` - WebAudio, mic permissions, routing, analyser metrics, and cleanup.
4. `src/engine/canvas/webglPipeline.ts` plus `src/engine/canvas/webgl/resources.ts` - GPU resources, render loop, context loss, and fallback trigger.
5. `src/conditions/schema.ts`, `src/conditions/graphBuilder.ts`, and profile JSON files - runtime contract between data and executable nodes.
6. `src/evidence/markdown.ts` and `src/evidence/docs.ts` - sanitized HTML boundary and evidence path contract.
7. `src/ui/presetSnapshot.ts`, `src/ui/presetShare.ts`, and `src/ui/ConditionComposerPanel.tsx` - URL hash/localStorage import paths that must never auto-start camera/audio.

## Likely Dead Files

- None confirmed from static inspection.
- `src/engine/canvas/overlayRenderer.ts` appears active only as WebGL fallback via `src/engine/canvas/index.ts`; proving it is live requires forcing WebGL failure or testing fallback.
- Individual shader node files with only barrel/factory references are not dead by that fact alone; proving deadness requires checking `NODE_FACTORY`, contract registries, profiles, dimension mappings, and `npm run verify:contracts`.
- Generated/build artifacts under `dist/`, `reports/`, and `docs/generated/` should not be treated as source even when present.

## Likely Overcomplicated Files

- `src/ui/CameraView.tsx` - 883 lines and many interdependent state/ref transitions.
- `src/ui/ConditionComposerPanel.tsx` - 666 lines mixing UI, storage migration, hash import/export, and list management.
- `src/engine/audio/audioEngine.ts` - 639 lines of mutable WebAudio/mic lifecycle state.
- `src/engine/canvas/webglPipeline.ts` - 557 lines of render-loop/resource/diagnostic logic.
- `src/engine/reactive/couplingEngine.ts` - 575 lines of heuristic coupling and clamp logic.
- `src/composer/composeCore.ts`, `src/composer/composeBlend.ts`, and `src/composer/composeSafety.ts` - composition pipeline has many merge and safety branches.
- `scripts/lib/verifyContracts.ts`, `scripts/lib/inspectHarness.ts`, `scripts/evidence-pages-gen.ts`, and E2E scripts - large validation harnesses with many branches.

## Likely Deprecated Compatibility Paths

- `src/ui/presetSnapshot.ts` exports `migrateLegacyPresetPayload`.
- `src/ui/ConditionComposerPanel.tsx` reads a legacy preset storage key and migrates it.
- `src/engine/canvas/webglPipeline.ts` keeps `ReactiveLoopOptions.getRms` as back-compat fallback when `getAudioMetrics` is missing.
- `src/composer/composeCore.ts` re-exports types for backward compatibility.

Before deleting any of these, prove current persisted hashes/localStorage,
callers, docs, tests, and expected public behavior no longer require them.

## Recommended Next Audit Targets

1. Runtime lifecycle audit: `CameraView`, `useReactivePipeline`, audio engine, WebGL pipeline, Stop Everything, and cleanup/error states.
2. Contract drift audit: profiles, dimension mapping, graph builder, node registries, and contract verifier reports.
3. Storage/import safety audit: URL hash decode, localStorage migrations, onboarding flag, and guarantee that passive imports cannot start AV.
4. UI truthfulness audit: status labels, debug panel values, warnings, Safe Mode/Reduced Motion behavior, and error/empty/loading states.
5. Test quality audit: ensure tests fail for user-visible/runtime contract breaks, not implementation trivia.
6. Script maintainability audit: large verifier/inspect/E2E scripts and generated-output boundaries.

## Coverage Gaps and Uncertainty

- This index used static inspection and selected high-risk file reads; it did not execute build, lint, tests, E2E, or runtime smoke checks.
- Shader visual quality, WebAudio output quality, browser permission behavior, and WebGL fallback behavior were not runtime-verified.
- File status is based on current working tree imports/exports and npm scripts. The worktree already contains many unrelated modifications and untracked files; this index reflects the live tree, not necessarily committed `main`.
- CSS files were mapped by imports and responsibility, but not visually audited for contrast, clipping, responsiveness, or dead selectors.
- Generated/build/vendor directories were represented by area only, not file-by-file.
- `.github/` automation and deployment headers were not deeply inspected in this pass.
