# Reliability and verification

This document splits what the code actually implements from the browser, device, accessibility, and
live-host evidence that automated checks cannot supply.

## Runtime states

The public state contracts are:

- camera: `idle`, `requesting`, `active`, `denied`, or `error`;
- sound: `off`, `starting`, `on`, or `error`;
- microphone: `off`, `requesting`, `on`, `denied`, or `error`;
- overlay: renderer `webgl`, `2d`, `raw`, or `unavailable`, an `effectsActive` flag, and an optional error;
- profile: `idle`, `loading`, `ready`, or `error`;
- catalog: `loading`, `ready`, or `error`.

Device interruptions and browser audio blocking show up through the applicable error state and
message, not as separate union members. Visible state must follow a real runtime transition.

Stop Everything invalidates pending camera and audio requests, releases active resources, clears
media bindings and canvases, and returns the interface to idle. A camera interruption stops the
camera and overlay but leaves independently activated sound under its own lifecycle.

## Rendering fallbacks

1. WebGL reports active only after Three.js renderer startup succeeds.
2. A WebGL startup or fatal runtime failure attempts Canvas2D camera passthrough.
3. If an effects canvas cannot be used safely, the underlying raw camera can stay visible.
4. If no valid rendering surface remains, the interface reports `unavailable`.

Fallbacks must never be labelled as active WebGL effects, and safety and stop controls must stay
usable throughout.

## Known limits

| Area | Implemented behavior and limit |
| --- | --- |
| Low frame rate | After a sustained low measured frame rate, WebGL can reduce internal render scale from 1 to 0.75 to 0.5. This is a mitigation, not a performance guarantee. |
| Permission denial | Camera or microphone stays inactive and waits for another user action; there is no automatic retry loop. |
| Audio startup | Sound stays off or enters error until a valid user action creates or resumes the context. |
| WebGL failure | A runtime failure attempts Canvas2D passthrough; a full WebGL restart may need another camera start or a page reload. |
| Reduced Motion | Profile policy filters or simplifies registered motion-sensitive nodes; alignment depends on profile and registry validation. |
| Resize | Canvases follow the stage without an explicit debounce, so a rapid resize can show transient artifacts. |
| Offline use | There is no service worker or offline cache. |

## Deterministic checks

Run the complete local gate from the repository root:

```bash
npm run verify
```

This runs type checking and the production build, then checks runtime loading boundaries,
production diagnostic exclusion, and distributed third-party notices.

Main-push CI builds one Pages candidate and runs the public artifact checks, then Pages validates and
deploys that same artifact without rebuilding it.

For an alpha candidate, start from the checked-in lockfile and include the dependency audit with
`npm run release:alpha:checklist`. Prepare and inspect a local Pages artifact separately:

```bash
npm run pages:build
npm run pages:verify
npm run notices:verify
```

Artifact checks cover the configured base path, both HTML entries, the Pages meta CSP, the complete
static and dynamic device-free demo JavaScript closure, asset containment, notices, and the absence
of source maps and local paths. They do not prove that a public host served the artifact or supplied
any response header.

## Manual evidence

Before you make a browser, accessibility, or release-readiness claim, record these checks against the
exact candidate artifact:

1. Real Safari camera, microphone, sound, and Stop Everything flow.
2. One physical mobile browser with camera permission at a narrow viewport.
3. Keyboard-only welcome, setup, media, evidence, safety, and stop flow.
4. VoiceOver with Safari, plus NVDA with Chrome or Firefox when a Windows environment is available.
5. WebGL-disabled fallback and context-loss behavior.
6. Camera and microphone denial, interruption, and later manual recovery.
7. Actual deployed CSP and response headers, shared-origin behavior, base-path assets, and
   same-origin application requests.

Record browser and operating-system versions, device class, input hardware, and the observed result.
Do not include device identifiers, raw media, preset contents, or personal information.

## Diagnostics boundary

Development builds expose renderer, frame, audio, microphone, and profile diagnostics only when both
`import.meta.env.DEV` and `VITE_INNER_ECHO_DEBUG_UI=true` are set. For example:

```bash
VITE_INNER_ECHO_DEBUG_UI=true npm run dev
```

Production builds must exclude the debug interface, deliberate stress load, and non-error diagnostic
logging; the environment flag alone cannot enable them in production.

List skipped engines and manual gaps in release notes. A passing local subset is not evidence for
unrun browsers, devices, assistive technology, or deployed headers.
