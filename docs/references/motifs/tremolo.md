# `tremolo`: motif evidence

> Generated reference: this page summarizes the current composer mapping and the in-repository
> corpus. It is not an independent research document.

> Non-diagnostic framing: this page documents how an audiovisual motif is used as a design metaphor.
> It does not diagnose anything and does not claim clinical equivalence.

## Technical summary

Slow amplitude modulation (rate/depth clamped).

## Evidence and implementation

- In this project, "evidence-backed" means reported phenomena in the evidence corpus. See the dimension pages and the matrix.
- This node is an artistic and engineering implementation that represents those phenomena metaphorically.
- The default claim level is Artistic. Phenomenon evidence does not validate this effect or its numerical settings.

## Where this motif is used

### Used by dimensions

- Rumination Loop (`rumination_loop`): Evidence (dimension): High: Claim: Artistic: `docs/references/dimensions/rumination_loop.md`: corpus: `docs/references/research/remaining-dimensions.md`

### Used by condition presets

- Anxiety-related tension and worry (`anxiety`): `docs/references/conditions/anxiety.md`

## Scientific sources (peer-reviewed, from the in-repo corpus)

These sources come from evidence-corpus sections for the dimensions that currently use this motif.

> These papers support the phenomena the dimensions describe. They do not claim that this specific
> node is a biomarker or uniquely correct.

- Kovács, L. N., Takacs, Z. K., Tóth, Z., Simon, E., Schmelowszky, Á., & Kökönyei, G. (2020). Rumination in major depressive and bipolar disorder - A meta-analysis. *Journal of Affective Disorders, 276*, 1131-1141. https://doi.org/10.1016/j.jad.2020.07.131
  DOI: https://doi.org/10.1016/j.jad.2020.07.131 (`10.1016/j.jad.2020.07.131`): from `docs/references/research/remaining-dimensions.md`
- Ehring, T., Zetsche, U., Weidacker, K., Wahl, K., Schönfeld, S., & Ehlers, A. (2011). The Perseverative Thinking Questionnaire (PTQ): Validation of a content-independent measure of repetitive negative thinking. *Journal of Behavior Therapy and Experimental Psychiatry, 42*(2), 225-232. https://doi.org/10.1016/j.jbtep.2010.12.003
  DOI: https://doi.org/10.1016/j.jbtep.2010.12.003 (`10.1016/j.jbtep.2010.12.003`): from `docs/references/research/remaining-dimensions.md`
- Zhou, H.-X., Zheng, Q., Zhang, H., & Zang, Y.-F. (2020). Rumination and the default mode network: Meta-analysis of brain imaging studies and implications for depression. *NeuroImage, 206*, 116287. https://doi.org/10.1016/j.neuroimage.2019.116287
  DOI: https://doi.org/10.1016/j.neuroimage.2019.116287 (`10.1016/j.neuroimage.2019.116287`): from `docs/references/research/remaining-dimensions.md`
- Treynor, W., Gonzalez, R., & Nolen-Hoeksema, S. (2003). Rumination reconsidered: A psychometric analysis. *Cognitive Therapy and Research, 27*, 247-259. https://doi.org/10.1023/A:1023910315561
  DOI: https://doi.org/10.1023/A:1023910315561 (`10.1023/A:1023910315561`): from `docs/references/research/remaining-dimensions.md`
- Ehring, T., et al. (2024). Repetitive negative thinking as a transdiagnostic cognitive process. *Nature Reviews Psychology.* https://doi.org/10.1038/s44159-024-00399-6
  DOI: https://doi.org/10.1038/s44159-024-00399-6 (`10.1038/s44159-024-00399-6`): from `docs/references/research/remaining-dimensions.md`
- Nolen-Hoeksema, S., Wisco, B. E., & Lyubomirsky, S. (2008). Rethinking rumination. *Perspectives on Psychological Science, 3*(5), 400-424. https://doi.org/10.1111/j.1745-6924.2008.00088.x
  DOI: https://doi.org/10.1111/j.1745-6924.2008.00088.x (`10.1111/j.1745-6924.2008.00088.x`): from `docs/references/research/remaining-dimensions.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (disable or reduce temporal nodes).
- Keep “Stop Everything” available and the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/references/MAPPING_SUMMARY.md`
- `docs/references/research/initial-dimensions.md`
- `docs/references/research/remaining-dimensions.md`
