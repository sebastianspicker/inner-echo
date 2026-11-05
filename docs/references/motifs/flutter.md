# `flutter`: motif evidence

> Generated reference: this page summarizes the current composer mapping and the in-repository
> corpus. It is not an independent research document.

> Non-diagnostic framing: this page documents how an audiovisual motif is used as a design metaphor.
> It does not diagnose anything and does not claim clinical equivalence.

## Technical summary

Low-depth pitch/phase wobble (clamped).

## Evidence and implementation

- In this project, "evidence-backed" means reported phenomena in the evidence corpus. See the dimension pages and the matrix.
- This node is an artistic and engineering implementation that represents those phenomena metaphorically.
- The default claim level is Artistic. Phenomenon evidence does not validate this effect or its numerical settings.

## Where this motif is used

### Used by dimensions

- Time Dilation (`time_dilation`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/time_dilation.md`: corpus: `docs/references/research/remaining-dimensions.md`

### Used by condition presets

- Depression-related energy and concentration (`depression`): `docs/references/conditions/depression.md`

## Scientific sources (peer-reviewed, from the in-repo corpus)

These sources come from evidence-corpus sections for the dimensions that currently use this motif.

> These papers support the phenomena the dimensions describe. They do not claim that this specific
> node is a biomarker or uniquely correct.

- Sarigiannidis, I., Grillon, C., Ernst, M., Roiser, J. P., & Robinson, O. J. (2020). Anxiety makes time pass quicker while fear has no effect. *Cognition, 197*, 104116. https://doi.org/10.1016/j.cognition.2019.104116
  DOI: https://doi.org/10.1016/j.cognition.2019.104116 (`10.1016/j.cognition.2019.104116`): from `docs/references/research/remaining-dimensions.md`
- Lake, J. I., LaBar, K. S., & Meck, W. H. (2016). Emotional modulation of interval timing and time perception. *Neuroscience & Biobehavioral Reviews, 64*, 403-420. https://doi.org/10.1016/j.neubiorev.2016.03.003
  DOI: https://doi.org/10.1016/j.neubiorev.2016.03.003 (`10.1016/j.neubiorev.2016.03.003`): from `docs/references/research/remaining-dimensions.md`
- Antal, A., et al. (2025). Physiological stress and time perception: A systematic review. Psychoneuroendocrinology. https://doi.org/10.1016/j.psyneuen.2025.106664
  DOI: https://doi.org/10.1016/j.psyneuen.2025.106664 (`10.1016/j.psyneuen.2025.106664`): from `docs/references/research/remaining-dimensions.md`
- Bar-Haim, Y., Kerem, A., Lamy, D., & Zakay, D. (2010). When time slows down: The influence of threat on time perception in anxiety. *Cognition & Emotion, 24*(2), 255-263. https://doi.org/10.1080/02699930903387603
  DOI: https://doi.org/10.1080/02699930903387603 (`10.1080/02699930903387603`): from `docs/references/research/remaining-dimensions.md`
- Stetson, C., Fiesta, M. P., & Eagleman, D. M. (2007). Does time really slow down during a frightening event? *PLOS ONE, 2*(12), e1295. https://doi.org/10.1371/journal.pone.0001295
  DOI: https://doi.org/10.1371/journal.pone.0001295 (`10.1371/journal.pone.0001295`): from `docs/references/research/remaining-dimensions.md`
- Cui, S., et al. (2023). The effect of emotion on time perception: A meta-analysis. *Psychonomic Bulletin & Review.* https://doi.org/10.3758/s13423-022-02148-3
  DOI: https://doi.org/10.3758/s13423-022-02148-3 (`10.3758/s13423-022-02148-3`): from `docs/references/research/remaining-dimensions.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (disable or reduce temporal nodes).
- Keep “Stop Everything” available and the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/references/MAPPING_SUMMARY.md`
- `docs/references/research/initial-dimensions.md`
- `docs/references/research/remaining-dimensions.md`
