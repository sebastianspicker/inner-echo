# Architecture Map

Date: 2026-05-16  
Scope: runtime structure, data/control flow, dependency boundaries, and contracts
that must not be broken. This is documentation-only and reflects the live working
tree.

Evidence used: `docs/20_ARCHITECTURE.md`, `docs/code-index.md`,
`docs/verification-baseline.md`, `package.json`, `.github/workflows/ci.yml`,
flow-critical files under `src/`, scripts, and test names. No production code was
changed.

## System Shape

`inner-echo` is a client-only Vite/React app. It has no backend, database, server
job queue, or migration system in the current repo. Runtime state lives in the
browser: React state/refs, media streams, WebAudio nodes, WebGL resources,
`localStorage`, and URL hash imports.

High-level flow:

```text
index.html
  -> src/main.tsx
    -> ErrorBoundary
      -> App
        -> CameraView
          -> condition/profile loading
          -> camera stream
          -> WebGL/Canvas overlay
          -> optional WebAudio + optional mic
          -> reactive/coupling loops
          -> evidence drawer
          -> debug panel in dev
```

## Main Runtime Entry Points

- `index.html`: Vite HTML shell.
- `src/main.tsx`: React root; wraps `App` in `ErrorBoundary`; imports global CSS.
- `src/app/App.tsx`: renders `CameraView`.
- `src/ui/CameraView.tsx`: top-level runtime coordinator for profile state,
  camera, audio, mic, overlay, evidence, debug UI, and keyboard shortcuts.
- `src/ui/hooks/useProfileLoad.ts`: loads preset profiles or composed profiles.
- `src/ui/hooks/useReactivePipeline.ts`: starts/stops the overlay loop once the
  camera is active.
- `src/engine/video/camera.ts`: camera `getUserMedia({ video: true, audio: false })`.
- `src/engine/audio/contextManager.ts` and `src/engine/audio/audioEngine.ts`:
  AudioContext, synth, mic, analyser, FX graph, and cleanup.
- `src/engine/canvas/index.ts`: selects WebGL overlay or Canvas2D fallback.
- `src/engine/canvas/webglPipeline.ts`: Three.js render loop and video node chain.

## Dependency Boundaries

```text
src/ui
  -> src/conditions, src/composer, src/engine, src/evidence, src/utils

src/conditions
  -> src/engine/effects only through graphBuilder bridge
  -> src/utils

src/composer
  -> src/conditions schemas/loaders/mapping
  -> src/engine/nodeTypes for implemented node sets
  -> src/utils

src/engine
  -> browser Web APIs, Three.js, utility functions
  -> does not import UI

src/evidence
  -> Vite raw Markdown imports, marked, DOMPurify

scripts
  -> source schemas/builders/registries plus Node filesystem/Playwright
```

Important hidden coupling:

- `conditions/graphBuilder.ts` imports engine effect classes. The file comments
  call this intentional: it translates profile JSON into live `VideoNode`s.
- Profile `video_stack` order must match built-node indices used by UI controls,
  reactive mappings, and WebGL per-node control keys such as `0.amount`.
- `ReactiveLoopOptions.getRms` in `webglPipeline.ts` is a back-compat path; the
  current preferred path is `getAudioMetrics`.
- `src/composer/composeCore.ts` re-exports some types for backward compatibility.
- `ConditionComposerPanel` intentionally disables `audioEnabled` when applying a
  shared URL hash because a passive import is not a user gesture.

## Domain Primitives

- `Profile`: Zod-validated condition runtime contract in `src/conditions/schema.ts`.
  Includes `id`, `label`, `summary`, `framing`, `experience_dimensions`,
  `video_stack`, optional `audio_stack`, optional `reactive`, `safety`, and UI controls.
- `Catalog`: `src/conditions/catalog.json`, used by the picker.
- `VideoStackNodeDef`: profile-declared video node `{ id?, node, params? }`.
- `AudioStackConfig`: profile-declared audio graph with `enabled`, `input`,
  `master.volume`, and `chain`.
- `VideoNode`: engine interface for shader/material nodes with `setParams`,
  `getMaterial`, optional `needsPreviousFrame`, and `dispose`.
- `AudioModule`: WebAudio FX module contract with input/connect/setParams/dispose.
- `VideoPipelineParams`: frame-loop params: `intensity`, `safeMode`,
  `controlValues`, `safetyContext`, and optional `stressMode`.
