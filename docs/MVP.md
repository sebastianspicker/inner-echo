# MVP.md — Minimal Viable Product Scope & Acceptance

## MVP Goal
Deliver a working prototype that:
1) Shows webcam video locally (Three.js)
2) Offers at least **two** data-driven conditions
3) Renders a visible video overlay stack (multiple nodes)
4) Includes **global Intensity**, **Safe Mode**, **Reduced Motion**, and **Stop Everything**
5) (Optional) Adds a simple audio synth and basic modulation (MVP+)

---

## In Scope (MUST)
### Video
- `getUserMedia({ video: true })` with clear permission UX
- Three.js renderer with `THREE.VideoTexture`
- At least **three** video nodes:
  - `grain/noise`
  - `vignette`
  - `chroma_aberration`
- Apply `video_stack` from profile files
- Correct resize behavior (desktop + mobile)

### UI & Safety
- Condition picker loaded from `catalog.json`
- Global `Intensity` slider
- `Safe Mode` toggle (clamps + max intensity)
- `Reduced Motion` toggle (disables/replaces time-heavy effects)
- `Stop Everything` (stops camera/audio/mic and render loops; clears canvas)
- Onboarding/consent modal explaining local-only + metaphor framing

### Privacy
- No network calls
- No storage or upload of video/audio
- Microphone not enabled by default (optional later)

---

## MVP+ (SHOULD, Optional)
- WebAudio synth + small FX chain (e.g., lowpass, tremolo)
- Audio analyser (RMS) and small modulation into a video parameter
- Dev-only debug panel (renderer mode, fps, renderScale)

---

## Out of Scope (NOT NOW)
- Recording/export/sharing
- Accounts/backends/cloud storage
- Diagnostic questionnaires or personal data profiling
- “Exact simulation” claims

---

## Acceptance Criteria
- Camera starts and stops reliably (tracks end; LED turns off)
- Condition switching is live (no page reload)
- Safe Mode visibly limits intensity/parameters
- Reduced Motion removes time-based/feedback nodes (with user notice)
- Stop Everything shuts down everything and reduces CPU/GPU load
- No console errors on the happy path

---

## Performance Budget (Targets)
- Target: 60 FPS; minimum: 30 FPS
- Performance guard reduces `renderScale` under sustained < 30 FPS
- No render loop while idle

---

## MVP Demo Flow
1) Open app → onboarding/consent → accept
2) Click “Enable Camera” → video appears
3) Select a condition → overlay changes
4) Adjust intensity; toggle Safe Mode / Reduced Motion
5) Press Stop Everything → all off
