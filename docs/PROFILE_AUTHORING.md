# Profile and mapping authoring

Experience profiles are executable application data. They define audiovisual metaphors, not
diagnostic categories or clinical simulations.

## Contract sources

| Path | Role |
| --- | --- |
| `src/content/experience/catalog.json` | Interface labels, descriptions, tags, and evidence links. |
| `src/content/experience/profiles/*.json` | Runtime video, audio, safety, warning, control, and reactive definitions. |
| `src/content/experience/experience-dimensions.json` | Available experience dimensions and rationale paths. |
| `src/content/experience/dimension-to-signal-mapping.json` | Dimension-to-motif defaults, citations, and safety guidance. |
| `src/domain/experience/schema.ts` | Zod contracts for loaded experience data. |
| `src/domain/experience/composition/` | Dimension and weighted-profile composition policy. |
| `src/runtime/visual/graph/graphBuilder.ts` | Executable video-node construction. |
| `tools/contracts/probes/` | Audio and video registry metadata and deterministic probes. |
| `docs/references/` | Evidence corpus, rationale, confidence, and stated gaps. |

When you change a node, parameter, profile, mapping, or safety rule, keep these sources aligned.
Registry metadata is introspection-only: it describes runtime behavior but must not change it.

## Current setup contract

The catalog holds a neutral profile plus curated collections for anxiety, panic, trauma or PTSD,
ADHD, depression, depersonalization or derealization, and OCD. These labels give context to a group
of experience dimensions; they are not assessment categories.

The public setup modes are Experience dimensions, Curated collections, and Combine collections.
Saved preset schema version 2 and URL hashes keep the internal values `symptom`, `preset`, and
`multimorbid` for compatibility.

The composer blends profile defaults or dimension mappings, then applies interaction, global bounds,
Safe Mode, and Reduced Motion policy. Composition does not imply that one dimension causes another,
or that the output represents a measured person.

## Invalid and unknown input

- Schema-invalid profiles fail loading and produce an error state.
- Unknown nodes or parameters fail contract verification.
- Runtime builders warn and skip unsupported entries according to their current policy.
- Schemas, composition policy, profiles, and engines reject or clamp numeric values.
- Unknown input must never produce a false active or verified state.

## Authoring workflow

1. Update the catalog, profile, dimension, or mapping source.
2. Use only implemented node identifiers and parameters.
3. Define conservative defaults, bounds, warnings, Safe Mode clamps, and Reduced Motion behavior.
4. Update graph construction or runtime behavior before referencing a new node.
5. Update matching registry metadata and deterministic probes.
6. Add or update evidence sources and label mapping claims as supported, mixed, hypothesis, or artistic.
7. Add a focused test for the contract or failure mode.
8. Regenerate derived documentation and run the applicable validation.

Commands run from the repository root:

```bash
npm run docs:gen
npm run evidence:gen
npm run conditions:validate
npm run composer:validate
npm run evidence:verify
npm run verify:contracts
npm test
```

`npm run docs:gen` rewrites the tracked catalog and schema references under `docs/generated/`.
`npm run evidence:gen` rewrites generated dimension, motif, and condition pages under
`docs/references/`. Edit their source contracts or research notes, not generated output.

## Contract verifier

`npm run verify:contracts` reads profiles, dimensions, mappings, runtime graph behavior, and registry
probes. It checks node and parameter existence, measurable low and high probe behavior, numeric
ranges and clamps, Safe Mode and Reduced Motion references, and the mapping targets used by profiles
and composition.

The command exits nonzero on errors and writes ignored local reports to:

- `reports/contract-verification.json`
- `reports/contract-verification.md`

Reports are disposable evidence from the current run, not maintained documentation.

## Evidence rules

- Link each profile and dimension to maintained evidence pages.
- Distinguish cited observations, implementation behavior, inference, and design recommendation.
- Mark unsupported relationships as hypotheses or gaps.
- Do not claim diagnosis, assessment, treatment, simulation accuracy, biomarker equivalence, or
  mental-state inference.
- Keep uncertain mappings conservative and off by default where practical.

See [references/README.md](references/README.md),
[references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md),
[references/MAPPING_SUMMARY.md](references/MAPPING_SUMMARY.md), and [SAFETY.md](SAFETY.md).
