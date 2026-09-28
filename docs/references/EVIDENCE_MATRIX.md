# Evidence matrix

This page summarizes the maintained research notes and the current audiovisual motif rationale. It
does not establish diagnostic, clinical, therapeutic, or simulation validity.

The research sources are:

- `docs/references/research/initial-dimensions.md`
- `docs/references/research/remaining-dimensions.md`

## Dimension matrix

| Dimension | Supported phenomena, non-diagnostic | Video motif choices | Audio motif choices | Research source | Strength |
| --- | --- | --- | --- | --- | --- |
| hyperarousal | Tonic elevated alertness; physiological tension; readiness to react | grain, edge_sharpen, vignette | compressor_limiter, highpass, noise_bed | `docs/references/research/initial-dimensions.md` | High |
| hypervigilance | Scanning/monitoring; narrowed attention; sensitivity to cues; threat-related attentional bias | vignette, edge_sharpen, grain | noise_bed, highpass, compressor_limiter | `docs/references/research/initial-dimensions.md` | Medium |
| panic_peaks | Sudden waves of fear/bodily alarm; rise, crest, and release; interoceptive salience | pulse, vignette, soft_blur, grain | lowpass, compressor_limiter, reverb | `docs/references/research/initial-dimensions.md` | High |
| intrusion | Involuntary “push-in” thoughts/images; cue-triggered; vividness/“nowness” | interference, vignette, grain | delay, noise_bed, compressor_limiter | `docs/references/research/remaining-dimensions.md` | Medium |
| rumination_loop | Sticky repetitive thought; difficulty disengaging; low novelty return | feedback_loop, grain, vignette | delay, tremolo, lowpass, compressor_limiter | `docs/references/research/remaining-dimensions.md` | High |
| emotional_numbing | Reduced emotional intensity; dampened reward/interest; reduced emotional responsiveness | color_grade, soft_blur, vignette | lowpass, noise_bed, reverb, compressor_limiter | `docs/references/research/remaining-dimensions.md` | Medium |
| cognitive_fog | Slowed thinking; reduced clarity; difficulty sustaining mental effort | haze, soft_blur, color_grade | lowpass, noise_bed, reverb, compressor_limiter | `docs/references/research/remaining-dimensions.md` | Medium |
| time_dilation | Time feels slowed/fast/uneven; pacing instability | temporal_smear, pulse, grain | flutter, delay, compressor_limiter | `docs/references/research/remaining-dimensions.md` | Medium |
| derealization | World feels distant/unreal/“behind glass”; reduced affective salience | haze, color_grade | lowpass, reverb, compressor_limiter | `docs/references/research/remaining-dimensions.md` | Medium |
| depersonalization | Detachment from self/body; reduced agency; observer stance | vignette, soft_blur, color_grade | reverb, lowpass, compressor_limiter | `docs/references/research/remaining-dimensions.md` | Medium |
| sensory_overload | Too much input; difficulty filtering; background becomes foreground | grain, interference, edge_sharpen, vignette | noise_bed, compressor_limiter, lowpass | `docs/references/research/remaining-dimensions.md` | Medium |
| attention_fragmentation | Unstable focus; attentional shifts; reduced goal-directed control (anxiety/stress) | grain, edge_sharpen | compressor_limiter, highpass | `docs/references/research/remaining-dimensions.md` | Medium |
| compulsive_loop | Urge-driven repetition/checking; difficulty stopping; “need to complete” | feedback_loop, vignette, grain | delay, lowpass, compressor_limiter | `docs/references/research/remaining-dimensions.md` | High |

Evidence strength describes support in this repository's source review for the reported phenomenon.
Visual and audio motifs are artistic or engineering choices; support for the phenomenon does not
validate them. Motif-level labels are maintained in the generated motif pages and `MOTIF_CLAIMS.json`.

See [experience interpretation and reviewed sources](research/experience-interpretation.md) for the
limits of each curated collection. The motif names below describe the current dimension mapping, which
can differ from the curated profiles.

## Safety constraints

- Avoid flicker, strobe, sudden loud transients, jump scares, rapid zoom or shake, harsh feedback,
  body distortion, and stigmatizing loop portrayals.
- Keep Stop Everything, Safe Mode, Reduced Motion, global intensity, and separate sound and microphone
  controls available.
- Bound intensity, temporal feedback, coupling, and audio output through profile, composition, and
  engine policy.
- Reduced Motion policy disables or simplifies registered motion-sensitive nodes; static overlays and
  user-controlled intensity are the preferred substitutes.

---

## Evidence limits

- Group-level literature does not predict an individual's experience.
- Evidence for a phenomenon does not validate a particular audiovisual mapping.
- The current data models derealization and depersonalization as separate experience dimensions and
  uses the `dpdr` curated profile; there is no standalone `dissociation` dimension or curated profile.
- The corpus does not support claims about what a condition looks or sounds like, biomarker
  equivalence, diagnosis, treatment, or mental-state inference.
- Sensory safety depends on the implemented repository clamps and manual evaluation; the research notes
  are not a substitute for current accessibility standards or real-device testing.

See [README.md](README.md) for label definitions, [MAPPING_SUMMARY.md](MAPPING_SUMMARY.md) for the
executable mapping summary, and [../SAFETY.md](../SAFETY.md) for the maintained safety contract.
