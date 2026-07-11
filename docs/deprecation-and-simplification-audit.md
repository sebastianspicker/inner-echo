# Deprecation and Simplification Audit

Date: 2026-05-16

Scope: source, tests, scripts, package commands, and existing docs were inspected
for dead code, deprecated APIs, obsolete compatibility branches, boilerplate,
duplication, and overengineering. This is an audit only; no production code was
changed.

Baseline checks run during this audit:

```text
npm run typecheck
npm run lint
```

Result: both passed. `npm run lint` reported `Checked 209 files in 99ms. No fixes
applied.`

## Findings

### DS-001

- Category: Obsolete compatibility branch / storage migration
- Location: `src/ui/presetSnapshot.ts:5-6`, `src/ui/presetSnapshot.ts:135-181`,
  `src/ui/ConditionComposerPanel.tsx:198-238`, `tests/presetSnapshot.test.ts`
- Evidence: The current storage key is `ie_custom_presets_v2`, but the code also
  keeps `LEGACY_PRESET_STORAGE_KEY = 'ie_custom_preset'`. On mount,
  `ConditionComposerPanel` reads the legacy key only when the v2 library is empty,
  migrates it through `migrateLegacyPresetPayload`, writes a new v2 snapshot, and
  removes the legacy key. Tests explicitly assert the legacy key and migration
  edge cases.
- Why it is likely obsolete or harmful: This path exists only to preserve an
  older localStorage shape. It keeps old behavior in the active UI mount flow and
  makes preset loading harder to reason about.
- What could break if changed: Users with pre-v2 local presets could lose an
  automatic migration path. Tests that assert legacy behavior would need removal
  or replacement with a one-time migration proof.
- Suggested action: investigate, then delete after a compatibility decision.
- Risk level: medium.
- Verification needed: needs runtime or git-history verification. Check release
  history for when `ie_custom_preset` was last written, search for all key
  references, run `npm test -- tests/presetSnapshot.test.ts
  tests/conditionComposerPanelHash.test.tsx`, and manually seed old localStorage
  once before and after removal to document impact.

### DS-002

- Category: Obsolete compatibility branch / internal API compatibility
- Location: `src/engine/canvas/webglPipeline.ts:84-111`,
  `src/engine/canvas/webglPipeline.ts:453-468`,
  `src/engine/canvas/webgl/params.ts:71-89`, `tests/webglParams.test.ts:37`
- Evidence: `ReactiveLoopOptions` still exposes `getRms?()` with a comment saying
  it is back-compatible when `getAudioMetrics` is missing. `getOverrides` may
  return either legacy video-only overrides or the newer `{ video, audio }`
  shape. A test is named `normalizes legacy video-only reactive overrides`.
- Why it is likely obsolete or harmful: The frame loop has to support two
  reactive contracts on every frame. This hides missing audio metrics by
  fabricating centroid and flux as zero, which can silently produce weaker AV
  coupling instead of failing loudly in development.
- What could break if changed: Any internal or external caller still using
  `getRms` or returning video-only overrides would stop driving reactive video.
  Because this is in the WebGL render loop, removal mistakes can cause subtle
  visual/audio coupling regressions.
- Suggested action: investigate, then replace with the structured
  `getAudioMetrics` and `{ video, audio }` contract only if all live callers and
  tests are migrated.
- Risk level: high.
- Verification needed: needs runtime or git-history verification. Search
  `getRms`, `getAudioMetrics`, and `resolveReactiveOverrides`; run
  `npm test -- tests/webglParams.test.ts tests/reactiveDriver.test.ts
  tests/couplingEngine.test.ts tests/webglLoop.test.ts`; run `npm run
  runtime:matrix` with audio enabled; verify debug panel metrics still update.

### DS-003

- Category: Deprecated internal API / compatibility re-export
- Location: `src/composer/composeCore.ts:58-59`, `src/composer/types.ts`,
  `src/composer/index.ts`
- Evidence: `composeCore.ts` explicitly says `Re-export types for backward
  compatibility` and re-exports `MotifDef`, `DimensionSignalMappingEntry`, and
  `ExperienceDimensionDef`, while the same types are already exported from the
  composer type surface.
- Why it is likely obsolete or harmful: It makes `composeCore` look like both a
  runtime composer implementation and a public type barrel. That increases import
  ambiguity and preserves old import paths without evidence that they are still
  required.
- What could break if changed: Internal tests or downstream imports may still
  import these types from `composeCore`. Type-only consumers would fail at
  typecheck time.
- Suggested action: investigate, then delete the re-export if no live imports use
  it.
