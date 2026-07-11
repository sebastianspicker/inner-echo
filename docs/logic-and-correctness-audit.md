# Logic and Correctness Audit

Date: 2026-05-16

Scope: source, tests, scripts, package commands, and current repository docs were
inspected for logical failures, silent wrong behavior, runtime crashes, API
misuse, edge cases, races, false success states, and misleading tests. This is
an audit only; no production code was changed.

Baseline checks run during this audit:

```text
npm run typecheck
npm test
```

Results:

- `npm run typecheck`: PASS.
- `npm test`: PASS, 56 files and 729 tests passed.

Passing tests do not cover every issue below. Several findings are about states
that can run without crashing while displaying stale, fallback, or misleading
output.

## Confirmed Issues

### LC-001

- Location: `src/ui/hooks/useProfileLoad.ts:78-107`,
  `src/ui/hooks/useProfileLoad.ts:120-159`, `src/ui/hooks/useAsyncEffect.ts:18-30`
- Evidence: `useProfileLoad` increments `loadingCount` before each async profile
  or composition load. After `await`, it returns early when `ctx.cancelled` is
  true, and the `finally` block decrements only when `!ctx.cancelled`. Cleanup in
  `useAsyncEffect` sets `cancelled = true` on dependency changes or unmount.
- Why it matters: Rapid condition/mode changes can leave `loadingCount` above
  zero forever, so the UI can keep showing `Preparing your experience...` after
  the latest profile has already loaded.
- Minimal reproduction or reasoning: Start a profile load, change dependencies
  before `loadProfile` or `composeEffectiveProfile` resolves, then let the old
  promise resolve. The old invocation increments but never decrements.
- Existing test coverage, if any: `tests/useProfileLoad.test.tsx` only verifies a
  simple successful preset load. `tests/profileLoadRace.test.ts` describes the
  hook cancellation pattern but tests `composeEffectiveProfileCore` and a manual
  sequence, not `useProfileLoad`'s `loadingCount`.
- Missing test that should exist: A hook test with a deferred `loadProfile` where
  props rerender before the first promise resolves; assert the stale result is
  ignored and `isProfileLoading` eventually becomes `false`.
- Suggested minimal fix: Always balance the loading counter for an invocation
  that incremented it, even if cancelled. Keep cancellation checks around state
  updates, not around decrement bookkeeping.
- Risk level: medium.
- Verification command or strategy: Add the hook race test, then run `npm test --
  tests/useProfileLoad.test.tsx tests/profileLoadRace.test.ts`.
- Confidence: high.

### LC-002

- Location: `src/ui/cameraMessages.ts:8-17`,
  `src/ui/CameraHeader.tsx:43-50`, `src/ui/CameraView.tsx:206-207`,
  `src/ui/CameraView.tsx:254-267`
- Evidence: `CameraState` includes `error`, and runtime paths set
  `setCameraState('error')` for stream interruption, playback failure, and
  non-denied camera request failures. `getCameraStateLabel` maps `error` to
  `Paused`.
- Why it matters: A camera failure can be displayed as a benign pause. The error
  callout may also be visible, but the header status is a false-success-ish state
  for a critical runtime resource.
- Minimal reproduction or reasoning: Force `video.play()` to reject or simulate a
  live track ending. `CameraView` sets `cameraState` to `error`; the status pill
  renders `Paused`.
- Existing test coverage, if any: No direct test for `getCameraStateLabel('error')`
  or header rendering in an error state was found.
- Missing test that should exist: A camera message/header test asserting that
  denied and error states render distinct labels and that `error` does not render
  as a normal stopped/paused state.
- Suggested minimal fix: Change the error label to an explicit non-success label
  such as `Interrupted` or `Error`, while keeping the detailed callout text.
- Risk level: low.
- Verification command or strategy: Run the new camera label/header test plus
  `npm test`.
- Confidence: high.

### LC-003

