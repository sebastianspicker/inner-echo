# `temporal_smear` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Blends previous frames for persistence/smear (feedback clamped).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to reported phenomena in the evidence corpus (see dimension pages and the matrix).
- This node is an artistic/engineering implementation used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Derealization** (`derealization`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/derealization.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Time Dilation** (`time_dilation`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/time_dilation.md` — corpus: `docs/references/reports/deep-research-report-2.md`

### Used by condition presets

- **Depressive Disorder** (`depression`) — `docs/references/conditions/depression.md`
- **Depersonalization / Derealization** (`dpdr`) — `docs/references/conditions/dpdr.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the evidence corpus sections for the dimensions that currently use this motif.

> Important: these papers support the phenomena described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

- Sarigiannidis, I., Grillon, C., Ernst, M., Roiser, J. P., & Robinson, O. J. (2020). Anxiety makes time pass quicker while fear has no effect. *Cognition, 197*, 104116. https://doi.org/10.1016/j.cognition.2019.104116
  DOI: https://doi.org/10.1016/j.cognition.2019.104116 (`10.1016/j.cognition.2019.104116`) — from `docs/references/reports/deep-research-report-2.md`
- Horn, M., Fovet, T., Vaiva, G., Thomas, P., Amad, A., & D’Hondt, F. (2020). Emotional response in depersonalization: A systematic review of electrodermal activity studies. *Journal of Affective Disorders.* https://doi.org/10.1016/j.jad.2020.07.064
  DOI: https://doi.org/10.1016/j.jad.2020.07.064 (`10.1016/j.jad.2020.07.064`) — from `docs/references/reports/deep-research-report-2.md`
- Lake, J. I., LaBar, K. S., & Meck, W. H. (2016). Emotional modulation of interval timing and time perception. *Neuroscience & Biobehavioral Reviews, 64*, 403–420. https://doi.org/10.1016/j.neubiorev.2016.03.003
  DOI: https://doi.org/10.1016/j.neubiorev.2016.03.003 (`10.1016/j.neubiorev.2016.03.003`) — from `docs/references/reports/deep-research-report-2.md`
- Merritt Millman, L. S., Huang, X., Wainipitapong, S., Medford, N., & Pick, S. (2024). Behavioural, autonomic, and neural responsivity in depersonalisation-derealisation disorder: A systematic review of experimental evidence. *Neuroscience & Biobehavioral Reviews.* https://doi.org/10.1016/j.neubiorev.2024.105783
  DOI: https://doi.org/10.1016/j.neubiorev.2024.105783 (`10.1016/j.neubiorev.2024.105783`) — from `docs/references/reports/deep-research-report-2.md`
- Antal, A., et al. (2025). Physiological stress and time perception: A systematic review. *Psychoneuroendocrinology.* https://doi.org/10.1016/j.psyneuen.2025.106664
  DOI: https://doi.org/10.1016/j.psyneuen.2025.106664 (`10.1016/j.psyneuen.2025.106664`) — from `docs/references/reports/deep-research-report-2.md`
- Sierra, M., & Berrios, G. E. (2000). The Cambridge Depersonalisation Scale: A new instrument for the measurement of depersonalisation. *Psychiatry Research, 93*(2), 153–164. https://doi.org/10.1016/S0165-1781(00)00100-1
  DOI: https://doi.org/10.1016/S0165-1781(00)00100-1 (`10.1016/S0165-1781(00)00100-1`) — from `docs/references/reports/deep-research-report-2.md`
- Bar-Haim, Y., Kerem, A., Lamy, D., & Zakay, D. (2010). When time slows down: The influence of threat on time perception in anxiety. *Cognition & Emotion, 24*(2), 255–263. https://doi.org/10.1080/02699930903387603
  DOI: https://doi.org/10.1080/02699930903387603 (`10.1080/02699930903387603`) — from `docs/references/reports/deep-research-report-2.md`
- Dalenberg, C. J., et al. (2023). The prevalence of depersonalisation and derealisation: A systematic review. *Journal of Trauma & Dissociation.* https://doi.org/10.1080/15299732.2022.2079796
  DOI: https://doi.org/10.1080/15299732.2022.2079796 (`10.1080/15299732.2022.2079796`) — from `docs/references/reports/deep-research-report-2.md`
- BMC Psychiatry (2024). Unraveling the brain dynamics of depersonalization–derealization disorder. *BMC Psychiatry.* https://doi.org/10.1186/s12888-024-06096-1
  DOI: https://doi.org/10.1186/s12888-024-06096-1 (`10.1186/s12888-024-06096-1`) — from `docs/references/reports/deep-research-report-2.md`
- Stetson, C., Fiesta, M. P., & Eagleman, D. M. (2007). Does time really slow down during a frightening event? *PLOS ONE, 2*(12), e1295. https://doi.org/10.1371/journal.pone.0001295
  DOI: https://doi.org/10.1371/journal.pone.0001295 (`10.1371/journal.pone.0001295`) — from `docs/references/reports/deep-research-report-2.md`
- Cui, S., et al. (2023). The effect of emotion on time perception: A meta-analysis. *Psychonomic Bulletin & Review.* https://doi.org/10.3758/s13423-022-02148-3
  DOI: https://doi.org/10.3758/s13423-022-02148-3 (`10.3758/s13423-022-02148-3`) — from `docs/references/reports/deep-research-report-2.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