- Risk level: low.
- Verification needed: needs runtime or git-history verification for downstream
  use. Run `rg "from .*composeCore" src tests scripts` and `rg
  "MotifDef|DimensionSignalMappingEntry|ExperienceDimensionDef" src tests
  scripts`; then run `npm run typecheck` and composer tests.

### DS-004

- Category: Obsolete compatibility alias / duplicated naming
- Location: `src/conditions/graphBuilder.ts:41-47`,
  `src/composer/composeBlend.ts:87-88`,
  `src/composer/composeSafety.ts:78`,
  `src/contractVerification/videoNodeRegistry.ts:163-164`,
  `src/conditions/experience-dimensions.json`,
  `src/conditions/dimension-to-signal-mapping.json`, docs references
- Evidence: `graphBuilder` calls `chromatic_aberration` canonical and
  `chroma_aberration` a legacy short-form alias. Current condition mappings,
  generated docs, tests, and registry entries still reference `chroma_aberration`.
- Why it is likely obsolete or harmful: Two names for one node force alias logic
  into graph building, blending, safety clamps, contract verification, generated
  docs, and evidence references. This makes it easy for new mappings to choose
  the wrong spelling.
- What could break if changed: Current JSON mappings and docs use the short-form
  name, so deleting the alias without migrating data would skip the chromatic
  aberration effect and contract references.
- Suggested action: replace only through a coordinated rename, or keep until the
  public node-name contract is intentionally changed.
- Risk level: medium.
- Verification needed: needs runtime or git-history verification. Search both
  spellings, migrate data if needed, run `npm run conditions:validate`, `npm run
  composer:validate`, `npm run verify:contracts`, `npm test --
  tests/graphBuilder.test.ts tests/videoEffectNodes.test.ts`, and inspect
  generated docs diffs.

### DS-005

- Category: Compatibility branch / browser API fallback
- Location: `src/engine/audio/contextManager.ts:12`,
  `src/engine/audio/contextManager.ts:64-69`, `scripts/runtime-matrix.ts:190`
- Evidence: Audio startup falls back from `window.AudioContext` to
  `window.webkitAudioContext`. The runtime matrix also checks
  `AudioContext || webkitAudioContext`.
- Why it is likely obsolete or harmful: This is an older Safari compatibility
  branch. It adds only small code weight, but it preserves a browser-specific
  path that may no longer be needed if the supported browser matrix has moved on.
- What could break if changed: Older Safari/WebKit users could lose audio
  startup. Because audio startup must require a user gesture, failures here are
  user-visible and easy to misclassify as permission problems.
- Suggested action: keep unless browser support policy explicitly drops this
  fallback.
- Risk level: high.
- Verification needed: needs runtime or git-history verification. Confirm the
  supported Safari/WebKit matrix, run WebKit smoke tests after browser binaries
  are installed, and manually verify audio startup in Safari if removal is
  considered.

### DS-006

- Category: Unused exports / single-use wrappers
- Location: `src/ui/presetSnapshot.ts:184-195`, `tests/presetSnapshot.test.ts`
- Evidence: `readPresetLibrary` and `writePresetLibrary` wrap one
  `localStorage.getItem`/`setItem` call and `parsePresetLibrary`/`JSON.stringify`.
  Static search found current usage only in `tests/presetSnapshot.test.ts`, while
  `ConditionComposerPanel` performs equivalent storage reads/writes inline.
- Why it is likely obsolete or harmful: These wrappers are exported as if they
  are part of the app storage API, but the production UI does not use them. They
  duplicate the storage access path tested elsewhere and make the public surface
  wider than necessary.
- What could break if changed: Tests that directly exercise the wrappers would
  need deletion or replacement with tests for the actual UI storage flow.
  Downstream imports outside this repository cannot be ruled out from static
  repo search alone.
- Suggested action: delete if no external consumers exist, or inline tests around
  `parsePresetLibrary` and `ConditionComposerPanel` behavior.
- Risk level: low.
- Verification needed: needs runtime or git-history verification for external
  consumers. Run `rg "readPresetLibrary|writePresetLibrary"`, update/remove the
  wrapper-only tests, then run `npm run typecheck` and `npm test --
  tests/presetSnapshot.test.ts`.

### DS-007

- Category: Duplicate types / misleading public surface
- Location: `src/engine/audio/types.ts:52-70`,
  `src/conditions/schema.ts:247`, `src/engine/audio/index.ts:8-12`