- Location: `src/engine/canvas/index.ts:77-118`,
  `src/engine/canvas/overlayRenderer.ts:61-70`,
  `src/engine/canvas/webglPipeline.ts:229-234`,
  `docs/archive/2026-04-22-effect-evidence-audit.md:345-362`
- Evidence: WebGL fatal errors call `install2dFallback()`. The fallback renderer
  then calls `canvas.getContext('2d')` and silently returns a no-op stop function
  if no 2D context is available. A canvas that has already been bound to WebGL
  generally cannot also become a 2D canvas. The archived audit records prior
  fallback probing where WebGL failure led to raw/no-effect passthrough and retry
  problems.
- Why it matters: The app can switch diagnostics to `rendererMode: '2d'` while
  the 2D loop is not actually drawing, or can show raw camera passthrough without
  shader effects. This is a silent wrong-output state rather than a crash.
- Minimal reproduction or reasoning: Start WebGL, trigger context loss or
  repeated GL errors, then observe `install2dFallback()` on the same canvas. If
  `getContext('2d')` returns null, the app keeps running with a fallback control
  that reports 2D diagnostics but draws nothing.
- Existing test coverage, if any: Existing unit tests cover WebGL params and E2E
  smoke starts the camera. The current baseline notes full Firefox/WebKit E2E was
  blocked by missing browsers. No test forces WebGL context loss or verifies 2D
  fallback pixels.
- Missing test that should exist: A browser-level fallback test that disables or
  loses WebGL, then asserts the canvas has nonblank 2D video pixels and the UI
  clearly indicates fallback/no effects.
- Suggested minimal fix: Treat fallback installation as a state transition with
  evidence. Use a fresh 2D canvas or an explicit fallback surface when WebGL has
  already claimed the canvas, and do not report 2D fallback as active unless a 2D
  context was obtained.
- Risk level: high.
- Verification command or strategy: Force WebGL startup failure and context loss
  in Playwright/Chrome; add canvas pixel checks; run `npm run test:e2e:ui` and
  `npm run runtime:matrix`.
- Confidence: high.

### LC-004

- Location: `src/ui/presetSnapshot.ts:120-132`,
  `src/ui/ConditionComposerPanel.tsx:198-238`,
  `tests/presetSnapshot.test.ts:272-276`
- Evidence: `parsePresetLibrary` returns `[]` for invalid JSON and silently drops
  invalid snapshot entries. `ConditionComposerPanel` treats `[]` as an empty
  library, not as corrupt storage. The test suite explicitly asserts that
  corrupted storage data returns an empty array.
- Why it matters: Saved presets can disappear from the UI without a user-visible
  storage error. This can run without crashing while losing recoverable user
  state.
- Minimal reproduction or reasoning: Put `corrupted{{{` or an array with invalid
  snapshot shapes in `localStorage['ie_custom_presets_v2']`; the panel loads an
  empty library and shows no error.
- Existing test coverage, if any: Tests cover the current silent-empty behavior,
  but not user-visible recovery or warning behavior.
- Missing test that should exist: A storage-corruption test that verifies the UI
  surfaces a warning or preserves recoverable valid snapshots while reporting
  invalid entries.
- Suggested minimal fix: Return parse diagnostics from the preset library parser
  or log/surface a warning when a nonempty storage value cannot be parsed. Keep
  valid entries if partial recovery is intentional.
- Risk level: medium.
- Verification command or strategy: Run `npm test -- tests/presetSnapshot.test.ts`
  and add a `ConditionComposerPanel` storage-corruption test.
- Confidence: high.

### LC-005

- Location: `src/ui/presetSnapshot.ts:135-181`,
  `src/ui/presetSnapshot.ts:41-47`,
  `src/ui/ConditionComposerPanel.tsx:204-220`
- Evidence: Legacy migration accepts arbitrary `conditionId`, `profileId`, and
  `dimensionId` strings through a permissive legacy schema, then calls
  `createPresetPayload`, which normalizes weights but does not validate
  identifiers. The v2 schema requires identifiers to match `/^[a-z0-9_-]+$/i`,
  but `createPresetSnapshot` does not validate the created payload before writing
  it to v2 storage.
