# `tremolo` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Slow amplitude modulation (rate/depth clamped).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to reported phenomena in the evidence corpus (see dimension pages and the matrix).
- This node is an artistic/engineering implementation used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Attention Fragmentation** (`attention_fragmentation`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/attention_fragmentation.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Rumination Loop** (`rumination_loop`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/rumination_loop.md` — corpus: `docs/references/reports/deep-research-report-2.md`

### Used by condition presets

- **ADHD (Attention Fragmentation / Overload)** (`adhd`) — `docs/references/conditions/adhd.md`
- **Anxiety (Generalized / Social)** (`anxiety`) — `docs/references/conditions/anxiety.md`
- **OCD (Intrusion + Compulsive Loop)** (`ocd`) — `docs/references/conditions/ocd.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the evidence corpus sections for the dimensions that currently use this motif.

> Important: these papers support the phenomena described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

- Zhao, X., et al. (2020). Impact of chronic stress on attention control: Evidence from attention network task and ERPs. *Neuroscience Bulletin.* https://doi.org/10.1007/s12264-020-00549-9
  DOI: https://doi.org/10.1007/s12264-020-00549-9 (`10.1007/s12264-020-00549-9`) — from `docs/references/reports/deep-research-report-2.md`
- Shi, R., Sharpe, L., & Abbott, M. (2019). A meta-analysis of the relationship between anxiety and attentional control. *Clinical Psychology Review, 72*, 101754. https://doi.org/10.1016/j.cpr.2019.101754
  DOI: https://doi.org/10.1016/j.cpr.2019.101754 (`10.1016/j.cpr.2019.101754`) — from `docs/references/reports/deep-research-report-2.md`
- Kovács, L. N., Takacs, Z. K., Tóth, Z., Simon, E., Schmelowszky, Á., & Kökönyei, G. (2020). Rumination in major depressive and bipolar disorder – A meta-analysis. *Journal of Affective Disorders, 276*, 1131–1141. https://doi.org/10.1016/j.jad.2020.07.131
  DOI: https://doi.org/10.1016/j.jad.2020.07.131 (`10.1016/j.jad.2020.07.131`) — from `docs/references/reports/deep-research-report-2.md`
- Ólafsson, R. P., Smári, J., Guðmundsdóttir, F., Ólafsdóttir, G., Harðardóttir, H. L., & Einarsson, S. M. (2011). Self reported attentional control with the Attentional Control Scale: Factor structure and relationship with symptoms of anxiety and depression. *Journal of Anxiety Disorders, 25*(6), 777–782. https://doi.org/10.1016/j.janxdis.2011.03.013
  DOI: https://doi.org/10.1016/j.janxdis.2011.03.013 (`10.1016/j.janxdis.2011.03.013`) — from `docs/references/reports/deep-research-report-2.md`
- Ehring, T., Zetsche, U., Weidacker, K., Wahl, K., Schönfeld, S., & Ehlers, A. (2011). The Perseverative Thinking Questionnaire (PTQ): Validation of a content-independent measure of repetitive negative thinking. *Journal of Behavior Therapy and Experimental Psychiatry, 42*(2), 225–232. https://doi.org/10.1016/j.jbtep.2010.12.003
  DOI: https://doi.org/10.1016/j.jbtep.2010.12.003 (`10.1016/j.jbtep.2010.12.003`) — from `docs/references/reports/deep-research-report-2.md`
- Zhou, H.-X., Zheng, Q., Zhang, H., & Zang, Y.-F. (2020). Rumination and the default mode network: Meta-analysis of brain imaging studies and implications for depression. *NeuroImage, 206*, 116287. https://doi.org/10.1016/j.neuroimage.2019.116287
  DOI: https://doi.org/10.1016/j.neuroimage.2019.116287 (`10.1016/j.neuroimage.2019.116287`) — from `docs/references/reports/deep-research-report-2.md`
- Treynor, W., Gonzalez, R., & Nolen-Hoeksema, S. (2003). Rumination reconsidered: A psychometric analysis. *Cognitive Therapy and Research, 27*, 247–259. https://doi.org/10.1023/A:1023910315561
  DOI: https://doi.org/10.1023/A:1023910315561 (`10.1023/A:1023910315561`) — from `docs/references/reports/deep-research-report-2.md`
- Ehring, T., et al. (2024). Repetitive negative thinking as a transdiagnostic cognitive process. *Nature Reviews Psychology.* https://doi.org/10.1038/s44159-024-00399-6
  DOI: https://doi.org/10.1038/s44159-024-00399-6 (`10.1038/s44159-024-00399-6`) — from `docs/references/reports/deep-research-report-2.md`
- Nolen-Hoeksema, S., Wisco, B. E., & Lyubomirsky, S. (2008). Rethinking rumination. *Perspectives on Psychological Science, 3*(5), 400–424. https://doi.org/10.1111/j.1745-6924.2008.00088.x
  DOI: https://doi.org/10.1111/j.1745-6924.2008.00088.x (`10.1111/j.1745-6924.2008.00088.x`) — from `docs/references/reports/deep-research-report-2.md`

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