- Evidence: `src/engine/audio/types.ts` exports `AudioEngineParams`,
  `AudioChainNodeDef`, and `AudioStackConfig`. Static search found the live audio
  engine and graph builder importing `AudioStackConfig` from
  `src/conditions/schema.ts`, not from `src/engine/audio/types.ts`. The
  `AudioEngineParams` and `AudioChainNodeDef` exports had no production usages in
  the current search results.
- Why it is likely obsolete or harmful: Two `AudioStackConfig` definitions can
  drift. One is schema-derived from profile JSON; the other is hand-written in
  the audio engine package and appears unused. This makes the contract source of
  truth unclear.
- What could break if changed: Any external or not-yet-indexed import from
  `src/engine/audio` that expects these exported types would fail typecheck.
- Suggested action: delete unused hand-written audio stack/config exports after
  proving no consumers, leaving the schema-derived type as the source of truth.
- Risk level: low.
- Verification needed: needs runtime or git-history verification for external
  consumers. Run `rg "AudioEngineParams|AudioChainNodeDef|AudioStackConfig" src
  tests scripts`, inspect `src/engine/audio/index.ts`, then run `npm run
  typecheck` and audio tests.

### DS-008

- Category: Single-use abstractions / UI hook wrappers
- Location: `src/ui/hooks/useAudioController.ts`,
  `src/ui/hooks/useCameraController.ts`,
  `src/ui/hooks/useImmersiveIdleState.ts`,
  `src/ui/hooks/useOverlayController.ts`, `src/ui/hooks/useCatalog.ts`,
  `src/ui/CameraView.tsx:12-15`, `src/ui/CameraView.tsx:90`,
  `src/ui/CameraView.tsx:182`, `src/ui/CameraView.tsx:464`,
  `src/ui/CameraView.tsx:577-578`
- Evidence: Static search found these hooks imported only by `CameraView`.
  Several are small wrappers: `useAudioController` is 33 lines,
  `useCameraController` is 33 lines, `useImmersiveIdleState` is 34 lines, and
  `useCatalog` is 22 lines.
- Why it is likely obsolete or harmful: These files create extra navigation for
  behavior that has one caller. Some wrappers expose names that imply reusable
  controller APIs even though the state model is tightly coupled to `CameraView`.
- What could break if changed: Inlining all hooks blindly would make the already
  large `CameraView.tsx` harder to reason about. `useImmersiveIdleState` and
  `useCatalog` contain effects, so mistakes could change event listener cleanup
  or catalog loading.
- Suggested action: investigate. Inline only wrappers that remove net code and
  reduce indirection; keep effectful hooks if they remain clearer as named
  lifecycle units.
- Risk level: medium.
- Verification needed: Search call sites again, compare line-count and clarity
  before/after in a plan, then run `npm run typecheck`, UI unit tests, and a
  browser smoke covering start/stop, mic gating, debug diagnostics, and idle UI.

### DS-009

- Category: Mixed responsibilities / overgrown UI coordinator
- Location: `src/ui/CameraView.tsx` (883 lines),
  `src/ui/CameraView.tsx:44`
- Evidence: The file owns top-level camera/audio state, runtime refs, profile
  controls, evidence drawer state, debug panel wiring, overlay start/stop, and
  audio/mic startup. It also has a TODO to lazy-load `EvidenceDrawer` to
  code-split `marked` and `DOMPurify`.
- Why it is likely obsolete or harmful: The file is the main runtime coordinator
  and is large enough that startup/shutdown and false-success state transitions
  are hard to audit. The evidence drawer dependency is loaded through the main UI
  path even though evidence viewing is optional.
- What could break if changed: Camera/audio startup requires direct user
  gestures; moving or lazily loading the wrong code could break permission
  timing, runtime state reporting, or evidence rendering.
- Suggested action: simplify in small slices. First investigate lazy-loading the
  evidence drawer because it has a concrete TODO and optional path. Avoid broad
  rewrites; do not add abstractions unless they delete duplicated live logic.
- Risk level: high.
- Verification needed: Run `npm run build`, UI tests for evidence drawer and
  camera state, browser smoke for first paint/start/stop/evidence drawer, and a
  bundle comparison if code-splitting is attempted.

### DS-010

- Category: Mixed responsibilities / storage and UI coupling
- Location: `src/ui/ConditionComposerPanel.tsx` (666 lines),
  especially `src/ui/ConditionComposerPanel.tsx:161-238`,
  `src/ui/ConditionComposerPanel.tsx:240-283`,
  `src/ui/ConditionComposerPanel.tsx:348-407`
- Evidence: One component handles catalog strength loading, legacy localStorage
  migration, shared hash import, preset library persistence, copy/share status
  timers, filters, global controls, and mode-specific UI.