- Why it matters: A malformed legacy preset can be migrated into an invalid v2
  snapshot. On a later read, `parsePresetLibrary` rejects that snapshot and the
  user sees an empty library.
- Minimal reproduction or reasoning: Seed legacy storage with
  `{ "conditionId": "bad id with spaces" }`. Migration creates a v2 snapshot with
  the invalid id, writes it, and removes the legacy key. Later v2 parsing rejects
  the stored snapshot.
- Existing test coverage, if any: Legacy migration tests cover missing and
  primitive values, but not invalid identifiers that are accepted by the legacy
  schema and rejected by v2.
- Missing test that should exist: A legacy migration test for invalid ids that
  asserts either rejection before write or canonical fallback ids before v2
  persistence.
- Suggested minimal fix: Validate the migrated payload with
  `presetPayloadSchema` before creating/writing a v2 snapshot, or sanitize invalid
  ids to known safe defaults with an explicit warning.
- Risk level: medium.
- Verification command or strategy: Add a legacy invalid-id migration test; run
  `npm test -- tests/presetSnapshot.test.ts`.
- Confidence: high.

## Suspected Issues Needing Runtime or Scope Verification

### LC-006

- Location: `src/ui/hooks/useProfileLoad.ts:120-159`,
  `src/composer/compose.ts:21-50`
- Evidence: `composeEffectiveProfile` handles schema-validation failure by
  returning a fallback profile, but `useProfileLoad`'s composition effect catches
  unexpected thrown errors by logging only. It does not set a fallback profile,
  clear the stale compose report, or surface an error state.
- Why it matters: If composition throws due to a dynamic import failure or an
  unexpected data error, the UI can continue showing the previous profile even
  though the selected multimorbid/symptom inputs changed.
- Minimal reproduction or reasoning: Mock `composeEffectiveProfile` to reject
  after a mode or selection change. The catch logs and leaves existing `profile`
  state untouched.
- Existing test coverage, if any: `tests/compose.test.ts` covers wrapper fallback
  for schema validation. No hook test was found for rejected composition.
- Missing test that should exist: A `useProfileLoad` test where composition
  rejects and the hook either switches to a known fallback profile or exposes an
  error state instead of preserving stale output.
- Suggested minimal fix: In the composition catch, set an explicit fallback
  profile/report or expose an error state that the UI renders.
- Risk level: medium.
- Verification command or strategy: Add a rejected-composition hook test; run
  `npm test -- tests/useProfileLoad.test.tsx tests/compose.test.ts`.
- Confidence: medium.

### LC-007

- Location: `src/ui/ConditionPicker.tsx:24-52`,
  `src/ui/CameraView.tsx:686`, `src/ui/ConditionComposerPanel.tsx:285-299`
- Evidence: `ConditionPicker` renders only provided options. `CameraView` falls
  back to `DEFAULT_PICKER_OPTIONS` containing only `none` and `anxiety` when the
  catalog is `null`. Shared hash or localStorage preset import can set
  `conditionId` to another valid profile id such as `panic`. The current selected
  value is not inserted when it is absent from the catalog list.
- Why it matters: The active profile can differ from what the dropdown can
  display. A user can run a valid profile while the picker appears empty or falls
  back to another visible option, depending on browser select behavior.
- Minimal reproduction or reasoning: Simulate catalog load failure, import a hash
  with `conditionId: 'panic'`, and render the picker. The selected value is not
  present in options.
- Existing test coverage, if any: Hash import tests assert callbacks and audio
  opt-out, but not picker rendering when the selected id is absent from catalog.
- Missing test that should exist: A `ConditionComposerPanel` or `CameraView` test
  for selected condition not present in `catalog`, asserting a visible placeholder
  or injected selected option.
- Suggested minimal fix: Ensure the selected condition id is represented in the
  picker options, even if only as `Unknown profile: <id>`, or block applying
  unknown ids with a visible fallback.
