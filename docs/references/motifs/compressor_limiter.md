# `compressor_limiter` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

Reduces peaks and smooths dynamics (safety-first).

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to *reported phenomena* in the evidence corpus (see dimension pages and the matrix).
- This node is an **artistic/engineering implementation** used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

- **Attention Fragmentation** (`attention_fragmentation`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/attention_fragmentation.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Cognitive Fog** (`cognitive_fog`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/cognitive_fog.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Compulsive Loop** (`compulsive_loop`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/compulsive_loop.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Depersonalization** (`depersonalization`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/depersonalization.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Derealization** (`derealization`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/derealization.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Emotional Numbing** (`emotional_numbing`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/emotional_numbing.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Hyperarousal** (`hyperarousal`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/hyperarousal.md` — corpus: `docs/references/reports/deep-research-report.md`
- **Hypervigilance** (`hypervigilance`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/hypervigilance.md` — corpus: `docs/references/reports/deep-research-report.md`
- **Intrusion** (`intrusion`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/intrusion.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Panic Peaks** (`panic_peaks`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/panic_peaks.md` — corpus: `docs/references/reports/deep-research-report.md`
- **Rumination Loop** (`rumination_loop`) — Evidence (dimension): **High** — Claim: **Mixed** — `docs/references/dimensions/rumination_loop.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Sensory Overload** (`sensory_overload`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/sensory_overload.md` — corpus: `docs/references/reports/deep-research-report-2.md`
- **Time Dilation** (`time_dilation`) — Evidence (dimension): **Medium** — Claim: **Mixed** — `docs/references/dimensions/time_dilation.md` — corpus: `docs/references/reports/deep-research-report-2.md`

### Used by condition presets

- **ADHD (Attention Fragmentation / Overload)** (`adhd`) — `docs/references/conditions/adhd.md`
- **Anxiety (Generalized / Social)** (`anxiety`) — `docs/references/conditions/anxiety.md`
- **Depressive Disorder** (`depression`) — `docs/references/conditions/depression.md`
- **Depersonalization / Derealization** (`dpdr`) — `docs/references/conditions/dpdr.md`
- **OCD (Intrusion + Compulsive Loop)** (`ocd`) — `docs/references/conditions/ocd.md`
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