- Why it is likely obsolete or harmful: Storage migration and hash import are
  lifecycle side effects embedded in a large render component. This makes it
  harder to prove passive imports do not start audio or mutate unrelated state.
- What could break if changed: Shared hash imports intentionally force
  `audioEnabled: false`; preset migration can affect stored user data; status
  timers affect UI feedback.
- Suggested action: simplify after DS-001. Delete obsolete legacy migration first
  if allowed, then reassess whether remaining storage/hash logic still needs a
  helper. Do not introduce a new abstraction unless it serves multiple real call
  sites or clearly deletes duplicated code.
- Risk level: medium.
- Verification needed: Run `npm test -- tests/conditionComposerPanelHash.test.tsx
  tests/conditionComposerPanelStrength.test.tsx tests/composerControls.test.tsx
  tests/presetSnapshot.test.ts`, plus a manual browser check for saved preset
  load/delete/share behavior.

### DS-011

- Category: Duplicated boilerplate / test harness duplication
- Location: `tests/e2e/ui-debug.e2e.mjs:11-59`,
  `tests/e2e/cross-browser-smoke.e2e.mjs:17-65`,
  `tests/e2e/readme-screenshots.mjs:29-55`,
  `scripts/runtime-matrix.ts:40-120`, `scripts/run-preview-smoke.mjs:8-34`
- Evidence: Multiple files implement their own `isServerUp` or
  `isServerReady`, wait loop, dev/preview server spawn, SIGTERM/SIGKILL cleanup,
  onboarding skip, fake camera stream, and app-shell wait helpers.
- Why it is likely obsolete or harmful: E2E reliability fixes must be copied into
  several scripts. The duplicated server lifecycle code has small differences in
  ports, output capture, and failure messages, making local failures harder to
  compare.
- What could break if changed: Shared helper extraction could accidentally mix
  dev-server and preview-server behavior, change ports, or hide useful output
  from failing tests.
- Suggested action: deduplicate only existing repeated harness code into a test
  helper because there are several real call sites now. Keep dev and preview
  differences explicit.
- Risk level: medium.
- Verification needed: Run `npm run test:e2e:ui`, `npm run
  test:e2e:cross-browser`, `npm run test:e2e:preview`, `npm run
  runtime:matrix`, and screenshot capture/verify where browser binaries are
  installed. If browser binaries are missing, record that the refactor is not
  fully verified.

### DS-012

- Category: Deprecated toolchain API / command warning
- Location: `package.json:22-32`, `package.json:64`,
  `docs/verification-baseline.md`
- Evidence: Repository scripts run TypeScript CLIs through `tsx`. The
  verification baseline recorded Node 26 `[DEP0205] DeprecationWarning:
  module.register() is deprecated. Use module.registerHooks() instead.` for
  `tsx`-backed commands, while the same commands otherwise passed.
- Why it is likely obsolete or harmful: Passing verification with deprecation
  warnings can hide future Node/toolchain breakage. CI uses Node 22, so local
  Node 26 warning behavior may diverge from CI.
- What could break if changed: Upgrading or replacing `tsx` can change loader
  behavior for scripts, ESM resolution, raw imports, and stack traces.
- Suggested action: replace or upgrade the script runner only after confirming
  Node support policy; otherwise document Node 22 as the trusted baseline and
  treat Node 26 warnings as known local noise.
- Risk level: medium.
- Verification needed: Run script commands under Node 22 and Node 26, especially
  `npm run conditions:validate`, `npm run composer:validate`, `npm run
  evidence:verify`, `npm run verify:contracts`, `npm run runtime:matrix`, and
  `npm run verify`.

### DS-013

- Category: Compatibility fallback that should not be deleted blindly
- Location: `src/engine/canvas/index.ts:77-113`,
  `src/engine/canvas/overlayRenderer.ts`, `docs/RELIABILITY.md:29-34`,
  `docs/archive/2026-04-22-effect-evidence-audit.md:345-362`
- Evidence: The canvas layer installs a Canvas2D fallback when WebGL startup or
  runtime fails. Reliability docs define this as expected behavior, but an
  archived audit records that fallback mode can show raw camera passthrough and
  that repeated WebGL retries on the same canvas after a 2D context was bound
  were a known risk.
- Why it is likely obsolete or harmful: The fallback itself is active and should
  stay, but retry/fallback state can let the app run without crashing while
  producing the wrong visual result. Any obsolete retry behavior should be
  simplified to an explicit fallback state instead of hidden repeated attempts.
