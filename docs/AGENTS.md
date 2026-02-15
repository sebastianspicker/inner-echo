# AGENTS.md — How We Work, Standards, and Definitions

## Purpose
This repository implements a **privacy-first, client-only** web app that renders an **audio-visual metaphor overlay** on top of a user's webcam feed. Users select a **Condition** (a curated experiential frame such as “Tension/Hyperarousal” or “Dissociation”) and the app layers a responsive visual + (optional) audio treatment to help outsiders better understand otherwise *invisible* inner experiences.

**Important:** This is **not** a diagnostic tool and does **not** claim to simulate clinical reality. It is an **artistic, educational metaphor** designed for empathy and reflection.

---

## Core Principles
1. **Privacy-first by default**: Local-only processing; no uploads; no trackers.
2. **Safety & comfort are non-negotiable**: *Stop Everything*, *Safe Mode*, *Reduced Motion* are required.
3. **Non-stigmatizing language**: No caricatures; avoid sensational framing.
4. **Data-driven conditions**: Conditions are presets (JSON) + assets; the engine stays stable.
5. **Small, verifiable changes**: Each PR should be reviewable and testable in isolation.

---

## Glossary
- **Condition**: A selectable experience frame shown in the UI (e.g., “Dissociation”), represented as a metaphorical AV overlay.
- **Profile / Preset**: The data definition for a Condition (`video_stack`, `audio_stack`, safety, UI controls).
- **Node**: A single building block in a video or audio graph (e.g., `grain`, `vignette`, `lowpass`).
- **Graph / Pipeline**: A chain of Nodes in a specific order, optionally including modulation (Audio → Video parameters).
- **Intensity**: Global 0..1 multiplier that scales effect parameters (subject to safety clamps).
- **Safe Mode**: Safety clamps that reduce potentially uncomfortable parameters (e.g., feedback, high contrast spikes).
- **Reduced Motion**: Removes or replaces time-based / motion-heavy effects (e.g., temporal smear), prioritizing comfort.

---

## Repository Layout (Target)
- `src/engine/`
  - `video/` — camera lifecycle, VideoTexture, Three.js renderer
  - `audio/` — WebAudio engine, FX chain, analyser
  - `effects/` — VideoNodes (shaders) and AudioModules (WebAudio units)
  - `graph/` — build graphs from profiles (Profile → Graph)
  - `runtime/` — state machine, performance guard, safety controls
- `src/conditions/`
  - `catalog.json` — list of available conditions for the UI
  - `profiles/*.json` — one profile per condition
  - optional: `shaders/`, `audio-patches/`
- `src/ui/` — UI components, onboarding, accessibility, warnings
- `docs/` — knowledge base + specs, including `docs/generated/`

---

## Definition of Done (Every PR)
### Functional
- Change is clearly scoped and manually testable.
- New work is wired into **Stop Everything** (no orphan loops / streams).

### Safety & Ethics
- MVP: **no new network calls**.
- New nodes / profiles include safety considerations (clamps, warnings where relevant).
- UI language remains respectful and non-stigmatizing.

### Quality
- No console errors in the “happy path”.
- Resize, start/stop, permission denial handled cleanly.
- No render loop when idle.
- Cleanup/disposal performed for WebGL resources and media tracks.

---

## PR Rules (Small, Verifiable, Revertible)
- **1 PR = 1 verifiable change** (e.g., “Add vignette node + control”).
- Avoid “mega PRs” that change camera + audio + preset system at once.
- Each PR includes:
  - What changed?
  - How do I test it manually?
  - Any safety implications?

---

## Logging & Diagnostics
- Dev: logs allowed for states, renderer mode, fps, and errors.
- Prod: keep minimal; never log sensitive data (no device IDs, no media content).
- No persistent storage of video/audio without explicit future scope and review.

---

## How to Add a Condition (Short Version)
1. Add entry to `src/conditions/catalog.json` (id, label, description, tags).
2. Create `src/conditions/profiles/<id>.json`:
   - `video_stack` and/or `audio_stack`
   - `safety` (intensity_default, intensity_max, warnings)
   - `ui.controls` (sliders/toggles)
3. Reference existing nodes only (unknown nodes should be skipped with a warning, but avoid relying on that).
4. Manual tests:
   - start/stop, Safe Mode, Reduced Motion
   - switching between conditions
5. (If available) run `npm run docs:gen` to refresh generated docs.

---

## MVP “No Network Calls” Policy
During MVP, **no remote requests** are allowed:
- no analytics
- no external CDNs/fonts
- no uploads/streaming
Everything runs locally in the browser.

---

## Required Safety Switches (Always Available)
- **Stop Everything** (global)
- **Safe Mode**
- **Reduced Motion**
- **Audio Off**
- **Mic is optional** (never enabled by default)
