# `vignette`: motif evidence

> Non-diagnostic metaphor framing: This page documents how an audiovisual motif is used as a design metaphor. It does not diagnose and does not claim clinical equivalence.

## Technical summary

Darkens edges to narrow the frame (static or gently modulated).

## Evidence and implementation

- Evidence-backed in this project refers to reported phenomena in the evidence corpus. See the dimension pages and matrix.
- This node is an artistic and engineering implementation used to represent those phenomena metaphorically.
- The usual claim level is Mixed: the phenomenon is supported, while the motif choice and implementation remain interpretive.

## Where this motif is used (traceability)

### Used by dimensions

- Compulsive Loop (`compulsive_loop`): Evidence (dimension): High: Claim: Mixed: `docs/references/dimensions/compulsive_loop.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Depersonalization (`depersonalization`): Evidence (dimension): Medium: Claim: Mixed: `docs/references/dimensions/depersonalization.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Emotional Numbing (`emotional_numbing`): Evidence (dimension): Medium: Claim: Mixed: `docs/references/dimensions/emotional_numbing.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Hyperarousal (`hyperarousal`): Evidence (dimension): High: Claim: Mixed: `docs/references/dimensions/hyperarousal.md`: corpus: `docs/references/research/initial-dimensions.md`
- Hypervigilance (`hypervigilance`): Evidence (dimension): Medium: Claim: Mixed: `docs/references/dimensions/hypervigilance.md`: corpus: `docs/references/research/initial-dimensions.md`
- Intrusion (`intrusion`): Evidence (dimension): Medium: Claim: Mixed: `docs/references/dimensions/intrusion.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Panic Peaks (`panic_peaks`): Evidence (dimension): High: Claim: Mixed: `docs/references/dimensions/panic_peaks.md`: corpus: `docs/references/research/initial-dimensions.md`
- Rumination Loop (`rumination_loop`): Evidence (dimension): High: Claim: Mixed: `docs/references/dimensions/rumination_loop.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Sensory Overload (`sensory_overload`): Evidence (dimension): Medium: Claim: Mixed: `docs/references/dimensions/sensory_overload.md`: corpus: `docs/references/research/remaining-dimensions.md`

### Used by condition presets

- ADHD (Attention Fragmentation / Overload) (`adhd`): `docs/references/conditions/adhd.md`
- Anxiety (Generalized / Social) (`anxiety`): `docs/references/conditions/anxiety.md`
- Depressive Disorder (`depression`): `docs/references/conditions/depression.md`
- Depersonalization / Derealization (`dpdr`): `docs/references/conditions/dpdr.md`
- OCD (Intrusion + Compulsive Loop) (`ocd`): `docs/references/conditions/ocd.md`
- Panic Disorder (`panic`): `docs/references/conditions/panic.md`
- Trauma / PTSD (Hyperarousal + Intrusion) (`trauma_ptsd`): `docs/references/conditions/trauma_ptsd.md`

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
