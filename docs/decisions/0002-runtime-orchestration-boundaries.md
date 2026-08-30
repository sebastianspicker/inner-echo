# ADR-0002: Runtime orchestration boundaries

- Status: accepted
- Date: 2026-08-09
- Governs: `src/app/experience/ExperienceWorkspace.tsx`, `src/app/experience/hooks/` and `src/app/experience/session/`,
  `src/content/experience/`, `src/domain/experience/composition/`, `src/runtime/audio/`,
  `src/runtime/visual/overlay/`, `src/runtime/coupling/`

## Context

The UI combines profile composition, controls, asynchronous media startup, WebGL or Canvas fallback,
Web Audio, reactive coupling, and visible status. Keeping every responsibility in the top-level React
component makes cleanup and race behavior hard to characterize. Moving browser-resource ownership
into React render state would also rebuild long-lived loops whenever controls change.

## Decision

React owns user-visible state, consent actions, and orchestration. Conditions and composer modules own
validated declarative profile construction. Focused hooks translate current UI state into lifecycle
operations. Engine modules own browser resources, render or audio loops, clamping, fallback, and
idempotent disposal. Mutable refs carry current bounded control values into long-lived loops without
making those loops the authority for visible state.

The public orchestration façades remain stable while cohesive implementation phases may be extracted
behind them. Runtime registry metadata stays introspection-only; builders and engine implementations
remain executable authority.

## Alternatives considered

- Keep all lifecycle logic in `ExperienceWorkspace`: rejected because independent async resources then share
  one large cleanup and race surface.
- Move visible state into engine singletons: rejected because UI truth would become implicit and
  test isolation would weaken.
- Rebuild loops for every control render: rejected because it changes resource lifetime and adds
  avoidable churn on interactive updates.

## Consequences and rollback

Boundaries need explicit typed inputs, callbacks, and teardown contracts. A split that duplicates
authority, hides a required state transition, or introduces a dependency cycle must be reverted or
consolidated. Preserve façade names and observable ordering when extracting phases.

## Verification contract

- Characterization tests around façades and extracted lifecycle helpers.
- Composition, condition, contract, and focused media tests before structural changes.
- `npm run check` after changes crossing UI, media, audio, rendering, or fallback boundaries.
- Review callers, co-changing modules, ownership, tests, and current hotspot evidence before moving
  shared code; repeat the risk and change review after the candidate stabilizes.

Related overview: [architecture](../20_ARCHITECTURE.md).
