# `highpass` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Attenuates low frequencies below cutoff (clamped).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to *reported phenomena* in the evidence corpus (see dimension pages and the matrix).
- This node is an **artistic/engineering implementation** used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Attention Fragmentation** (`attention_fragmentation`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/attention_fragmentation.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Hyperarousal** (`hyperarousal`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/hyperarousal.md` — corpus: `docs/references/reports/deep-research-report.md`
- **Hypervigilance** (`hypervigilance`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/hypervigilance.md` — corpus: `docs/references/reports/deep-research-report.md`

### Used by condition presets

- **ADHD (Attention Fragmentation / Overload)** (`adhd`) — `docs/references/conditions/adhd.md`
- **Anxiety (Generalized / Social)** (`anxiety`) — `docs/references/conditions/anxiety.md`
- **Panic Disorder** (`panic`) — `docs/references/conditions/panic.md`
- **Trauma / PTSD (Hyperarousal + Intrusion)** (`trauma_ptsd`) — `docs/references/conditions/trauma_ptsd.md`

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from the **evidence corpus** sections for the dimensions that currently use this motif.

> Important: these papers support the **phenomena** described by the dimensions; they do not claim that this specific node is a biomarker or uniquely “correct”.

_No DOI sources were extracted for the dimensions currently using this motif._

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- `docs/references/EVIDENCE_MATRIX.md`
- `docs/REFERENCES_AUDIT.md`
- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`