- `AudioMetrics` / `VideoMetrics`: live metrics used by reactive and coupling layers.
- `PresetPayload` / `PresetSnapshotV2`: URL hash/localStorage preset contracts.
- `EvidenceDocPath`: `docs/${string}.md` paths bundled by Vite raw imports.

## Configuration Sources

- `package.json`: npm scripts and dependency versions.
- `vite.config.ts`: Vite/Vitest config and dev/production security headers.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript compiler config.
- `biome.json`: lint/format policy.
- `.github/workflows/ci.yml`: CI commands, Node 22, Playwright install in RC gate.
- `src/conditions/*.json` and `src/conditions/profiles/*.json`: runtime data
  contracts, not sample data.
- `docs/references/**` and `docs/REFERENCES_AUDIT.md`: bundled evidence drawer docs.
- Browser state: `window.location.hash`, `localStorage`, media permissions,
  `import.meta.env.DEV`.

## Storage, Filesystem, and External APIs

Runtime browser storage:

- `localStorage['inner-echo-onboarding-accepted']`: onboarding acknowledgement.
- `localStorage['ie_custom_presets_v2']`: saved preset library.
- `localStorage['ie_custom_preset']`: legacy preset key migrated to v2 when possible.
- `window.location.hash` with `#preset=...`: shared preset import.

Runtime browser external APIs:

- `navigator.mediaDevices.getUserMedia({ video: true, audio: false })` for camera.
- `navigator.mediaDevices.getUserMedia({ audio: true })` for optional mic.
- `navigator.mediaDevices.devicechange` for camera interruption/disconnect checks.
- WebAudio `AudioContext` / `webkitAudioContext`.
- WebGL through Three.js, with Canvas2D fallback.
- Clipboard API through `navigator.clipboard.writeText`.
- DOM APIs: `history.replaceState`, `requestAnimationFrame`, `performance.now`.

Third-party runtime dependencies:

- `react`, `react-dom`
- `three`
- `zod`
- `marked`
- `dompurify`

Node/script-only dependencies include `vite`, `vitest`, `tsx`, `playwright`,
`sharp`, `typescript`, and `@biomejs/biome`.

Filesystem interactions are Node-script only: validators read JSON/docs, generators
write generated docs/evidence/screenshots/reports, and verification writes
`reports/*`, `dist/`, and `coverage/`.

## Public Contracts That Must Not Break

- Camera, microphone, and `AudioContext` startup must require direct user gesture.
- Passive imports from URL hash or localStorage must not start camera, microphone,
  or audio.
- Evidence Markdown HTML must go through `src/evidence/markdown.ts` and DOMPurify.
- Runtime network access should remain same-origin/local-first unless scope changes.
- Profile JSON schema, node ids, parameter names, control targets, and reactive
  targets must stay aligned with graph builders, audio builders, and contract registries.
- Unknown node handling differs by context:
  - Runtime builders skip unknown nodes with warnings.
  - `conditions:validate` and `verify:contracts` treat unknown contract references as failures.
- Safe Mode, Reduced Motion, Stop Everything, denied/error states, and debug
  status surfaces must reflect actual runtime state.
- `VideoNode` and `AudioModule` interfaces are engine contracts.
- `PresetPayload` and `PresetSnapshotV2` are storage/share contracts.
- `EvidenceDocPath` values must remain bundled or the evidence drawer reports missing docs.

## State Transitions

Camera state (`src/engine/video/types.ts`):

```text
idle -> requesting -> active
idle/requesting -> denied
idle/requesting/active -> error
active/error/denied -> idle via Stop Everything
```

Camera interruption:

```text
active stream track ended/devicechange/no live track
  -> overlay stop
  -> stream tracks stop
  -> video.srcObject = null
  -> cameraState = error
  -> user-facing camera notice
```

Audio status (`src/engine/audio/types.ts`):

```text
off -> starting -> on
starting -> error
on -> off via Stop Everything / context close
```

Mic status:

```text
off -> requesting -> on
requesting -> denied/error
on -> off via stopMic/Stop Everything
denied/error -> off when disabled or stopped
```

Input mode:

```text
synth <-> mix <-> mic
mic status off/denied/error forces non-synth input back to synth
```

Overlay:

```text
camera active + video metadata + profile
  -> build video nodes
  -> start WebGL overlay
  -> repeated WebGL/context startup failure
  -> Canvas2D fallback
  -> Stop Everything/unmount/profile/reduced-motion change stops current overlay
```

