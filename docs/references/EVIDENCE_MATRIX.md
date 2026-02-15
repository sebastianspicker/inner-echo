# Evidence Matrix

This page is a condensed, navigable summary of the evidence corpus under `docs/references/`.

**Non-diagnostic framing:** Everything here is a **metaphor design rationale**, not a clinical model.

**Source of truth:** the evidence corpus in this repo:

- `docs/references/reports/deep-research-report.md`
- `docs/references/reports/deep-research-report-2.md`

---

## Matrix: Dimension → Phenomena → AV motifs → Citations

| Dimension | Supported phenomena (non-diagnostic) | Supported video motifs | Supported audio motifs | Evidence corpus link | Evidence strength |
|-----------|--------------------------------------|------------------------|-------------------------|---------------------|-------------------|
| **hyperarousal** | Tonic elevated alertness; physiological tension; readiness to react; reduced dynamic headroom | grain (low, static), edge_sharpen (subtle), vignette (static, soft) | compressor_limiter, highpass (mild presence), noise_bed (low) | `docs/references/reports/deep-research-report.md` | **High** |
| **hypervigilance** | Scanning/monitoring; narrowed attention; sensitivity to cues; threat-related attentional bias | vignette (static), edge_sharpen (non-flickering), grain (low) | noise_bed (quiet), highpass (mild), compressor_limiter | `docs/references/reports/deep-research-report.md` | **Medium** |
| **panic_peaks** | Sudden waves of fear/bodily alarm; rise–crest–release; interoceptive salience | pulse (clamped, slow envelope), vignette (enveloped), soft_blur (enveloped), grain | pulse_tone (soft), lowpass (sweep), compressor_limiter, reverb (gentle) | `docs/references/reports/deep-research-report.md` | **High** |
| **intrusion** | Involuntary “push-in” thoughts/images; cue-triggered; vividness/“nowness” | interference (micro-bursts, clamped), vignette (brief pulse), grain (micro-burst) | delay (short, low mix), noise_bed (brief swell), compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **rumination_loop** | Sticky repetitive thought; difficulty disengaging; low novelty return | feedback_loop (low feedback), grain, vignette (gentle) | delay (low feedback), tremolo (very low depth), lowpass, compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **High** |
| **emotional_numbing** | Reduced emotional intensity; dampened reward/interest; flattened affective contrast | color_grade (low sat/contrast), soft_blur, vignette | lowpass, noise_bed (very low), reverb, compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **cognitive_fog** | Slowed thinking; reduced clarity; difficulty sustaining mental effort | haze, soft_blur, color_grade (low contrast) | lowpass, noise_bed, reverb, compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **time_dilation** | Time feels slowed/fast/uneven; pacing instability | temporal_smear (very low, clamped), pulse (slow), grain | flutter (low depth), delay (short, low mix), compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **derealization** | World feels distant/unreal/“behind glass”; reduced affective salience | haze, chroma_aberration (very low), temporal_smear (very low), color_grade | flutter, lowpass, reverb (gentle), compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **depersonalization** | Detachment from self/body; reduced agency; observer stance | vignette, soft_blur, chroma_aberration (micro), color_grade | reverb, lowpass, flutter, compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **sensory_overload** | Too much input; difficulty filtering; background becomes foreground | grain, interference (non-strobing), edge_sharpen (optional), vignette | noise_bed (user-mutable), compressor_limiter, lowpass | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **attention_fragmentation** | Unstable focus; attentional shifts; reduced goal-directed control (anxiety/stress) | focus_jitter (high smoothing), grain, edge_sharpen | tremolo (low depth), compressor_limiter, highpass | `docs/references/reports/deep-research-report-2.md` | **Medium** |
| **compulsive_loop** | Urge-driven repetition/checking; difficulty stopping; “need to complete” | feedback_loop (low feedback, high decay), grid_hint (very subtle), vignette, grain | delay (short, low mix), lowpass, compressor_limiter | `docs/references/reports/deep-research-report-2.md` | **High** |

---

## Safety (from Scientific/)

- **Avoid:** flicker/strobe, sudden loud transients, jump-scares, rapid zooms/camera shake, harsh feedback, body distortion, comedic loop portrayal.
- **Provide:** Stop Everything, Safe Mode, Reduced Motion, Calm Mode / instant return to neutral; cap intensity and temporal feedback.
- **Reduced Motion alternatives:** disable temporal_smear, feedback_loop, pulse, focus_jitter; prefer static overlay + intensity slider.

---

## Evidence gaps (Scientific/ silent)

- **Unsupported:** No dimension named “dissociation” in Scientific/; condition “Dissociation” is mapped to derealization + depersonalization + time_dilation (same as DPDR) for consistency.
- **Unsupported claims:** Any statement about “what a disorder looks like,” biomarker equivalence, or diagnostic validity is explicitly not supported; Scientific/ frames all mappings as metaphorical hypotheses.
- **Gaps:** Specific flash-frequency thresholds (WCAG “three flashes or below”) and photosensitivity consensus numbers are referenced in Scientific/ but not restated as exact constants; implementation should follow WCAG and repo safety clamps.
