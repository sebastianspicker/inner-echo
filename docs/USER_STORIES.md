# USER_STORIES.md — User Stories & Acceptance Criteria

## Epics
- E1: Camera & Rendering
- E2: Conditions & Presets
- E3: Safety & Accessibility
- E4: Audio & Modulation (Optional)
- E5: Knowledge Base / Authoring

---

## E1: Camera & Rendering

### US-1 — Enable Camera
As a user, I want to enable my camera so I can see the overlay on my live image.  
**Acceptance:**
- Permission prompt appears.
- On accept: video renders.
- On deny: clear “denied” UI with next steps.

### US-2 — Stop Camera
As a user, I want to stop my camera at any time.  
**Acceptance:**
- All video tracks stop and camera indicator turns off.
- UI returns to idle; render loop stops.

### US-3 — Resize Correctly
As a user, I want the overlay to stay aligned on different screen sizes.  
**Acceptance:**
- No stretching or offset; canvas matches video dimensions.

---

## E2: Conditions & Presets

### US-4 — Select a Condition
As a user, I want to select a condition to change the overlay.  
**Acceptance:**
- Picker loads from `catalog.json`.
- Switching updates the overlay live.

### US-5 — Preset-Only Authoring
As a maintainer, I want to add a condition by editing JSON profiles without changing engine code.  
**Acceptance:**
- New profile appears in the UI (via `catalog.json`) and loads successfully.

---

## E3: Safety & Accessibility

### US-6 — Safe Mode
As a user, I want Safe Mode to reduce uncomfortable intensity.  
**Acceptance:**
- Intensity is capped; risky parameters are clamped.

### US-7 — Reduced Motion
As a user, I want Reduced Motion to disable motion-heavy/time-based effects.  
**Acceptance:**
- Time-based nodes are removed or replaced; user sees a note if a node is skipped.

### US-8 — Stop Everything
As a user, I want a single button to stop everything immediately.  
**Acceptance:**
- Video + audio + mic + loops stop; canvas cleared; CPU/GPU load drops.

### US-9 — Accessibility
As a user, I want keyboard navigation and accessible UI elements.  
**Acceptance:**
- Modal focus trap works; controls have ARIA labels; tab order is sensible.

---

## E4: Audio & Modulation (Optional)

### US-10 — Enable Audio
As a user, I want to enable audio to deepen the experience.  
**Acceptance:**
- Audio starts only after clicking a button; volume control works.

### US-11 — Audio → Video Modulation
As a user, I want audio energy to animate visual parameters.  
**Acceptance:**
- Modulation is visible (e.g., grain pulses) and smoothed (no jitter).

### US-12 — Optional Microphone
As a user, I want microphone input to be optional and clearly controlled.  
**Acceptance:**
- Separate permission flow; denial is handled; safety limiter prevents clipping.

---

## E5: Knowledge Base / Authoring

### US-13 — Docs Generation
As a maintainer, I want docs to be generated from profiles.  
**Acceptance:**
- `npm run docs:gen` generates `docs/generated/conditions-catalog.md` deterministically.