Profile/composer:

```text
preset mode -> loadProfile(conditionId) -> Profile or BASELINE_PROFILE
multimorbid/symptom mode -> composeEffectiveProfile(...) -> validated Profile or fallback profile
```

## Error-Handling Strategy

- User-facing camera errors are mapped by `getCameraErrorMessage`.
- Camera API failures return `{ ok: false, error }`; they do not throw past the caller.
- Profile/catalog loaders return `null` and log warnings; callers choose fallback behavior.
- Composer validates composed profiles and falls back to `createComposeFallbackProfile`
  if schema validation fails.
- Unknown video/audio nodes are skipped at runtime with warnings, but validation
  scripts fail them.
- WebGL startup/runtime fatal errors log and fall back to Canvas2D.
- AudioContext start reports `'error'` status and user message; close/suspend
  failures log warnings and still notify off.
- Mic request failures surface `denied` or `error` via callback and UI state.
- Evidence doc loading returns `null`; evidence drawer displays an error state.
- Clipboard copy returns false on failure rather than throwing to UI.
- React render errors are caught by `ErrorBoundary`.

## Major Flow Maps

### 1. App Bootstrap

- Starts when: browser loads `index.html`; Vite entry imports `src/main.tsx`.
- Trusted inputs: bundled JS/CSS from build; config from Vite.
- Untrusted inputs: none directly at bootstrap; later hash/localStorage are untrusted.
- Validation: TypeScript/build-time only; React `ErrorBoundary` catches render crashes.
- State read: DOM root `#root`; `localStorage` onboarding in `CameraView`.
- State written: React root; runtime component state.
- Can fail: missing root element, render error, bundled module error.
- Failure surfaced: thrown error for missing root is not custom-handled; render errors go to `ErrorBoundary`.
- Tests: `errorBoundary.test.tsx`, E2E initial load checks, build.
- Wrong result without crash: app can render misleading status if downstream runtime state is wrong.

### 2. Catalog and Preset Profile Load

- Starts when: `CameraView` mounts and when `conditionId`, `composerMode`, or
  `reducedMotion` changes.
- Trusted inputs: bundled `src/conditions/catalog.json` and profile JSON only after Zod validation.
- Untrusted inputs: selected profile id from UI/hash/localStorage.
- Validation: `catalogSchema`, `profileSchema`, `getDefaultControlValues`,
  `conditions:validate`, contract verification.
- State read: Vite JSON modules, current mode/profile id, prior control values.
- State written: `profile`, `composeReport`, `controlValues`, `intensity`,
  `isProfileLoading`.
- Can fail: missing profile, invalid JSON/schema, stale async result after mode change.
- Failure surfaced: loader logs warnings and returns `null`; preset mode falls back
  to `BASELINE_PROFILE`; composed profile wrapper can return fallback profile with warning.
- Tests: `loader.test.ts`, `fallbackProfiles.test.ts`, `useProfileLoad.test.tsx`,
  `profileLoadRace.test.ts`, `conditions-validate`.
- Wrong result without crash: fallback baseline can hide profile load failure unless
  warnings/logs are inspected; control defaults can drift from graph builder indices.

### 3. Composer Flow

- Starts when: user selects multimorbid or symptom mode, adjusts presets/dimensions,
  or applies shared/local preset payload.
- Trusted inputs: loaded preset profiles and dimension mapping only after schema checks.
- Untrusted inputs: UI selections, URL hash payload, localStorage snapshots.
- Validation: `PresetPayload` Zod schema, `composeEffectiveProfileCore` cleanup/clamp,
  `profileSchema` validation in `composeEffectiveProfile`.
- State read: selected presets/dimensions, composer settings, profile JSON,
  `experience-dimensions.json`, `dimension-to-signal-mapping.json`,
  implemented node sets.
- State written: composed `Profile`, `ComposeReport`, profile controls, local UI status.
- Can fail: missing preset, missing mapping, unsupported motif node, invalid composed profile.
- Failure surfaced: compose report lists missing presets/nodes/evidence gaps in dev UI;
  schema failure falls back to clean composed fallback profile and logs warning.
- Tests: `compose.test.ts`, `composeCore.test.ts`, `composeBlend.test.ts`,
  `composeSafetyClamps.test.ts`, `interactionMatrix.test.ts`,
  `dimensionToSignalMapping.test.ts`, `profileDistinctiveness.test.ts`.
