# `pulse_tone` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Adds a soft tone pulse (level clamped).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to *reported phenomena* in the evidence corpus (see dimension pages and the matrix).
- This node is an **artistic/engineering implementation** used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Panic Peaks** (`panic_peaks`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/panic_peaks.md` — corpus: `docs/references/reports/deep-research-report.md`

### Used by condition presets

- **Panic Disorder** (`panic`) — `docs/references/conditions/panic.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the **evidence corpus** sections for the dimensions that currently use this motif.

> Important: these papers support the **phenomena** described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

- Guan, X., & Cao, P. (2023/2024). Brain mechanisms underlying panic attack and panic disorder. *Neuroscience Bulletin*. https://doi.org/10.1007/s12264-023-01088-9 (PMID: 37477800) https://pubmed.ncbi.nlm.nih.gov/37477800/
  DOI: https://doi.org/10.1007/s12264-023-01088-9 (`10.1007/s12264-023-01088-9`) — from `docs/references/reports/deep-research-report.md`
- Clark, D. M. (1986). A cognitive approach to panic. *Behaviour Research and Therapy, 24*(4), 461–470. https://doi.org/10.1016/0005-7967(86)90011-2 (PMID: 3741311) https://pubmed.ncbi.nlm.nih.gov/3741311/
  DOI: https://doi.org/10.1016/0005-7967(86)90011-2 (`10.1016/0005-7967(86)90011-2`) — from `docs/references/reports/deep-research-report.md`
- Tural, U., & Iosifescu, D. V. (2021). A systematic review and network meta-analysis of carbon dioxide provocation in psychiatric disorders. *Journal of Psychiatric Research, 143*, 508–515. https://doi.org/10.1016/j.jpsychires.2020.11.032 (PMID: 33250190) https://pubmed.ncbi.nlm.nih.gov/33250190/
  DOI: https://doi.org/10.1016/j.jpsychires.2020.11.032 (`10.1016/j.jpsychires.2020.11.032`) — from `docs/references/reports/deep-research-report.md`
- Clemente, R., Murphy, A., & Murphy, J. (2024). The relationship between self-reported interoception and anxiety: A systematic review and meta-analysis. *Neuroscience & Biobehavioral Reviews, 167*, 105923. https://doi.org/10.1016/j.neubiorev.2024.105923
  DOI: https://doi.org/10.1016/j.neubiorev.2024.105923 (`10.1016/j.neubiorev.2024.105923`) — from `docs/references/reports/deep-research-report.md`
- Shear, M. K., et al. (1997). Multicenter collaborative Panic Disorder Severity Scale. *American Journal of Psychiatry, 154*(11), 1571–1575. https://doi.org/10.1176/ajp.154.11.1571 (PMID: 9356566) https://pubmed.ncbi.nlm.nih.gov/9356566/
  DOI: https://doi.org/10.1176/ajp.154.11.1571 (`10.1176/ajp.154.11.1571`) — from `docs/references/reports/deep-research-report.md`
- Amaral, J. M. X., Spadaro, P. T. M., Pereira, V. M., Silva, A. C. O., & Nardi, A. E. (2013). The carbon dioxide challenge test in panic disorder: A systematic review of preclinical and clinical research. *Brazilian Journal of Psychiatry, 35*(3), 318–331. https://doi.org/10.1590/1516-4446-2012-1045 (PMID: 24142095)
  DOI: https://doi.org/10.1590/1516-4446-2012-1045 (`10.1590/1516-4446-2012-1045`) — from `docs/references/reports/deep-research-report.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