- What could break if changed: Removing fallback would break no-WebGL users.
  Changing retry behavior could strand users in fallback mode after recoverable
  GPU errors.
- Suggested action: keep fallback, investigate retry/latch behavior, and simplify
  only the obsolete retry branch if runtime evidence still reproduces it.
- Risk level: high.
- Verification needed: Force WebGL startup failure or context loss, confirm 2D
  passthrough and status messaging, switch profiles during fallback, and run
  browser smoke tests. This needs runtime verification before any deletion.

### DS-014

- Category: Overgrown script / mixed responsibilities
- Location: `scripts/evidence-pages-gen.ts` (708 lines),
  `scripts/lib/verifyContracts.ts` (666 lines),
  `scripts/lib/inspectHarness.ts` (624 lines)
- Evidence: These scripts are among the largest files in the repo. They combine
  filesystem traversal, domain contract checks, report formatting, and command
  orchestration. They are active through package scripts, so they are not dead
  files.
- Why it is likely obsolete or harmful: Large verification/reporting scripts are
  difficult to audit for stale branches and repeated formatting logic. Because
  they produce authority documents and reports, stale checks can create false
  confidence.
- What could break if changed: Contract reports, generated docs, evidence pages,
  and debug inspection output could change. Generated-output diffs may be noisy.
- Suggested action: investigate for deletion of stale branches and duplicate
  formatting only after capturing golden outputs. Prefer removing unused report
  paths over introducing a framework.
- Risk level: medium.
- Verification needed: Capture current outputs, then run `npm run evidence:gen`,
  `npm run evidence:verify`, `npm run verify:contracts`, and `npm run
  debug:inspect`; compare generated reports and docs intentionally.

## Confirmed Non-Findings

- No fully unused source file was proven from static search alone. Several files
  look active only through fallbacks, tests, generated docs, or package scripts;
  deletion would need runtime or git-history verification.
- Production dependencies in `package.json` all had current source or script
  references in the inspected tree. No dependency deletion is recommended from
  this pass.
- The Canvas2D fallback is not dead code. It is a simplification target only for
  obsolete retry behavior, not a deletion target.

## Highest-Risk Simplification Targets

1. `src/engine/canvas/webglPipeline.ts` reactive compatibility contract
   (`getRms` and legacy override shape).
2. `src/engine/canvas/index.ts` / `overlayRenderer.ts` fallback retry behavior.
3. `src/ui/CameraView.tsx` runtime coordinator and optional evidence bundle.
4. `src/ui/ConditionComposerPanel.tsx` preset migration, hash import, and storage
   coupling.

## Likely Dead or Deletable Candidates

1. `readPresetLibrary` and `writePresetLibrary` if no external consumers exist.
2. Hand-written `AudioEngineParams`, `AudioChainNodeDef`, and audio
   `AudioStackConfig` exports if no external consumers exist.
3. `composeCore` backward-compatible type re-exports if no imports remain.

All three need runtime or git-history verification before deletion.

## Likely Overcomplicated Areas

1. E2E/runtime/screenshot harness server lifecycle duplication.
2. Large authority/report scripts under `scripts/`.
3. Large UI coordinators: `CameraView` and `ConditionComposerPanel`.

## Likely Deprecated Compatibility Paths

1. Legacy preset localStorage key `ie_custom_preset`.
2. `ReactiveLoopOptions.getRms` and video-only reactive override returns.
3. `chroma_aberration` / `chromatic_aberration` node-name compatibility.
4. `webkitAudioContext` fallback, pending browser support decision.
5. `tsx` under Node 26 emitting `DEP0205`.

## Recommended Next Audit Targets

1. Prove or retire preset legacy migration using git history and a seeded
   localStorage smoke test.
2. Prove whether any callers still need the legacy reactive WebGL contract.
3. Audit E2E harness duplication with a before/after failure-output comparison.
4. Run forced WebGL-failure tests to decide whether fallback retry behavior can
   be simplified.
5. Review large scripts with golden output snapshots before removing stale
   branches.

## Coverage Gaps and Uncertainty

- Git history was not inspected in this pass, so external/old release usage of
  compatibility paths is unknown.
- Browser runtime behavior was not re-run in this pass beyond the pre-existing
  verification baseline; WebGL fallback, Safari audio fallback, and E2E browser
  binaries require runtime verification.
- The working tree already contains many production-code modifications outside
  this audit. Findings describe the current filesystem state, not a clean
  upstream branch.
- Static search cannot prove that exported APIs are unused outside this
  repository. Any public or package-level API removal needs downstream import
  verification.
