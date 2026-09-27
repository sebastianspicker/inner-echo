# ADR-0002: Runtime orchestration boundaries

- Status: superseded by [ADR-0004](0004-media-session-ownership.md) on 2026-09-27
- Date: 2026-08-09
- Governs: `src/app/experience/ExperienceWorkspace.tsx`, `src/app/experience/hooks/` and `src/app/experience/session/`,
  `src/content/experience/`, `src/domain/experience/composition/`, `src/runtime/audio/`,
  `src/runtime/visual/overlay/`, `src/runtime/coupling/`

## Context

The UI combines profile composition, controls, asynchronous media startup, WebGL or Canvas fallback,
Web Audio, reactive coupling, and visible status. Keeping all of that in the top-level React component
makes cleanup and race behavior hard to reason about, and moving browser-resource ownership into React
render state would rebuild long-lived loops every time a control changes.

## Decision

React owns user-visible state, consent actions, and orchestration. Conditions and composer modules own
validated declarative profile construction. Focused hooks translate current UI state into lifecycle
operations. Engine modules own browser resources, render and audio loops, clamping, fallback, and
idempotent disposal. Mutable refs carry current bounded control values into long-lived loops without
making those loops the authority for visible state.

The public orchestration façades stay stable while cohesive implementation phases may be extracted
behind them. Runtime registry metadata stays introspection-only; builders and engine implementations
remain the executable authority.

## Alternatives considered

- Keep all lifecycle logic in `ExperienceWorkspace`: rejected because independent async resources then
  share one large cleanup and race surface.
- Move visible state into engine singletons: rejected because UI truth would become implicit and test
  isolation would weaken.
- Rebuild loops for every control render: rejected because it changes resource lifetime and adds
  avoidable churn on interactive updates.

## Consequences and rollback

The boundaries need explicit typed inputs, callbacks, and teardown contracts. A split that duplicates
authority, hides a required state transition, or introduces a dependency cycle must be reverted or
consolidated. Keep the façade names and observable ordering when you extract phases.

## Verification contract

- Characterization tests around façades and extracted lifecycle helpers.
- Composition, condition, contract, and focused media tests before structural changes.
- `npm run check` after changes that cross UI, media, audio, rendering, or fallback boundaries.
- Review callers, co-changing modules, ownership, tests, and current hotspot evidence before moving
  shared code, then repeat the risk and change review once the candidate stabilizes.

Related overview: [architecture](../ARCHITECTURE.md).
