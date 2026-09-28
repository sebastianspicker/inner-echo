# Product scope

Inner Echo is a client-only reflective media tool. It turns validated experience profiles into
gentle visual overlays and optional local sound or microphone coupling. It does not diagnose,
measure, score, record, or upload the user.

## Audience and use

Inner Echo is for adults exploring inner-experience metaphors, for therapists or educators using
those metaphors as conversation prompts, and for researchers or designers reviewing how evidence
maps to audiovisual behavior. Sessions are voluntary, occasional, private, and trust-sensitive.

Supported uses are individual exploration, technical demonstration, and facilitated educational
discussion. The repository does not establish clinical validation, formal usability validation,
accessibility conformance, or suitability for unattended use.

## Product contract

The camera remains the primary reflective surface. You choose or compose an experience, activate
each media capability deliberately, adjust bounded controls, and can stop every resource immediately.

Setup places the experience choices beside comfort controls and an optional preview on wide screens.
Smaller screens use one scrolling column with links between choices and comfort. The idle preview
stays compact; the active preview gains space. Stop Everything stays in the header during activation
and active use. General comfort notes, sound controls, advanced composition, and saved setups use
disclosures, while runtime errors stay visible.

Current product capabilities are:

- experience-dimension, curated-collection, and combined-collection setup;
- WebGL effects with reduced Canvas2D or raw-camera fallbacks;
- Safe Mode, Reduced Motion, intensity, and Stop Everything controls;
- optional synthesized sound and separate optional microphone input;
- local preset storage and URL-hash sharing of setup that contains no media;
- bundled evidence and method documents; and
- a device-free mock interface for reviewing product states without media access.

Inner Echo is not a diagnostic tool, medical device, treatment platform, questionnaire, assessment
system, objective simulation, recording service, or media-sharing service.

## Trust and control

- Welcome acknowledgement and setup do not request media or start sound.
- Camera, sound, and microphone input have separate direct activation actions.
- Imported presets may change desired configuration but cannot activate media.
- Controls report what is actually happening, not what was requested.
- Stop Everything remains understandable and reachable during an active session.
- Evidence and warnings remain available without granting media permissions.

The detailed implementation requirements live in [docs/SAFETY.md](docs/SAFETY.md),
[docs/RELIABILITY.md](docs/RELIABILITY.md), and [SECURITY.md](SECURITY.md).

## Design principles

1. Make the mirror the interface and let controls recede when they are not needed.
2. Earn trust by telling the truth about what is running, staying local, and starting only when asked.
3. Reveal advanced controls only when they help, so newcomers and returning users both move quickly.
4. Keep every audiovisual metaphor gentle, reversible, and always under the safety controls.
5. Use hierarchy and language to clarify the workflow without making the product feel clinical.

The interface should be calm, precise, editorial, and operationally clear. Avoid a dense laboratory
dashboard, a diagnostic or biometric instrument, a card-heavy control panel, or a wellness wizard.
Do not use decorative data, alarmist status language, competing accent colors, or effects that imply
a literal depiction of a condition.

## Accessibility and inclusion

Preserve keyboard access, visible focus, semantic status announcements, readable contrast, and at
least 44 CSS-pixel primary targets. Respect the operating-system motion preference and the explicit
Reduced Motion and Safe Mode controls. Do not rely on color alone for status, use flashing or
disorienting defaults, or hide the stop path.

The project does not claim WCAG 2.2 AA conformance. Manual assistive-technology and real-device
evidence is still required.
