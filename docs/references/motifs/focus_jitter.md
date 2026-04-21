# `focus_jitter` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Small, smoothed focal instability (bounded).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to reported phenomena in the evidence corpus (see dimension pages and the matrix).
- This node is an artistic/engineering implementation used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Attention Fragmentation** (`attention_fragmentation`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/attention_fragmentation.md` — corpus: `docs/references/reports/deep-research-report-2.md`

### Used by condition presets

- **ADHD (Attention Fragmentation / Overload)** (`adhd`) — `docs/references/conditions/adhd.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the evidence corpus sections for the dimensions that currently use this motif.

> Important: these papers support the phenomena described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

- Zhao, X., et al. (2020). Impact of chronic stress on attention control: Evidence from attention network task and ERPs. *Neuroscience Bulletin.* https://doi.org/10.1007/s12264-020-00549-9
  DOI: https://doi.org/10.1007/s12264-020-00549-9 (`10.1007/s12264-020-00549-9`) — from `docs/references/reports/deep-research-report-2.md`
- Shi, R., Sharpe, L., & Abbott, M. (2019). A meta-analysis of the relationship between anxiety and attentional control. *Clinical Psychology Review, 72*, 101754. https://doi.org/10.1016/j.cpr.2019.101754
  DOI: https://doi.org/10.1016/j.cpr.2019.101754 (`10.1016/j.cpr.2019.101754`) — from `docs/references/reports/deep-research-report-2.md`
- Ólafsson, R. P., Smári, J., Guðmundsdóttir, F., Ólafsdóttir, G., Harðardóttir, H. L., & Einarsson, S. M. (2011). Self reported attentional control with the Attentional Control Scale: Factor structure and relationship with symptoms of anxiety and depression. *Journal of Anxiety Disorders, 25*(6), 777–782. https://doi.org/10.1016/j.janxdis.2011.03.013
  DOI: https://doi.org/10.1016/j.janxdis.2011.03.013 (`10.1016/j.janxdis.2011.03.013`) — from `docs/references/reports/deep-research-report-2.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
