# AGENTS.md — Standards, Guardrails and Glossary

This repo contains a **privacy-first, client-only** web app: an audio-visual overlay on the webcam feed. Users choose a **Condition** (e.g. “Tension/Hyperarousal” or “Dissociation”) and the app applies a responsive visual and optional audio metaphor on top. It is an **artistic, educational metaphor**, not a diagnostic or therapy tool.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Condition** | A selectable experience metaphor in the UI (e.g. “Dissociation”), represented as an AV overlay. |
| **Profile** | The data definition of a Condition: `video_stack`, `audio_stack`, safety and UI parameters. |
| **Node** | A single building block in the video or audio graph (e.g. `grain`, `vignette`, `lowpass`). |
| **Graph / Pipeline** | An ordered chain of nodes, optionally with modulation (audio → video parameters). |

---

## Definition of Done (small PRs)

- Change is clearly scoped and manually testable.
- New functionality is wired into **Stop Everything** (no orphan loops/streams).
- In MVP: **no new network calls**.
- No console errors on the happy path; resize, start/stop and permission denial are handled cleanly.
- No render loop when idle; WebGL and media tracks are disposed correctly on stop.

---

## Stop Button Required

A global **“Stop Everything”** button is **required**. When pressed, all media streams, audio contexts, render loops and WebGL resources must be reliably stopped and released. No exceptions.

---

## Safe Mode Required

**Safe Mode** must be implemented: parameters (e.g. contrast spikes, feedback) are clamped so users are not overwhelmed. Safe Mode must always be available in the UI.

---

## No network calls in MVP

During **MVP**, **no network requests** are allowed: no analytics, no external CDNs/fonts, no uploads. Everything runs locally in the browser.

---

## How to add a Condition (short version)

1. Add an entry to `src/conditions/catalog.json` (id, label, description, tags).
2. Create profile `src/conditions/profiles/<id>.json` with `video_stack` and/or `audio_stack`, `safety` (intensity_default, intensity_max, warnings), `ui.controls`.
3. Reference only existing nodes (unknown nodes are skipped with a warning; do not rely on that).
4. Manually test: start/stop, Safe Mode, Reduced Motion, switching between conditions.
5. Run `npm run docs:gen` to regenerate generated docs.

---

## How to add a Condition (full)

Use this when adding or changing a Condition end-to-end. The generator and schema live under `scripts/` and `docs/generated/`.

### 1. Prerequisites

- Phase 10 (or current baseline) completed.
- No new network calls (MVP).
- UI language respectful and non-stigmatizing.

### 2. Steps

1. **Catalog**
   - Add one entry to `src/conditions/catalog.json` in the `conditions` array.
   - Required: `id` (slug, no spaces), `label` (UI name), `description` (short), `tags` (array of dimension/topic strings).
   - Optional: `recommended` (boolean).

2. **Profile**
   - Create `src/conditions/profiles/<id>.json` (filename must match catalog `id`).
   - **Required keys** (see also `docs/generated/preset-schema.md` and `preset-schema.json`):
     - `id`: same as catalog and filename.
     - `label`: same as or aligned with catalog.
     - `video_stack`: array of `{ node, params?, id? }` (can be empty).
   - **Safety (required for non-baseline conditions):**
     - `safety.intensity_default`, `safety.intensity_max`: numbers in [0, 1].
     - `safety.warnings`: array of short user-facing strings (shown in UI).
     - `safety.safe_mode_clamps`: optional; when present, used to clamp intensity and effect strength in Safe Mode.
   - **Optional but recommended:** `ui.controls` (slider/toggle for intensity, Safe Mode, Reduced Motion, and node params), `audio_stack` (if audio), `reactive.analyser_to_params` (if modulating from audio), `reduced_motion_policy.disable_nodes` for time-heavy nodes.

3. **Nodes**
   - Use only **existing** video/audio node types implemented in the app. Unknown nodes are skipped at build time with a warning; do not rely on that for correctness.
   - Ensure param names and ranges match what the engine expects.

4. **Docs**
   - Run `npm run docs:gen`. This updates:
     - `docs/generated/conditions-catalog.md` (table + per-condition sections with warnings).
     - `docs/generated/preset-schema.json` (JSON Schema for profiles).
     - `docs/generated/preset-schema.md` (human-readable schema description).
   - Generated files must not be edited by hand.

### 3. Checklist before PR

- [ ] Catalog entry and profile file exist; `id` matches everywhere.
- [ ] Profile validates against the schema (required: `id`, `label`, `video_stack`).
- [ ] Safety: `intensity_max` and `warnings` set; Safe Mode clamps considered.
- [ ] Reduced Motion: time/motion-heavy effects covered by `reduced_motion_policy` or equivalent.
- [ ] Audio off by default; mic never required.
- [ ] `npm run docs:gen` run; generated docs committed.
- [ ] Manual test: start condition → Stop Everything → no orphan streams/loops; Safe Mode and Reduced Motion work; no console errors on happy path.

### 4. Definition of Done (per Condition)

- Change is scoped to one Condition (or one catalog + one profile).
- New functionality is wired into **Stop Everything** (no orphan loops/streams).
- No new network calls.
- No console errors on the happy path; resize, start/stop, and permission denial handled cleanly.
- No render loop when idle; WebGL and media tracks disposed on stop.

### 5. Safety requirements

- **Safe Mode** must remain available and must clamp intensity and harsh effects (e.g. feedback, strobe, high contrast delta). Define `safety.safe_mode_clamps` where needed.
- **Warnings**: every non-baseline Condition should have at least one warning (e.g. “Use Safe Mode or stop at any time”).
- **Reduced Motion**: if the Condition uses temporal smear, feedback, pulse, or jitter, provide a way to reduce or disable them (e.g. `reduced_motion_policy.disable_nodes` and a Reduced Motion toggle in UI).
- **Audio**: optional and off by default; keep volume limits and avoid sudden loud peaks.

---

## Other rules

- **Reduced Motion**: Time- and motion-heavy effects must be reducible or switchable.
- **Audio Off** and **Mic optional** (never on by default).
- UI language must be respectful and non-stigmatizing.
