# Reliability and runtime boundaries

This document describes implemented fallback behavior and the manual evidence required before a release claim.

## Runtime state requirements

The interface must distinguish these states rather than collapse them into a generic active flag:

- camera idle, requesting, active, denied, interrupted, and failed
- effects loading, WebGL active, 2D fallback, raw preview, unavailable, and stopped
- sound off, starting, on, blocked, and failed
- microphone off, requesting, active, denied, and failed
- profile catalog loading, loaded, invalid, and failed

Stop Everything must remain reachable and return the visible state to idle after releasing active resources.

## Rendering fallbacks

1. WebGL: the Three.js pipeline reports active only after renderer setup succeeds.
2. Canvas2D: a valid 2D surface may display camera passthrough without the full effect graph.
3. Raw preview: the overlay may be hidden while the underlying video remains visible.
4. Unavailable: if neither effect surface is usable, the interface reports that effects are unavailable and keeps safety controls reachable.

A fallback must not be labelled as active WebGL effects.

## Known runtime limitations

| Area | Current behavior and limit |
|---|---|
| Low frame rate | The WebGL loop can reduce internal render scale from 1 to 0.75 to 0.5 when measured frame rate remains low. This is a mitigation, not a performance guarantee. |
| Camera denial | The interface reports denial and waits for another user action. It does not retry continuously. |
| Microphone denial | The microphone remains off; synthesized audio can continue if enabled. |
| Blocked `AudioContext` | Sound remains off until a valid user action resumes or creates the context. |
| WebGL context loss | The effect loop stops and the interface reports a reduced fallback. Reloading may be required to restore WebGL. |
| Reduced Motion | Profile policies disable or simplify configured motion-sensitive nodes. Coverage depends on profiles and node registration remaining aligned. |
| Resize | Canvas and WebGL resources resize with the stage. There is no explicit debounce, so rapid resizing can show transient artifacts. |
| Offline use | No service worker or offline cache is included. |

## Deterministic verification

Run the complete local gate with:

```bash
npm run check
```

It runs the production build, lint, compact core-contract tests, condition and composer validation, evidence verification, and contract checks.

For an alpha candidate, use `npm run release:alpha:local` so the dependency audit runs before `check`.

Prepare the GitHub Pages upload artifact separately with:

```bash
npm run pages:build
npm run pages:verify
npm run notices:verify
```

This verifies the `/inner-echo/` base path, live entry assets, Pages CSP fallback, absence of source maps and local paths, and distributed notices. It does not prove the public host served the artifact or supplied any response header.

## Manual verification

Deterministic local checks do not replace these checks:

1. Real Safari camera, microphone, audio, and stop flow.
2. One physical mobile browser with camera permission.
3. Keyboard-only welcome, setup, evidence, safety, and stop flow.
4. VoiceOver with Safari, plus NVDA with Chrome or Firefox when available.
5. WebGL-disabled fallback and context-loss behavior.
6. Permission denial and later recovery for camera and microphone.
7. Actual deployment CSP, response headers, shared-origin behavior, and same-origin requests. GitHub Pages cannot supply the complete intended header policy.

Record the browser, version, operating system, device class, input hardware, and observed result. Do not include device identifiers, raw media, or personal information.

## Debug diagnostics

Development builds can expose runtime diagnostics behind `import.meta.env.DEV`. The panel reports renderer, frame, audio, microphone, and profile state for local debugging. Production builds must not expose that interface or log sensitive runtime details.

## Release boundary

Do not claim browser, device, accessibility, or production readiness from a subset of this matrix. List skipped engines and manual gaps in the release notes.
