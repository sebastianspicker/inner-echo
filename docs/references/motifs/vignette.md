# `vignette`: motif evidence

> Generated reference: this page summarizes the current composer mapping and the in-repository
> corpus. It is not an independent research document.

> Non-diagnostic framing: this page documents how an audiovisual motif is used as a design metaphor.
> It does not diagnose anything and does not claim clinical equivalence.

## Technical summary

Darkens edges to narrow the frame (static or gently modulated).

## Evidence and implementation

- In this project, "evidence-backed" means reported phenomena in the evidence corpus. See the dimension pages and the matrix.
- This node is an artistic and engineering implementation that represents those phenomena metaphorically.
- The default claim level is Artistic. Phenomenon evidence does not validate this effect or its numerical settings.

## Where this motif is used

### Used by dimensions

- Compulsive Loop (`compulsive_loop`): Evidence (dimension): High: Claim: Artistic: `docs/references/dimensions/compulsive_loop.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Depersonalization (`depersonalization`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/depersonalization.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Emotional Numbing (`emotional_numbing`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/emotional_numbing.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Hyperarousal (`hyperarousal`): Evidence (dimension): High: Claim: Artistic: `docs/references/dimensions/hyperarousal.md`: corpus: `docs/references/research/initial-dimensions.md`
- Hypervigilance (`hypervigilance`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/hypervigilance.md`: corpus: `docs/references/research/initial-dimensions.md`
- Intrusion (`intrusion`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/intrusion.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Panic Peaks (`panic_peaks`): Evidence (dimension): High: Claim: Artistic: `docs/references/dimensions/panic_peaks.md`: corpus: `docs/references/research/initial-dimensions.md`
- Rumination Loop (`rumination_loop`): Evidence (dimension): High: Claim: Artistic: `docs/references/dimensions/rumination_loop.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Sensory Overload (`sensory_overload`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/sensory_overload.md`: corpus: `docs/references/research/remaining-dimensions.md`

### Used by condition presets

- OCD-related intrusive thoughts and repetition (`ocd`): `docs/references/conditions/ocd.md`

## Scientific sources (peer-reviewed, from the in-repo corpus)

These sources come from evidence-corpus sections for the dimensions that currently use this motif.

> These papers support the phenomena the dimensions describe. They do not claim that this specific
> node is a biomarker or uniquely correct.

No DOI sources were extracted for the dimensions currently using this motif.

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (disable or reduce temporal nodes).
- Keep “Stop Everything” available and the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/references/MAPPING_SUMMARY.md`
- `docs/references/research/initial-dimensions.md`
- `docs/references/research/remaining-dimensions.md`
