# ADR-0004: One media session owns live browser resources

- Status: accepted
- Date: 2026-09-27
- Supersedes: [ADR-0002](0002-runtime-orchestration-boundaries.md)
- Governs: `src/runtime/session/`, `src/app/experience/ExperienceWorkspace.tsx` and its workspace hook,
  `src/runtime/camera/`, `src/runtime/audio/`, `src/runtime/visual/overlay/`, `src/runtime/coupling/`

## Context

ADR-0002 kept visible state in React and let focused hooks drive long-lived resources through
mutable refs. In practice the camera stream, the audio engine and its request counter, the overlay
control, and about eighteen mirrors of React state were created in one hook and threaded through five
more. Camera, audio, and overlay lifecycles were spread across `app/experience/hooks/` and
`app/experience/session/`. The directory names didn't mark a boundary, and the React-free overlay
orchestrator lived in the app layer. Stop Everything, camera interruption, and stale-request handling
each had to be traced across several files, and their tests mocked private module paths.

## Decision

`src/runtime/session/` is the single owner of the camera stream, the `AudioContext` and audio engine,
the microphone, and the overlay and coupling lifecycle. `createExperienceSession()` returns a
per-workspace instance. It is not a module singleton. Browser services such as camera requests, the
audio context, lazy engine loading, and lazy overlay loading are injected, with production defaults.

The session publishes an immutable snapshot of media state: camera, camera issue, overlay renderer,
sound, microphone, and input settings. The snapshot changes only on real runtime transitions. React
subscribes with `useSyncExternalStore`, calls session methods directly from user actions, and pushes
live settings with `update()`. The running render loop reads live settings on each frame without
restarting. The session reports facts, such as a camera issue kind or an error name, and the app turns
them into user-facing copy.

React still owns user-visible choices: composition, comfort settings, presets, evidence, and debug
toggles. The app keeps only DOM refs for the stage elements, and it attaches them to the session.

## Alternatives considered

- Keep ADR-0002's hooks and refs: rejected because resource ownership stayed split across the app layer
  and mirror refs duplicated state.
- Move only the React-free files into `runtime/`: rejected because the refs, setter contexts, and
  cross-hook stop logic would remain in React.
- A global media store: rejected for the reason ADR-0002 gives. Hidden global state weakens test
  isolation. A per-instance session with injected dependencies keeps UI truth explicit and testable.

## Consequences and rollback

Session tests use injected fakes instead of mocking module paths. The session must keep ADR-0001's
direct-activation rules. `enableSound()` creates or resumes the `AudioContext` synchronously inside
the user action. Every asynchronous step checks its request sequence, and Stop Everything invalidates
all pending work before it releases resources. The ADR-0003 development gate for diagnostics readback
lives inside the session. Controls that change live values never rebuild the render or audio loops.

Revert or consolidate the change if the session becomes a second source of truth for a setting React
owns, if a passive path activates a resource, if a stale request survives Stop Everything, or if the
session statically imports the lazily loaded audio engine or graphics modules.

## Verification contract

- `npm run bundle:verify` checks the lazy audio and graphics boundaries.

Related overview: [architecture](../ARCHITECTURE.md).
