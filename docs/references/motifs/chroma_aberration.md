# `chroma_aberration` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Minor RGB channel offset near edges (very low).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to *reported phenomena* in the evidence corpus (see dimension pages and the matrix).
- This node is an **artistic/engineering implementation** used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Depersonalization** (`depersonalization`) — Evidence (dimension): **Medium** — Claim: **Artistic** — `docs/references/dimensions/depersonalization.md` — corpus: `docs/references/reports/deep-research-report-2.md` — claim sources: `docs/references/CONTRIBUTIONS_AND_LIMITS.md`
- **Derealization** (`derealization`) — Evidence (dimension): **Medium** — Claim: **Artistic** — `docs/references/dimensions/derealization.md` — corpus: `docs/references/reports/deep-research-report-2.md` — claim sources: `docs/references/CONTRIBUTIONS_AND_LIMITS.md`

### Used by condition presets

- **Depersonalization / Derealization** (`dpdr`) — `docs/references/conditions/dpdr.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the **evidence corpus** sections for the dimensions that currently use this motif.

> Important: these papers support the **phenomena** described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

- Horn, M., Fovet, T., Vaiva, G., Thomas, P., Amad, A., & D’Hondt, F. (2020). Emotional response in depersonalization: A systematic review of electrodermal activity studies. *Journal of Affective Disorders.* https://doi.org/10.1016/j.jad.2020.07.064
  DOI: https://doi.org/10.1016/j.jad.2020.07.064 (`10.1016/j.jad.2020.07.064`) — from `docs/references/reports/deep-research-report-2.md`
- Merritt Millman, L. S., Huang, X., Wainipitapong, S., Medford, N., & Pick, S. (2024). Behavioural, autonomic, and neural responsivity in depersonalisation-derealisation disorder: A systematic review of experimental evidence. *Neuroscience & Biobehavioral Reviews.* https://doi.org/10.1016/j.neubiorev.2024.105783
  DOI: https://doi.org/10.1016/j.neubiorev.2024.105783 (`10.1016/j.neubiorev.2024.105783`) — from `docs/references/reports/deep-research-report-2.md`
- Sierra, M., & Berrios, G. E. (2000). The Cambridge Depersonalisation Scale: A new instrument for the measurement of depersonalisation. *Psychiatry Research, 93*(2), 153–164. https://doi.org/10.1016/S0165-1781(00)00100-1
  DOI: https://doi.org/10.1016/S0165-1781(00)00100-1 (`10.1016/S0165-1781(00)00100-1`) — from `docs/references/reports/deep-research-report-2.md`
- Dalenberg, C. J., et al. (2023). The prevalence of depersonalisation and derealisation: A systematic review. *Journal of Trauma & Dissociation.* https://doi.org/10.1080/15299732.2022.2079796
  DOI: https://doi.org/10.1080/15299732.2022.2079796 (`10.1080/15299732.2022.2079796`) — from `docs/references/reports/deep-research-report-2.md`
- BMC Psychiatry (2024). Unraveling the brain dynamics of depersonalization–derealization disorder. *BMC Psychiatry.* https://doi.org/10.1186/s12888-024-06096-1
  DOI: https://doi.org/10.1186/s12888-024-06096-1 (`10.1186/s12888-024-06096-1`) — from `docs/references/reports/deep-research-report-2.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
