# ADR-0003: Production diagnostics boundary

- Status: accepted
- Date: 2026-08-09
- Governs: `src/platform/logger.ts`, `src/app/experience/debug/`,
  `src/app/experience/media/EffectControls.tsx`, `src/runtime/session/overlayReactive.ts`,
  `src/runtime/visual/overlay/webglPipeline.ts`

## Context

Development diagnostics and deliberate rendering stress help reproduce failures, but shipping them as
normal production behavior can leak runtime details, add main-thread work, and make visible status or
performance claims untrue.

## Decision

Non-error diagnostic logging, the debug panel, development inspection controls, and deliberate stress
load are development-only. Production may report bounded user-facing errors and keep the internal
runtime status needed for correct fallback and cleanup, but it must not expose device details, profile
contents, media data, or a control path that enables synthetic busy work.

The rendering boundary enforces the development-only stress rule on its own, whether or not the UI
happens to hide its toggle. Production builds still support ordinary adaptive scaling from measured
frame rate; they never run the deliberate busy wait.

## Alternatives considered

- Rely only on a hidden production UI toggle: rejected because internal callers could still pass the
  parameter, and the renderer is the authority for executing the load.
- Remove stress mode entirely: rejected because deterministic local testing of scale-down behavior is
  useful and already confined to development.
- Emit verbose production telemetry: rejected because there is no approved analytics or remote
  diagnostics scope.

## Consequences and rollback

Production incidents need local reproduction or separately approved telemetry work. Roll back a
diagnostics change when the production bundle exposes the debug control, runs the deliberate wait,
logs sensitive runtime input, or alters ordinary adaptive scaling.

## Verification contract

- Unit tests for diagnostic gating and render-scale policy.
- Production build and preview browser checks that the stress control is absent and normal camera or
  fallback operation stays responsive.
- Manual device profiling before any broad GPU or browser performance claim.

Related requirements: [security and privacy](../../SECURITY.md) and
[reliability and browser evidence](../RELIABILITY.md).
