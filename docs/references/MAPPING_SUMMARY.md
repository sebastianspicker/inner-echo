# Dimension, motif, and evidence mapping

This file enumerates the evidence-linked dimension→motif mappings used by the composer.

- Non-diagnostic framing: motifs are metaphorical design choices, not clinical simulations.
- Evidence-bounded: each dimension points to in-repo rationale docs under `docs/references/dimensions/`.
- Experimental: anything marked `hypothesis` should be treated as an evidence gap and kept conservative and off by default.

See also: `docs/references/EVIDENCE_MATRIX.md`.

## Matrix

| Dimension | Evidence | Rationale doc | Video motifs (nodes) | Audio motifs (nodes) |
|---|---|---|---|---|
| Hyperarousal (`hyperarousal`) | high | `docs/references/dimensions/hyperarousal.md` | `grain, edge_sharpen, vignette` | `compressor_limiter, highpass, noise_bed` |
| Hypervigilance (`hypervigilance`) | medium | `docs/references/dimensions/hypervigilance.md` | `vignette, edge_sharpen, grain` | `noise_bed, highpass, compressor_limiter` |
| Panic Peaks (`panic_peaks`) | high | `docs/references/dimensions/panic_peaks.md` | `pulse, vignette, soft_blur, grain` | `pulse_tone, lowpass, compressor_limiter, reverb` |
| Rumination Loop (`rumination_loop`) | high | `docs/references/dimensions/rumination_loop.md` | `feedback_loop, grain, vignette` | `delay, tremolo, lowpass, compressor_limiter` |
| Intrusion (`intrusion`) | medium | `docs/references/dimensions/intrusion.md` | `interference, vignette, grain` | `delay, noise_bed, compressor_limiter` |
| Emotional Numbing (`emotional_numbing`) | medium | `docs/references/dimensions/emotional_numbing.md` | `color_grade, soft_blur, vignette` | `lowpass, noise_bed, reverb, compressor_limiter` |
| Cognitive Fog (`cognitive_fog`) | medium | `docs/references/dimensions/cognitive_fog.md` | `haze, soft_blur, color_grade` | `lowpass, noise_bed, reverb, compressor_limiter` |
| Time Dilation (`time_dilation`) | medium | `docs/references/dimensions/time_dilation.md` | `temporal_smear, pulse, grain` | `flutter, delay, compressor_limiter` |
| Derealization (`derealization`) | medium | `docs/references/dimensions/derealization.md` | `haze, chroma_aberration, temporal_smear, color_grade` | `flutter, lowpass, reverb, compressor_limiter` |
| Depersonalization (`depersonalization`) | medium | `docs/references/dimensions/depersonalization.md` | `vignette, soft_blur, chroma_aberration, color_grade` | `reverb, lowpass, flutter, compressor_limiter` |
| Sensory Overload (`sensory_overload`) | medium | `docs/references/dimensions/sensory_overload.md` | `grain, interference, edge_sharpen, vignette` | `noise_bed, compressor_limiter, lowpass` |
| Attention Fragmentation (`attention_fragmentation`) | medium | `docs/references/dimensions/attention_fragmentation.md` | `focus_jitter, grain, edge_sharpen` | `tremolo, compressor_limiter, highpass` |
| Compulsive Loop (`compulsive_loop`) | high | `docs/references/dimensions/compulsive_loop.md` | `feedback_loop, grid_hint, vignette, grain` | `delay, lowpass, compressor_limiter` |

## Hypotheses / evidence gaps

- None detected from `src/conditions/experience-dimensions.json` and `src/conditions/dimension-to-signal-mapping.json`.