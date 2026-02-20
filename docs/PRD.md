# PRD.md — Product Requirements Document

## Problem
Many mental health experiences are difficult to understand from the outside because they are often **invisible**. This gap can reduce empathy and increase misunderstanding.

## Proposed Solution
A web app that layers **metaphorical** audio-visual overlays on top of a user's webcam feed. Users pick a **Condition** (a curated experiential frame) and experience an overlay intended to foster empathy, education, and reflection.

**Non-claim:** This is **not** a clinical simulation and does not diagnose. It is an artistic and educational representation of experience dimensions.

---

## Target Users
- General public, friends/family, colleagues
- Education/workshops/awareness events
- People with lived experience who want reflective tools (voluntary, non-therapeutic)

---

## Product Goals
- Increase understanding through metaphor and controlled immersion
- Be low-friction: runs in a browser, no installation
- Maximize user control & safety
- Make adding new conditions simple (preset-driven authoring)

---

## Explicit Non-Goals
- No diagnostic or medical functionality
- No therapy or treatment guidance
- No data collection, profiling, or analytics in MVP

---

## Key Features
1. Webcam overlay rendering (Three.js VideoTexture)
2. Condition selection (data-driven profiles)
3. Visual effect stacks (video nodes)
4. Global Intensity + Safe Mode + Reduced Motion + Stop Everything
5. Optional: audio synth + modulation (Audio → Video)

---

## UX Requirements
- Onboarding/consent before enabling camera
- Clear language and disclaimers
- Accessibility: keyboard navigation, ARIA labels, focus management
- Immediate exit controls and comfort toggles

---

## Safety & Ethics Requirements
- Condition-specific warnings (motion/overstimulation)
- Parameter clamps (feedback, flicker, contrast spikes)
- Safe Mode recommended by default; Reduced Motion available
- Microphone optional and permission-separated

---

## Privacy Requirements
- MVP is local-only (no backend)
- No external requests; no trackers
- No storage or upload of video/audio
- Permissions only after explicit user action

---

## Non-Functional Requirements
- Reliability: graceful handling of permission denial and device changes
- Performance: adaptive render scale under load
- Browser support: Chrome/Firefox/Safari best effort + fallback strategy

---

## Success Criteria (Qualitative)
- Users understand the “metaphor” framing and feel informed rather than alarmed
- The app feels safe and controllable
- New conditions can be added mostly by editing preset files

---

## Ralph Audit Loop Story Status

- [ ] AUDIT-001: UI Runtime State Audit
- [ ] AUDIT-002: Render/Audio Engine Lifecycle Audit
- [ ] AUDIT-003: Evidence & Accessibility Flow Audit
- [ ] LINT-001: Static Quality Run
- [ ] LINT-002: UI E2E Matrix Run
- [ ] LINT-003: Contract & Validation Run
- [ ] FIX-001: Fix Critical Audit Findings
- [ ] FIX-002: Fix Linting/CI Breakages
- [ ] FIX-003: Final Stabilization & Artifacts
