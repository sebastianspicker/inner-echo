# `grid_hint` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Subtle grid overlay hint (very low contrast).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to *reported phenomena* in the evidence corpus (see dimension pages and the matrix).
- This node is an **artistic/engineering implementation** used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Compulsive Loop** (`compulsive_loop`) — Evidence (dimension): **High** — Claim: **Artistic** — `docs/references/dimensions/compulsive_loop.md` — corpus: `docs/references/reports/deep-research-report-2.md` — claim sources: `docs/references/CONTRIBUTIONS_AND_LIMITS.md`

### Used by condition presets

- **OCD (Intrusion + Compulsive Loop)** (`ocd`) — `docs/references/conditions/ocd.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the **evidence corpus** sections for the dimensions that currently use this motif.

> Important: these papers support the **phenomena** described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

- Gillan, C. M., Robbins, T. W., Sahakian, B. J., van den Heuvel, O. A., & van Wingen, G. (2016). The role of habit in compulsivity. *European Neuropsychopharmacology, 26*(5), 828–840. https://doi.org/10.1016/j.euroneuro.2015.12.033
  DOI: https://doi.org/10.1016/j.euroneuro.2015.12.033 (`10.1016/j.euroneuro.2015.12.033`) — from `docs/references/reports/deep-research-report-2.md`
- Bandelow, B., et al. (2023). WFSBP guidelines for the pharmacological treatment of anxiety, obsessive–compulsive and posttraumatic stress disorders (Part II: OCD/PTSD). *World Journal of Biological Psychiatry, 24*(2), 118–134. https://doi.org/10.1080/15622975.2022.2086296
  DOI: https://doi.org/10.1080/15622975.2022.2086296 (`10.1080/15622975.2022.2086296`) — from `docs/references/reports/deep-research-report-2.md`
- Gillan, C. M., & Robbins, T. W. (2014). Goal-directed learning and obsessive–compulsive disorder. *Philosophical Transactions of the Royal Society B, 369*(1655), 20130475. https://doi.org/10.1098/rstb.2013.0475
  DOI: https://doi.org/10.1098/rstb.2013.0475 (`10.1098/rstb.2013.0475`) — from `docs/references/reports/deep-research-report-2.md`
- Gillan, C. M., et al. (2011). Disruption in the balance between goal-directed behavior and habit learning in obsessive–compulsive disorder. *American Journal of Psychiatry.* https://doi.org/10.1176/appi.ajp.2011.10071062
  DOI: https://doi.org/10.1176/appi.ajp.2011.10071062 (`10.1176/appi.ajp.2011.10071062`) — from `docs/references/reports/deep-research-report-2.md`
- Vaghi, M. M., et al. (2024). Action sequence learning, habits, and automaticity in obsessive–compulsive disorder. *eLife.* https://doi.org/10.7554/eLife.87346
  DOI: https://doi.org/10.7554/eLife.87346 (`10.7554/eLife.87346`) — from `docs/references/reports/deep-research-report-2.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
