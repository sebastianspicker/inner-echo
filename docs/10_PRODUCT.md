# Product scope

Inner Echo is a client-only browser application for applying audiovisual metaphors to a live webcam view. A user can choose experience dimensions, select a curated profile, or combine profiles, then control the resulting visual and optional audio layers.

The application is intended for voluntary individual exploration, technical demonstration, and facilitated educational discussion. The repository does not contain evidence that the interface has completed clinical validation, formal usability validation, or an accessibility conformance audit.

## Current alpha capabilities

- Explicit welcome and privacy disclosure before media activation.
- Experience-dimension, curated-profile, and combined-profile setup modes.
- Profile-driven WebGL effects with reduced Canvas2D or raw-preview fallbacks.
- Global intensity, Safe Mode, Reduced Motion, and Stop Everything controls.
- Optional synthesized audio and optional microphone input with separate direct-gesture activation.
- Local preset storage and URL-hash sharing of non-media state.
- Bundled evidence and method documents available from the interface.
- Development-only runtime diagnostics.

The runtime profile data in `src/conditions/` is an application contract, not example data. Changes to profiles, mappings, schemas, or node names require the validation described in [CONTRACT_VERIFICATION.md](CONTRACT_VERIFICATION.md).

## Boundaries

Inner Echo is not:

- a diagnostic tool
- a medical device
- a treatment platform
- a questionnaire or assessment system
- an objective simulation of a diagnosis or another person's experience
- a recording, export, or media-sharing service

The application does not infer a diagnosis, score a user, or collect a clinical history.

## Runtime and privacy model

- Core behavior runs in the browser without an application backend.
- Camera, microphone, and `AudioContext` startup require direct user actions.
- Microphone input is optional and off by default.
- Video and audio are not recorded or uploaded by the application.
- The runtime has no analytics, tracking, remote font, or third-party API integration.
- Local storage holds welcome acknowledgement and saved preset state. URL hashes may hold shared composer state.
- Passive state imports cannot activate camera, microphone, or audio.

Static application files still need to be delivered by a host. No offline cache or deployment target is included.

## Primary workflow

1. Read the metaphor, privacy, and permission boundaries.
2. Select Continue to setup without starting media.
3. Choose experience dimensions or a curated collection.
4. Select Start camera.
5. Adjust intensity and comfort controls.
6. Enable sound or microphone input separately when desired.
7. Use Stop Everything to release active runtime resources.

Permission-denied, loading, invalid-profile, renderer-fallback, and stopped states must be reported as their actual state. Controls must not claim that media, sound, or effects are active before the corresponding runtime is active.

## Safety requirements

- Safe Mode defaults on and applies conservative profile and engine clamps.
- Reduced Motion follows the operating-system preference until the user chooses a setting.
- Stop Everything remains reachable while media is active.
- Audio and microphone input remain off until separately enabled.
- The effect system avoids strobe behavior, abrupt loud transients, and unbounded feedback.
- Evidence and warnings remain available without requiring media access.

See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) for the implementation-facing safety contract.

## Accessibility status

The implementation includes semantic controls, visible focus styles, keyboard handling for the evidence dialog, critical 44 CSS-pixel targets, and a narrow single-column layout. Automated tests cover selected keyboard, focus, target-size, and overflow behavior.

The project does not currently claim WCAG 2.2 AA conformance. Manual VoiceOver, NVDA, real Safari, and physical mobile evidence is still required.

## Validation targets

- A clean lockfile install can build the static application.
- Type checking, linting, unit and component tests, contract validation, and data validation pass.
- Chrome, Firefox, and WebKit Playwright flows run with synthetic media.
- Required fake camera, audio, and microphone runtime paths pass.
- The ten canonical README screenshots match the current interface and contain no real media or personal information.
- Moderate or higher dependency advisories are resolved for the candidate lockfile.
- Manual browser, device, permission, and assistive-technology gaps are listed as limitations.

The automated scope and remaining manual checks are listed in [RELIABILITY.md](RELIABILITY.md).