- Wrong result without crash: unsupported dimension motifs are skipped with report entries;
  if dev report is hidden in production, the user may only see a conservative output.

### 4. Camera Start, Interruption, and Stop Everything

- Starts when: user clicks start or presses `k` after onboarding.
- Trusted inputs: browser `MediaStream` only after `getUserMedia` resolves.
- Untrusted inputs: browser permission state, device availability, track lifecycle.
- Validation: `requestVideoStream` checks `navigator.mediaDevices.getUserMedia`;
  `CameraView` checks request sequence to ignore stale streams.
- State read: `cameraState`, onboarding flag, refs for stream/video/overlay/audio.
- State written: `cameraState`, `errorMessage`, `streamRef`, `video.srcObject`,
  track `onended` handlers.
- Can fail: unsupported API, permission denied, playback failure, device disconnect,
  stale in-flight request, missing DOM refs.
- Failure surfaced: `denied` or `error` camera state plus user-facing callout.
- Tests: `ui-debug.e2e.mjs` covers onboarding gate, track end downgrade,
  Stop Everything; `cross-browser-smoke.e2e.mjs` covers Chrome in current baseline.
- Wrong result without crash: if track remains live but frames are black/frozen,
  current checks may not surface it; real hardware behavior is UNCLEAR without manual/device tests.

### 5. Overlay and WebGL/Canvas Flow

- Starts when: camera state is `active`, profile exists, and video metadata is available.
- Trusted inputs: built `VideoNode[]`, current profile safety context, container/video/canvas refs.
- Untrusted inputs: camera frame stream, GPU/WebGL behavior, window/device pixel ratio.
- Validation: `buildVideoNodes` skips unknown nodes; contract verifier checks known
  node/param references; WebGL startup errors are caught.
- State read: profile `video_stack`, reduced motion flag, UI controls, audio/video metrics.
- State written: WebGL render targets/textures/materials, canvas pixels, diagnostics,
  `videoMetricsRef`, overlay control ref.
- Can fail: WebGL startup error, context loss, repeated GL errors, invalid dimensions,
  node disposal errors, missing metadata.
- Failure surfaced: WebGL logs error/warning and switches to Canvas2D fallback;
  fallback has no shader effects and `setParams` is a no-op.
- Tests: `webglLoop.test.ts`, `webglParams.test.ts`, `videoEffectNodes.test.ts`,
  `interferenceNode.test.ts`, contract tests, E2E WebGL console checks.
- Wrong result without crash: Canvas2D fallback can make the app appear functional
  while effects are absent; shader visual quality is not proven by unit tests.

### 6. Audio Enable, Profile Audio Graph, and Mic Flow

- Starts when: user clicks audio enable or toggles audio-enabled settings; mic starts
  only after audio is on and user enables mic.
- Trusted inputs: profile `audio_stack` after schema validation; browser AudioContext
  after `startAudioContext`.
- Untrusted inputs: browser autoplay policies, audio hardware, mic permissions,
  mic stream data, profile audio params.
- Validation: `audioStackSchema`, `buildAudioChain` known-node factory, param clamps
  inside FX modules, `startAudioContext` state checks, mic request sequence.
- State read: profile audio stack, `audioEnabled`, input mode, mic sensitivity/gate,
  AudioContext singleton.
- State written: audio status, mic status/error, master volume, WebAudio nodes,
  mic stream tracks, analyser buffers, active chain node list.
- Can fail: AudioContext blocked or hardware error, mic denied, unknown audio node,
  disconnected/closed context, stale mic/audio request.
- Failure surfaced: audio/mic status and error callbacks update UI; unknown audio
  nodes are skipped with warnings; Stop Everything forces off states.
- Tests: `audioEngine.test.ts`, `audioEngineInitRace.test.ts`,
  `audioGraphBuilder.test.ts`, `audioFx.test.ts`, `audioFxPartialParams.test.ts`,
  `synth.test.ts`, runtime matrix with required audio/mic.
- Wrong result without crash: fake WebAudio tests do not prove real hardware output;
  skipped unknown audio nodes can produce silence or weaker effect while app continues.

### 7. Reactive Audio/Video Coupling Flow

- Starts when: overlay loop starts; `useReactivePipeline` creates one reactive driver
  and one coupling engine per profile/pipeline.
- Trusted inputs: resolved profile reactive targets, built video node index, audio/video metrics.
- Untrusted inputs: live analyser values, camera-derived metrics, profile target strings.
- Validation: target parsing via `parseScopedTarget`, built-index resolution,
  clamps/smoothing in reactive driver and coupling engine, contract and conditions validators.
