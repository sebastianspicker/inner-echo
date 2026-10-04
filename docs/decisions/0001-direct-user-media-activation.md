# ADR-0001: Direct user media activation

- Status: accepted
- Date: 2026-08-09
- Governs: `src/runtime/session/`, `src/app/experience/workspace/useExperienceSession.ts`,
  `src/app/experience/presets/`, `src/runtime/audio/`

## Context

Starting the camera, the microphone, or an `AudioContext` can expose private inputs, trigger permission
prompts, or make sound. Loading a profile, a shared URL hash, saved storage, a migration, or a render
must never do any of that.

## Decision

The camera starts only from its own activation action. Synthesized audio and microphone input have
separate actions and separate lifecycles. A passive import may update the desired setup, but it may
not acquire media, resume an audio context, or start sound. Stop Everything invalidates pending
requests, releases every active resource, and returns the UI to idle only after teardown finishes.

## Alternatives considered

- Start media when the app or a shared preset loads: rejected because it breaks consent and the
  browser's activation rules.
- Use one combined media permission action: rejected because the microphone is optional and must stay
  independently understandable and revocable.

## Consequences and rollback

This creates explicit intermediate and error states, and async startup needs request-sequence guards.
If a browser integration cannot preserve direct activation, it must fail closed and keep manual retry;
it must not add automatic retries or autoplay as a workaround. Roll back a media change when a
passive-state test activates a resource, a stale request survives Stop Everything, or the visible
state claims activity before the resource is live.

## Verification contract

- Direct schema, graph-safety, sanitization, and inactive activation-state tests.
- Manual real Safari, physical mobile camera, and assistive-technology evidence before a release
  readiness claim.

Related requirements: [security and privacy](../../SECURITY.md),
[reliability and browser evidence](../RELIABILITY.md), and [contribution guidance](../../CONTRIBUTING.md).
