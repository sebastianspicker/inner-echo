# Inner Echo — Documentation overview

This repo contains a privacy-first, client-only web app: an audio-visual overlay on the webcam feed. Users choose a condition (e.g. tension, dissociation) and the app applies a responsive visual and optional audio metaphor. It is an artistic, educational metaphor — not a diagnostic or therapy tool.

---

## Documentation structure (canonical)

| Doc | Purpose |
|-----|--------|
| [00_OVERVIEW.md](00_OVERVIEW.md) | This file: navigation and conventions. |
| [10_PRODUCT.md](10_PRODUCT.md) | Product goals, MVP scope, user stories, non-goals. |
| [20_ARCHITECTURE.md](20_ARCHITECTURE.md) | System architecture, data flow, frontend/engine, reliability. |
| [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) | Safety (Stop Everything, Safe Mode, Reduced Motion), ethics, design principles. |
| [40_CONDITIONS.md](40_CONDITIONS.md) | Conditions and experience dimensions; evidence and mapping; links to references. |
| [RELEASE_RC.md](RELEASE_RC.md) | Release-candidate one-pass runbook and tag process. |
| [references/](references/README.md) | Evidence rationale; dimension docs; Evidence Matrix; long-form reports. |
| [generated/](generated/README.md) | Generated catalog and schema (do not edit by hand). |

Completed audit, plan, status, and ledger files are not canonical documentation.
Keep them out of active navigation; archive them locally under `docs/archive/`
or delete them when they are superseded. `docs/archive/` is ignored and should
not be committed.

---

## New maintainer code path

For the first code read, follow this path instead of scanning files alphabetically:

1. `src/app/App.tsx` mounts the single app surface.
2. `src/ui/CameraView.tsx` owns user-facing state and coordinates camera, audio, profile, and evidence UI.
3. `src/ui/hooks/useProfileLoad.ts` selects either a preset profile or a composed profile.
4. `src/conditions/graphBuilder.ts` converts profile `video_stack` entries into live `VideoNode` instances.
5. `src/ui/hooks/useReactivePipeline.ts` starts the WebGL/Canvas overlay and wires reactive audio/video coupling.
6. `src/engine/audio/audioEngine.ts` owns WebAudio, optional mic input, analyser metrics, and audio FX.
7. `src/engine/canvas/webglPipeline.ts` owns the frame loop, render targets, video metrics, and 2D fallback boundary.
8. `src/contractVerification/` keeps JSON profile references aligned with implemented audio/video node contracts.

The profile JSON under `src/conditions/profiles/` is runtime data, not sample data. Changes there should be treated as contract changes and verified with `npm run verify:contracts`.

---

## Source of truth (evidence)

- **docs/references/**: canonical evidence corpus (dimension docs, motif docs, condition summaries, and reports).
- **docs/REFERENCES_AUDIT.md**: current wiring view of what is used by defaults.
- **Conditions data**: runtime data in `src/conditions/`; evidence linkage declared in profile references and dimension mappings.

---

## Conventions

- **Language:** Neutral, non-stigmatizing. Use "suggests", "is consistent with", "may align with" for evidence-based claims.
- **Citations:** Link to repo paths (e.g. `references/dimensions/hyperarousal.md`); no invented external citations.
- **Safety:** Stop Everything, Safe Mode, Reduced Motion, and Audio optional are required. See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md).
