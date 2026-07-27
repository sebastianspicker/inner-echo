# `chroma_aberration`: motif evidence

> Non-diagnostic metaphor framing: This page documents how an audiovisual motif is used as a design metaphor. It does not diagnose and does not claim clinical equivalence.

## Technical summary

Minor RGB channel offset near edges (very low).

## Evidence and implementation

- Evidence-backed in this project refers to reported phenomena in the evidence corpus. See the dimension pages and matrix.
- This node is an artistic and engineering implementation used to represent those phenomena metaphorically.
- The usual claim level is Mixed: the phenomenon is supported, while the motif choice and implementation remain interpretive.

## Where this motif is used (traceability)

### Used by dimensions

- Depersonalization (`depersonalization`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/depersonalization.md`: corpus: `docs/references/research/remaining-dimensions.md`: claim sources: `docs/references/CONTRIBUTIONS_AND_LIMITS.md`
- Derealization (`derealization`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/derealization.md`: corpus: `docs/references/research/remaining-dimensions.md`: claim sources: `docs/references/CONTRIBUTIONS_AND_LIMITS.md`

### Used by condition presets

- Depersonalization / Derealization (`dpdr`): `docs/references/conditions/dpdr.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from evidence-corpus sections for the dimensions that currently use this motif.

> Important: these papers support the phenomena described by the dimensions. They do not claim that this specific node is a biomarker or uniquely correct.

No DOI sources were extracted for the dimensions currently using this motif.

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/references/MAPPING_SUMMARY.md`
- `docs/references/research/initial-dimensions.md`
- `docs/references/research/remaining-dimensions.md`
