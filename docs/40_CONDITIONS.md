# Conditions and experience dimensions

The profile system defines audiovisual metaphors. Setup labels emphasize experience dimensions and curated collections rather than diagnostic selection.

Profiles do not diagnose a user or claim to reproduce a condition. Evidence pages document sources, design rationale, hypotheses, and limits.

## Contract sources

| Path | Role |
|---|---|
| `src/content/experience/catalog.json` | Profile labels, descriptions, tags, and evidence links used by the interface. |
| `src/content/experience/profiles/*.json` | Runtime video, audio, safety, control, warning, and reactive definitions. |
| `src/domain/experience/schema.ts` | Zod contract for loaded profile data. |
| `src/content/experience/experience-dimensions.json` | Available experience dimensions. |
| `src/content/experience/dimension-to-signal-mapping.json` | Dimension-to-motif defaults and safety guidance. |
| `src/runtime/visual/graph/graphBuilder.ts` | Registered video-node construction. |
| `tools/contracts/probes/` | Audio and video node metadata and deterministic probes. |
| `docs/references/` | Evidence method, citations, rationale pages, and stated gaps. |

These paths form one runtime contract. Keep them aligned when a node, parameter, profile, or mapping changes.

## Current curated profiles

The catalog currently contains a neutral `none` profile and curated profiles for anxiety, panic, trauma or PTSD, ADHD, depression, depersonalization or derealization, and OCD. Their labels provide context for collections of experience dimensions. They are not assessment categories.

Dimension support and evidence strength are listed in [references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md). Evidence strength refers to the cited phenomenon or design rationale, not to clinical accuracy of the rendered overlay.

## Setup modes

- Experience dimensions: the default guided path, using selected dimensions and weights.
- Curated collections: one catalog profile.
- Combine collections: weighted composition of multiple catalog profiles.

Saved preset schema version 2 and URL-hash payloads retain the internal wire values `symptom`, `preset`, and `multimorbid`. Public labels can change without rewriting those stored values.

## Composition

The composer blends profile defaults or dimension mappings, then applies interaction, global safety, Safe Mode, and Reduced Motion policy. Interaction Amount can apply a small code-defined adjustment for selected dimension pairs. It remains bounded by the same safety limits as other composition paths.

Composition is a perceptual design operation. It does not imply that dimensions cause one another or that the output represents a measured person.

## Unknown and invalid values

- Schema-invalid profiles fail loading and surface an error state.
- Unknown node types or parameters are reported by validation and cannot create a verified contract result.
- Runtime builders warn and skip unsupported entries according to their current policy.
- Numeric values are clamped or rejected according to schema, profile, composer, and engine rules.
- Registry metadata must not change runtime semantics.

## Authoring workflow

1. Add or update the catalog entry.
2. Add or update the profile JSON and its evidence references.
3. Use only registered node identifiers and parameters.
4. Define conservative defaults, Safe Mode clamps, Reduced Motion policy, and warnings.
5. Update dimension mappings and registry metadata when required.
6. Add a focused test for the intended contract or failure mode.
7. Refresh affected public documentation.
8. Run the relevant gates.

Typical commands:

```bash
npm run docs:gen
npm run evidence:gen
npm run conditions:validate
npm run composer:validate
npm run evidence:verify
npm run verify:contracts
npm test
```

Do not copy a known invalid mapping for consistency. Fix the shared source or report the unsupported mapping explicitly.

## Evidence rules

- Link each profile and dimension to maintained evidence pages.
- Distinguish cited observations, implementation behavior, inference, and design recommendation.
- Mark unsupported or weakly supported mappings as hypotheses or gaps.
- Avoid literal simulation, diagnostic, therapeutic, or accuracy claims.
- Avoid strobe, sudden loud transients, abrupt motion, body-distortion spectacle, and stigmatizing portrayals.

See [references/README.md](references/README.md), [references/MAPPING_SUMMARY.md](references/MAPPING_SUMMARY.md), and [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md).
