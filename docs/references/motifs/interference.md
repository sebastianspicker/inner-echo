# `interference`: motif evidence

> Generated reference: this page summarizes the current composer mapping and the in-repository
> corpus. It is not an independent research document.

> Non-diagnostic framing: this page documents how an audiovisual motif is used as a design metaphor.
> It does not diagnose anything and does not claim clinical equivalence.

## Technical summary

Slowly drifting soft bands and faint line static with sparse eased micro-bursts (clamped; no strobe).

## Evidence and implementation

- In this project, "evidence-backed" means reported phenomena in the evidence corpus. See the dimension pages and the matrix.
- This node is an artistic and engineering implementation that represents those phenomena metaphorically.
- The default claim level is Artistic. Phenomenon evidence does not validate this effect or its numerical settings.

## Where this motif is used

### Used by dimensions

- Intrusion (`intrusion`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/intrusion.md`: corpus: `docs/references/research/remaining-dimensions.md`
- Sensory Overload (`sensory_overload`): Evidence (dimension): Medium: Claim: Artistic: `docs/references/dimensions/sensory_overload.md`: corpus: `docs/references/research/remaining-dimensions.md`

### Used by condition presets

- OCD-related intrusive thoughts and repetition (`ocd`): `docs/references/conditions/ocd.md`
- PTSD-related experiences (`trauma_ptsd`): `docs/references/conditions/trauma_ptsd.md`

## Scientific sources (peer-reviewed, from the in-repo corpus)

These sources come from evidence-corpus sections for the dimensions that currently use this motif.

> These papers support the phenomena the dimensions describe. They do not claim that this specific
> node is a biomarker or uniquely correct.

- Kuijpers, K. F., et al. (2022). Using a daily diary for monitoring intrusive memories of trauma: A convergent validity study. *International Journal of Methods in Psychiatric Research, 32*(1), e1936. https://doi.org/10.1002/mpr.1936
  DOI: https://doi.org/10.1002/mpr.1936 (`10.1002/mpr.1936`): from `docs/references/research/remaining-dimensions.md`
- Holmes, E. A., & Bourne, C. (2008). Inducing and modulating intrusive emotional memories: A review of the trauma film paradigm. *Acta Psychologica, 127*(3), 553-566. https://doi.org/10.1016/j.actpsy.2007.11.002
  DOI: https://doi.org/10.1016/j.actpsy.2007.11.002 (`10.1016/j.actpsy.2007.11.002`): from `docs/references/research/remaining-dimensions.md`
- Micoulaud-Franchi, J.-A., et al. (2015). Sensory gating in adults with ADHD: Event-evoked potential and perceptual experience reports comparisons with schizophrenia. *Biological Psychology, 106*, 47-56. https://doi.org/10.1016/j.biopsycho.2015.03.002
  DOI: https://doi.org/10.1016/j.biopsycho.2015.03.002 (`10.1016/j.biopsycho.2015.03.002`): from `docs/references/research/remaining-dimensions.md`
- Creamer, M., Bell, R., & Failla, S. (2003). Psychometric properties of the Impact of Event Scale-Revised. *Behaviour Research and Therapy, 41*(12), 1489-1496. https://doi.org/10.1016/j.brat.2003.07.010
  DOI: https://doi.org/10.1016/j.brat.2003.07.010 (`10.1016/j.brat.2003.07.010`): from `docs/references/research/remaining-dimensions.md`
- James, E. L., Lau-Zhu, A., Clark, I. A., Visser, R. M., Hagenaars, M. A., & Holmes, E. A. (2016). The trauma film paradigm as an experimental psychopathology model of psychological trauma: Intrusive memories and beyond. *Clinical Psychology Review, 47*, 106-142. https://doi.org/10.1016/j.cpr.2016.04.010
  DOI: https://doi.org/10.1016/j.cpr.2016.04.010 (`10.1016/j.cpr.2016.04.010`): from `docs/references/research/remaining-dimensions.md`
- van den Boogert, F., Klein, K., Spaan, P., Sizoo, B., Bouman, Y. H. A., Hoogendijk, W. J. G., & Roza, S. J. (2022). Sensory processing difficulties in psychiatric disorders: A meta-analysis. *Journal of Psychiatric Research, 151*, 173-180. https://doi.org/10.1016/j.jpsychires.2022.04.020
  DOI: https://doi.org/10.1016/j.jpsychires.2022.04.020 (`10.1016/j.jpsychires.2022.04.020`): from `docs/references/research/remaining-dimensions.md`
- Holmes, E. A., Brewin, C. R., & Hennessy, R. G. (2004). Trauma films, information processing, and intrusive memory development. *Journal of Experimental Psychology: General, 133*(1), 3-22. https://doi.org/10.1037/0096-3445.133.1.3
  DOI: https://doi.org/10.1037/0096-3445.133.1.3 (`10.1037/0096-3445.133.1.3`): from `docs/references/research/remaining-dimensions.md`
- Brewin, C. R., Gregory, J. D., Lipton, M., & Burgess, N. (2010). Intrusive images in psychological disorders: Characteristics, neural mechanisms, and treatment implications. *Psychological Review, 117*(1), 210-232. https://doi.org/10.1037/a0018113
  DOI: https://doi.org/10.1037/a0018113 (`10.1037/a0018113`): from `docs/references/research/remaining-dimensions.md`
- Kleim, B., Graham, B., Bryant, R. A., & Ehlers, A. (2013). Capturing intrusive re-experiencing in trauma survivors’ daily lives using ecological momentary assessment. *Journal of Abnormal Psychology, 122*(4), 998-1009. https://doi.org/10.1037/a0034957
  DOI: https://doi.org/10.1037/a0034957 (`10.1037/a0034957`): from `docs/references/research/remaining-dimensions.md`
- Kotz, S., et al. (2023). Validation of the Dutch Sensory Gating Inventory (D-SGI): Psychometric properties. *Psychology & Neuroscience / (Taylor & Francis).* https://doi.org/10.1080/23279095.2023.2235453
  DOI: https://doi.org/10.1080/23279095.2023.2235453 (`10.1080/23279095.2023.2235453`): from `docs/references/research/remaining-dimensions.md`
- Brewin, C. R. (2015). Re-experiencing traumatic events in PTSD: New avenues in research on intrusive memories and flashbacks. *European Journal of Psychotraumatology, 6*, 27180. https://doi.org/10.3402/ejpt.v6.27180
  DOI: https://doi.org/10.3402/ejpt.v6.27180 (`10.3402/ejpt.v6.27180`): from `docs/references/research/remaining-dimensions.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (disable or reduce temporal nodes).
- Keep “Stop Everything” available and the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/references/MAPPING_SUMMARY.md`
- `docs/references/research/initial-dimensions.md`
- `docs/references/research/remaining-dimensions.md`