- State read: profile `reactive.analyser_to_params`, audio metrics, video metrics,
  UI control values, safe/reduced motion/coupling refs.
- State written: per-frame video override object, audio override object, audio FX params,
  `videoMetricsRef`.
- Can fail: target not found, reduced motion changes built indices, missing audio chain,
  metric spikes, invalid/non-finite values.
- Failure surfaced: invalid reactive targets are logged and skipped; validators fail
  unresolved targets; runtime fallback is no override.
- Tests: `analyserResolver.test.ts`, `reactiveDriver.test.ts`,
  `couplingEngine.test.ts`, `controlTargets.test.ts`, `dpdrReactiveTarget.test.ts`,
  `profileDistinctiveness.test.ts`.
- Wrong result without crash: a valid but semantically wrong target can produce a
  believable but incorrect mapping; visual/audio quality remains UNCLEAR without runtime review.

### 8. Share, Preset Library, and Local Storage Flow

- Starts when: `ConditionComposerPanel` mounts, user saves/deletes/loads a preset,
  copies a share link, or the page loads with `#preset=...`.
- Trusted inputs: none until parsed and validated.
- Untrusted inputs: `window.location.hash`, `localStorage`, preset names, clipboard availability.
- Validation: base64url decode with max hash length, `PresetPayload` Zod schema,
  `PresetSnapshotV2` Zod schema, clamping/normalization in `createPresetPayload`,
  legacy migration schema.
- State read: current composer settings, `localStorage`, `window.location.hash`.
- State written: React composer state, `localStorage['ie_custom_presets_v2']`,
  legacy key removal, `history.replaceState`, clipboard.
- Can fail: malformed hash, oversized payload, invalid snapshot, storage quota,
  blocked clipboard, unavailable localStorage.
- Failure surfaced: invalid hash is ignored; localStorage errors log warnings and
  use empty library; copy/save statuses show copied/failed/saved/deleted/loaded.
- Tests: `presetSnapshot.test.ts`, `presetShare.test.ts`,
  `presetCodecRobustness.test.ts`, `conditionComposerPanelHash.test.tsx`.
- Wrong result without crash: passive hash import intentionally sets `audioEnabled`
  false; if future code re-enables audio here, it would violate the user-gesture contract.

### 9. Evidence Drawer Flow

- Starts when: user opens evidence from header, condition buttons, or keyboard `e`.
- Trusted inputs: bundled Markdown docs after path lookup.
- Untrusted inputs: Markdown links/hrefs inside docs and requested doc path from UI state.
- Validation: `EvidenceDocPath` type is compile-time only; loader checks Vite glob key;
  Markdown HTML is sanitized by DOMPurify.
- State read: requested doc path, Vite raw Markdown module map.
- State written: evidence drawer status/title/html, current doc path.
- Can fail: doc not bundled, loader throws, Markdown link resolves outside `docs/*.md`.
- Failure surfaced: drawer error state such as missing/could not load evidence doc;
  logger records load errors.
- Tests: `evidenceMarkdown.test.ts`, `evidenceHref.test.ts`,
  E2E evidence drawer open/navigation checks, `evidence:verify`.
- Wrong result without crash: missing docs surface as drawer errors; stale evidence
  can still render if present but semantically outdated, which this code cannot detect.

### 10. CLI Verification and Generated Output Flow

- Starts when: npm scripts are run locally or in CI.
- Trusted inputs: source tree after checkout/install; CI uses Node 22.
- Untrusted inputs: local Node version, installed Playwright browsers, generated artifacts.
- Validation: TypeScript, Biome, Vitest, Zod validators, contract verifier,
  Playwright E2E, screenshot verifier, npm audit.
- State read: `src/**`, `docs/**`, `assets/**`, `package-lock.json`.
- State written: `dist/`, `reports/contract-verification.*`, `reports/inspect.json`,
  `coverage/`, screenshot outputs for screenshot generation commands.
- Can fail: type/lint/test failure, schema mismatch, missing browser binaries,
  Node/toolchain mismatch.
- Failure surfaced: non-zero exit and console output; CI uploads reports on failure.
- Tests protecting it: the scripts themselves are part of verification; selected
  script libraries have tests such as `debugInspectHarness.test.ts` and contract tests.
- Wrong result without crash: local Node 26 emits `DEP0205` warnings while CI uses
  Node 22; Chrome-only local E2E can pass while Firefox/WebKit are unverified.