- Risk level: medium.
- Verification command or strategy: Add a UI test for missing selected catalog
  entry; run `npm test -- tests/conditionPicker.test.tsx
  tests/conditionComposerPanelHash.test.tsx`.
- Confidence: medium.

### LC-008

- Location: `src/engine/reactive/couplingEngine.ts:168-189`,
  `src/conditions/graphBuilder.ts:41-47`,
  `src/contractVerification/videoNodeRegistry.ts:163-164`
- Evidence: `graphBuilder` calls `chromatic_aberration` canonical and
  `chroma_aberration` a legacy alias. `couplingEngine` resolves coupling targets
  only for `video.chroma_aberration.amount`. A profile using the canonical node
  name without a short-form id would build and render, but the coupling engine
  would not find it.
- Why it matters: The effect can render correctly while AV coupling silently does
  nothing for that node. This is exactly the kind of plausible-but-wrong runtime
  output the audit is looking for.
- Minimal reproduction or reasoning: Create a profile with
  `{ node: 'chromatic_aberration', params: { amount: 0.1 } }`, run
  `createCouplingEngine`, and step with nonzero audio metrics. No chromatic
  override key is produced because the lookup uses the legacy short name.
- Existing test coverage, if any: Contract and node tests cover aliases broadly,
  but no test was found for coupling behavior with the canonical
  `chromatic_aberration` node name.
- Missing test that should exist: A coupling-engine test that both
  `chroma_aberration` and `chromatic_aberration` nodes receive equivalent
  coupling, or a contract test that declares only one supported runtime name.
- Suggested minimal fix: Normalize aliases before coupling lookup, or pick one
  canonical runtime node id and migrate data/tests to it.
- Risk level: medium.
- Verification command or strategy: Add the alias coupling test; run `npm test --
  tests/couplingEngine.test.ts tests/videoEffectNodes.test.ts` and `npm run
  verify:contracts`.
- Confidence: medium.

### LC-009

- Location: `src/engine/audio/audioEngine.ts:215-220`,
  `src/engine/audio/audioEngine.ts:501-521`
- Evidence: The comment says RMS is cached to avoid reading the analyser twice in
  the same frame. Both `getRms()` and `getMetrics()` increment `rmsFrameCounter`
  before comparing it with `cachedRmsFrame`, so the comparison is always stale for
  each public call and the analyser is read again.
- Why it matters: This is mostly a performance and test-trust issue, but it can
  also make debug RMS and metrics disagree within the same render frame if the
  analyser data changes between reads.
- Minimal reproduction or reasoning: Call `getRms()` and then `getMetrics()` on a
  fake analyser that changes its buffer per read. The code performs two reads
  despite the cache comment.
- Existing test coverage, if any: Audio tests cover init races and FX behavior,
  but no test was found for same-frame metric caching.
- Missing test that should exist: A fake-analyser test proving `getRms()` and
  `getMetrics()` share one RMS sample per frame or removing the cache claim if
  separate reads are intentional.
- Suggested minimal fix: Either implement a real per-animation-frame cache keyed
  by caller-provided frame/time, or remove the misleading cache and comment.
- Risk level: low.
- Verification command or strategy: Add a fake-analyser unit test; run `npm test
  -- tests/audioEngine.test.ts tests/audioEngineInitRace.test.ts`.
- Confidence: medium.

### LC-010

- Location: `src/ui/CameraView.tsx:430-438`,
  `src/ui/CameraView.tsx:550-558`,
  `src/ui/AudioMicControls.tsx:43-75`,
  `src/ui/CameraHeader.tsx:48-50`
- Evidence: Turning the composer/effect `audioEnabled` setting off only updates
  `audioEnabled`. If the audio engine is already running, a later effect sets the
  audio stack to disabled and master volume to `0`, but `audioStatus` remains
  `on`; the header and audio panel still display `Audio: on`.
- Why it matters: This may be intentional if `audioEnabled` means "condition
  audio is muted but the AudioContext remains live." It is misleading if users
  interpret the audio toggle as turning audio off.
