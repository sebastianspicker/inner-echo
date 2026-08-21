# ADR-0001: Direct user media activation

- Status: accepted
- Date: 2026-08-09
- Governs: `src/ui/CameraView.tsx`, `src/ui/hooks/useAudioRuntime.ts`,
  `src/ui/cameraRuntime.ts`, `src/engine/audio/`

## Context

Camera, microphone, and `AudioContext` startup can expose private inputs, trigger browser permission
prompts, or produce sound. Passive profile, URL-hash, storage, migration, and render paths must remain
safe to load without activating any of them.

## Decision

Camera starts only from its camera activation action. Synthesized audio and microphone input have
separate activation actions and lifecycles. Passive imports may update desired configuration but may
not acquire media, resume an audio context, or start sound. Stop Everything invalidates pending
requests, releases every active resource, and returns visible state to idle only after teardown.

## Alternatives considered

- Start media when the application or a shared preset loads: rejected because it violates consent and
  browser activation boundaries.
- Use one combined media permission action: rejected because microphone input is optional and must
  remain independently understandable and revocable.

## Consequences and rollback

This creates explicit intermediate and error states and requires request-sequence guards during async
startup. If a browser integration cannot preserve direct activation, it must fail closed and retain
manual retry; it must not introduce automatic retries or autoplay as a workaround. Roll back a media
change when passive-state tests activate a resource, a stale request survives Stop Everything, or the
visible state claims activity before the resource is live.

## Verification contract

- Direct schema, graph-safety, sanitization, and inactive activation-state tests.
- Manual real Safari, physical mobile camera, and assistive-technology evidence before a release
  readiness claim.

Related requirements: [security and privacy](../SECURITY.md),
[reliability and browser evidence](../RELIABILITY.md), and [contribution guidance](../../CONTRIBUTING.md).
