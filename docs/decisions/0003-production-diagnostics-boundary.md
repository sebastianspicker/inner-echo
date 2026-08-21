# ADR-0003: Production diagnostics boundary

- Status: accepted
- Date: 2026-08-09
- Governs: `src/utils/logger.ts`, `src/ui/DebugPanel.tsx`, `src/ui/EffectControls.tsx`,
  `src/engine/canvas/webglPipeline.ts`

## Context

Development diagnostics and deliberate rendering stress help reproduce failures, but they can leak
runtime details, add main-thread work, and make visible status or performance claims untruthful when
shipped as normal production behavior.

## Decision

Non-error diagnostic logging, the debug panel, development inspection controls, and deliberate stress
load are development-only. Production may report bounded user-facing errors and maintain internal
runtime status required for correct fallback and cleanup, but it must not expose device details,
profile contents, media data, or a control path that enables synthetic busy work.

The rendering boundary enforces the development-only stress rule independently of whether the UI
currently hides its toggle. Production builds continue to support ordinary adaptive scaling from
measured frame rate; they do not execute the deliberate busy wait.

## Alternatives considered

- Rely only on a hidden production UI toggle: rejected because internal callers could still pass the
  parameter and the renderer is the authority for executing the load.
- Remove stress mode entirely: rejected because deterministic local testing of scale-down behavior is
  useful and already bounded to development.
- Emit verbose production telemetry: rejected because there is no approved analytics or remote
  diagnostics scope.

## Consequences and rollback

Production incidents require local reproduction or explicit, separately approved telemetry work.
Roll back a diagnostics change when the production bundle exposes the debug control, executes the
deliberate wait, logs sensitive runtime input, or alters ordinary adaptive scaling.

## Verification contract

- Unit tests for diagnostic gating and render-scale policy.
- Production build and preview browser checks that the stress control is absent and normal camera or
  fallback operation remains responsive.
- Manual device profiling is required before making broad GPU or browser performance claims.

Related requirements: [security and privacy](../SECURITY.md) and
[reliability and browser evidence](../RELIABILITY.md).