- Minimal reproduction or reasoning: Enable audio, then toggle `Audio (optional)`
  off in the composer/effect controls. The engine remains `on` with volume zero.
- Existing test coverage, if any: Tests assert the audio toggle reflects boolean
  state in `EffectControls`, but no test verifies runtime status wording after
  disabling audio.
- Missing test that should exist: A UI/runtime test for audio enabled -> disabled
  that asserts the intended visible status and whether the AudioContext should
  stay running.
- Suggested minimal fix: Clarify semantics in UI state. If disabled means off,
  stop/suspend audio and show `off`; if it means muted, display `Audio: muted` or
  `Audio engine: on, sound: off`.
- Risk level: medium.
- Verification command or strategy: Browser smoke with audio enabled/disabled,
  plus `npm test -- tests/effectControlsExtra.test.tsx`.
- Confidence: low.

## Misleading or Weak Tests

### LC-011

- Location: `tests/profileLoadRace.test.ts:7-18`,
  `tests/profileLoadRace.test.ts:145-201`,
  `src/ui/hooks/useProfileLoad.ts:72-76`
- Evidence: The test file describes `useProfileLoad` and `useAsyncEffect`
  cancellation, but the tests exercise `composeEffectiveProfileCore` and a manual
  sequence variable. They do not render the hook and do not cover `loadingCount`.
- Why it matters: The test name and comments imply coverage of the hook race that
  LC-001 shows is not covered.
- Minimal reproduction or reasoning: Break `useProfileLoad` loading-count
  cancellation; these tests still pass because they do not import the hook.
- Existing test coverage, if any: This is the existing coverage, and it is
  misleading for hook behavior.
- Missing test that should exist: A real `renderHook` cancellation race test for
  `useProfileLoad`.
- Suggested minimal fix: Rename the existing tests to describe core composer
  concurrency, then add hook-level cancellation tests.
- Risk level: low.
- Verification command or strategy: Run `npm test -- tests/profileLoadRace.test.ts
  tests/useProfileLoad.test.tsx`.
- Confidence: high.

### LC-012

- Location: `tests/presetCodecRobustness.test.ts:172-195`
- Evidence: The test is named `Zod rejects NaN weight at schema level`, creates
  `const result = presetPayloadSchema.safeParse(raw)`, but never asserts
  `result`. It then asserts a JSON round-trip rejection path where `NaN` becomes
  `null`.
- Why it matters: The test title claims direct schema behavior, while the
  assertion proves JSON serialization behavior. A real schema-level NaN behavior
  change could go unnoticed.
- Minimal reproduction or reasoning: Change direct `presetPayloadSchema.safeParse`
  behavior for `NaN`; this test may still pass because it asserts only
  `result2`.
- Existing test coverage, if any: This is the relevant test.
- Missing test that should exist: Assert `result.success` directly, or rename the
  test to the JSON round-trip behavior it actually verifies.
- Suggested minimal fix: Add `expect(result.success).toBe(false)` if direct Zod
  rejection is intended; otherwise remove the unused `result` and rename the
  test.
- Risk level: low.
- Verification command or strategy: Run `npm test --
  tests/presetCodecRobustness.test.ts`.
- Confidence: high.

## Highest-Risk Areas

1. WebGL failure to Canvas2D fallback, because it can produce blank/raw output
   while the app keeps running.
2. Async profile/composition loading, because cancellation and fallback errors
   can leave stale or permanently loading UI state.
3. Preset storage migration/parsing, because corrupt or legacy data can be
   silently dropped.
4. Runtime status wording, because camera/audio labels can understate failures or
   muted states.

## Verification Gaps

- Browser-level fallback tests for WebGL startup failure and context loss were
  not run in this audit.
- Firefox/WebKit E2E coverage was previously blocked by missing Playwright
  browser executables; this audit did not reinstall browsers.
- No runtime test currently proves audio-enabled-off semantics from a user's
  perspective.
- Static inspection cannot prove all intended semantics for fallback profiles,
  catalog failure, or audio mute/off wording; those are marked with medium or low
  confidence where appropriate.
