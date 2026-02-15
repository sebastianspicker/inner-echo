# inner-echo — Condition Profiles (v0.2.0)

This folder contains a **data-driven condition authoring layer** for the *inner-echo* concept:
a privacy-first, client-only webcam overlay app that renders **metaphorical** audio-visual treatments.

## What this is
- A **metaphor engine**: conditions are authored as presets composed from **experience dimensions**.
- A **teaching / empathy tool**: helps make invisible inner experiences more understandable.

## What this is NOT
- Not a diagnostic tool.
- Not a clinical simulation.
- Not therapy or medical advice.

## Evidence-informed (still metaphorical)
The dimension vocabulary and motif suggestions are **informed by literature** and summarized in:
- `docs/references/dimensions/*.md` (dimension-by-dimension rationale)
- `docs/references/EVIDENCE_MATRIX.md` (overview)

Inside this folder we only keep **implementation-facing** artifacts:
dimension definitions, motif hints, and condition presets.

## Files
- `catalog.json` — list of available conditions for the UI
- `experience-dimensions.json` — the vocabulary of experience dimensions (+ evidence strength + doc pointers)
- `dimension-to-signal-mapping.json` — authoring hints: dimension → AV motifs (+ safety clamps)
- `profiles/*.json` — the actual condition profiles
- `MAPPING.md` — non-diagnostic mapping of starter profiles to dimensions
- `EVIDENCE.md` — quick index (dimension → evidence strength → doc pointer)

## Profile structure (high level)
Each profile includes:
- `experience_dimensions`: list of `{ id, weight }`
- `safety`: intensity defaults, clamps, warnings, and Reduced Motion policy
- `video_stack`: ordered list of shader-like nodes and parameters (safe-by-default)
- `audio_stack`: optional audio chain (synth-based by default)
- `reactive.analyser_to_params`: optional audio → video modulation mapping (clamped)

## Comfort & safety defaults
Every profile must provide:
- **Stop Everything** (panic button)
- **Safe Mode** (extra clamps)
- **Reduced Motion** (removes time-based feedback/jitter; keeps a calmer overlay)
- **Audio mute** + conservative master volume

Hard limits for a public-facing repo:
- no strobe / flicker patterns
- no jump-scares
- no sudden loud transients
- no intense camera-like motion (avoid nausea)

## Notes for implementers
Node names in `video_stack` and `audio_stack` are **intended interfaces**. Your engine should:
- validate profiles
- skip unknown nodes with warnings
- apply safety clamps, Safe Mode, and Reduced Motion filtering consistently

Generated: {today}

