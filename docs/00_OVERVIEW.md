# Inner Echo documentation overview

This documentation describes the current client-only browser application, its runtime contracts, and the evidence and safety boundaries around its audiovisual metaphors.

## Maintained documents

| Document | Purpose |
|---|---|
| [../README.md](../README.md) | Public repository entry point, setup, usage, and validation commands. |
| [10_PRODUCT.md](10_PRODUCT.md) | Implemented alpha scope, supported uses, non-goals, and limitations. |
| [20_ARCHITECTURE.md](20_ARCHITECTURE.md) | Runtime ownership, data flow, fallback behavior, and module boundaries. |
| [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) | Safety, permission, privacy, sensory, and language requirements. |
| [40_CONDITIONS.md](40_CONDITIONS.md) | Profile and experience-dimension contracts and authoring rules. |
| [RELIABILITY.md](RELIABILITY.md) | Browser evidence, runtime fallbacks, known issues, and manual checks. |
| [SECURITY.md](SECURITY.md) | Security reporting, privacy boundaries, headers, and release checks. |
| [RELEASING.md](RELEASING.md) | Local alpha validation, artifact checks, and proposed tag structure. |
| [CONTRACT_VERIFICATION.md](CONTRACT_VERIFICATION.md) | Runtime node registry and JSON contract checks. |
| [references/](references/README.md) | Evidence method, dimension pages, motif pages, condition summaries, and research notes. |
| [generated/](generated/README.md) | Derived catalog and schema references. |

## Maintainer code path

For an initial code read:

1. `src/main.tsx` mounts the application.
2. `src/app/App.tsx` defines the top-level shell.
3. `src/ui/CameraView.tsx` coordinates visible state, permissions, safety controls, and runtime cleanup.
4. `src/ui/hooks/useProfileLoad.ts` loads a profile or composer result.
5. `src/conditions/graphBuilder.ts` converts `video_stack` entries into video nodes.
6. `src/ui/hooks/useReactivePipeline.ts` starts the overlay and reactive audio and video coupling.
7. `src/engine/audio/audioEngine.ts` owns WebAudio, optional microphone input, and audio effects.
8. `src/engine/canvas/webglPipeline.ts` owns WebGL resources, the frame loop, metrics, and fallback boundaries.
9. `src/contractVerification/` keeps profile references aligned with implemented audio and video nodes.

Profile JSON under `src/conditions/profiles/` is runtime data. Validate changes with `npm run verify:contracts`, `npm run conditions:validate`, and the relevant tests.

The compact direct core-contract suite lives under `tests/`. Repository tooling is grouped by responsibility under `scripts/docs/`, `scripts/validation/`, `scripts/release/`, and `scripts/lib/`.

## Evidence sources

- `docs/references/` contains the maintained evidence corpus and stated limitations.
- `docs/references/MAPPING_SUMMARY.md` records the current mapping from dimensions to motifs and evidence pages.
- `src/conditions/` contains the executable profile and dimension mappings.

Do not infer clinical validity from an implemented mapping. Documentation must distinguish source-backed statements, design hypotheses, runtime behavior, and validation results.

## Documentation boundary

The files linked above describe the current application. Historical release notes do not override runtime source, configuration, tests, or the current validation status.
