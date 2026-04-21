# Product — Goals, scope, and requirements

Canonical product doc. Merged from PRD, MVP, and user-story scope. Non-diagnostic, metaphorical framing only.

---

## Problem and solution

Many mental health experiences are difficult to understand from the outside because they are often invisible. This gap can reduce empathy and increase misunderstanding.

**Proposed solution:** A web app that layers metaphorical audio-visual overlays on top of a user's webcam feed. Users pick a condition (a curated experiential frame) and experience an overlay intended to foster empathy, education, and reflection.

**Non-claim:** This is not a clinical simulation and does not diagnose. It is an artistic and educational representation of experience dimensions. Evidence for dimensions and mappings is documented in [references/](references/README.md).

---

## Target users

- General public, friends/family, colleagues
- Education/workshops/awareness events
- People with lived experience who want reflective tools (voluntary, non-therapeutic)

---

## Product goals

- Increase understanding through metaphor and controlled immersion
- Be low-friction: runs in a browser, no installation
- Maximize user control and safety
- Make adding new conditions simple (preset-driven authoring)

---

## Explicit non-goals

- No diagnostic or medical functionality
- No therapy or treatment guidance
- No data collection, profiling, or analytics in MVP

---

## Key features

1. Webcam overlay rendering (Three.js VideoTexture)
2. Condition selection (data-driven profiles from `src/conditions/`)
3. Visual effect stacks (video nodes)
4. Global Intensity, Safe Mode, Reduced Motion, Stop Everything
5. Optional: audio synth and modulation (Audio → Video)

---

## MVP scope

**In scope (MUST):** Webcam via `getUserMedia`; at least two data-driven conditions; video overlay stack (e.g. grain, vignette, chroma); condition picker from `catalog.json`; Intensity, Safe Mode, Reduced Motion, Stop Everything; onboarding/consent; no network calls; no storage/upload; microphone not default.

**MVP+ (optional):** WebAudio synth and FX chain; RMS analyser and modulation into video; dev-only debug panel.

**Out of scope (not now):** Recording/export/sharing; accounts/backends; diagnostic questionnaires; "exact simulation" claims.

**Acceptance criteria:** Camera starts/stops reliably; condition switching live; Safe Mode and Reduced Motion behave as designed; Stop Everything shuts down all resources; no console errors on happy path.

---

## UX and safety requirements

- Onboarding/consent before enabling camera; clear language and disclaimers
- Accessibility: keyboard navigation, ARIA labels, focus management
- Immediate exit controls and comfort toggles
- Condition-specific warnings; parameter clamps; Safe Mode and Reduced Motion available; microphone optional and permission-separated

See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) for full safety and ethics.

---

## Privacy

- MVP is local-only (no backend)
- No external requests; no trackers
- No storage or upload of video/audio
- Permissions only after explicit user action

---

## User stories (summary)

Epics: E1 Camera & rendering, E2 Conditions & presets, E3 Safety & accessibility, E4 Audio & modulation (optional), E5 Knowledge base / authoring.

---

## Success criteria (qualitative)

- Users understand the metaphor framing and feel informed rather than alarmed
- The app feels safe and controllable
- New conditions can be added mostly by editing preset files