## Compatibility and Deprecation Layers

- `src/ui/presetSnapshot.ts`: `migrateLegacyPresetPayload` and legacy key
  `ie_custom_preset`.
- `src/ui/ConditionComposerPanel.tsx`: migrates legacy preset storage into v2 library.
- `src/engine/canvas/webglPipeline.ts`: `ReactiveLoopOptions.getRms` back-compat fallback.
- `src/composer/composeCore.ts`: type re-exports for backward compatibility.
- `src/conditions/graphBuilder.ts`: `chroma_aberration` alias for canonical
  `chromatic_aberration`.
- `src/engine/audio/contextManager.ts`: `webkitAudioContext` fallback for older Safari.

Do not remove these without proving current persisted hashes/localStorage, docs,
tests, and runtime callers no longer require them.

## Hidden Coupling and Wrong-Result Risks

- Built video node indices depend on reduced motion filtering and unknown-node
  skipping. UI controls, reactive targets, and coupling keys all assume those
  indices match the current built stack.
- `conditions:validate` expects all profile video nodes to build when reduced
  motion is false; runtime can still skip unknown nodes with warnings.
- `nodeTypes.ts` imports graph/audio builders to derive implemented node sets for
  composer checks, so composer knowledge is coupled to runtime factories.
- Contract registries (`src/contractVerification/*Registry.ts`) must track real
  runtime node params. Drift can make contract verification lie.
- `CameraView` keeps latest slider/settings values in refs for the frame loop.
  Missing a ref update can make UI state differ from runtime behavior.
- Debug panel metrics come from current control refs and diagnostics; they can
  look authoritative even if fallback mode or stale diagnostics are active.
- Canvas2D fallback runs without shader effects. It is correct as fallback, but
  can mask WebGL failure unless diagnostics or tests check renderer mode.
- Coverage and fake WebAudio tests do not prove real device output.

## Tests and Current Baseline

From the current baseline:

- `npm run verify` passes on the live tree.
- Unit/component suite: 56 files, 729 tests passed.
- Contract verification: 208 OK, 0 warnings, 0 errors.
- Runtime matrix including required audio/mic passed in Chromium.
- Full Firefox/WebKit E2E is blocked locally by missing Playwright browser binaries.
- Local Node is 26 while CI declares Node 22; several `tsx` scripts emit Node 26
  `DEP0205` warnings.

Flow-oriented test anchors:

- Bootstrap/UI: `errorBoundary.test.tsx`, `onboardingModal.test.tsx`,
  `conditionPicker.test.tsx`, E2E UI debug tests.
- Profile/contracts: `loader.test.ts`, `graphBuilder.test.ts`,
  `dimensionSchemas.test.ts`, `contractProbe.test.ts`,
  `contractUsageRegression.test.ts`.
- Composer/storage: `compose*.test.ts`, `presetSnapshot.test.ts`,
  `presetShare.test.ts`, `presetCodecRobustness.test.ts`,
  `conditionComposerPanelHash.test.tsx`.
- Audio/video/reactive: `audioEngine*.test.ts`, `audioFx*.test.ts`,
  `videoEffectNodes.test.ts`, `webgl*.test.ts`, `reactiveDriver.test.ts`,
  `couplingEngine.test.ts`.
- Evidence: `evidenceMarkdown.test.ts`, `evidenceHref.test.ts`, `evidence:verify`.
- Browser smoke: `tests/e2e/ui-debug.e2e.mjs`,
  `tests/e2e/cross-browser-smoke.e2e.mjs`, `scripts/runtime-matrix.ts`.

## Not Fully Understood / UNCLEAR

- Real camera and microphone hardware behavior is UNCLEAR from code and automated
  fake-device tests alone.
- Actual visual quality of shader effects is UNCLEAR without screenshot/canvas-pixel
  or human visual review.
- Actual audio quality, clipping, latency, and user comfort are UNCLEAR without
  browser/device listening tests.
- Whether legacy preset storage is still used by real users is UNCLEAR; evidence
  would be user migration requirements, telemetry-free support reports, or an
  explicit compatibility decision.
- Firefox/WebKit behavior is UNCLEAR in the current local baseline until
  Playwright browsers are installed and E2E is rerun.
- Production deployment headers are configured in Vite/public files, but real
  deployed CSP/Permissions-Policy behavior is UNCLEAR without deployment smoke.
