# Cognitive Fog

> Generated reference: this page summarizes the current dimension definition, mapping, and
> in-repository corpus. It is not an independent research document.

> Non-diagnostic framing: this page supports design rationale for audiovisual metaphors. It does not
> diagnose or simulate a disorder.

## Summary

- Dimension: `cognitive_fog`
- Repository definition: Slowed thinking, reduced clarity, difficulty sustaining mental effort.
- Evidence strength: Medium

## What the product maps (default motifs)

These are the conservative default-enabled motifs the composer uses when this dimension is selected:

- Video nodes: `haze`, `soft_blur`, `color_grade`
- Audio nodes: `lowpass`, `noise_bed`, `reverb`, `compressor_limiter`

## Motif-by-motif traceability

Each row gives a short technical summary of the implementation, a claim label (Supported, Mixed,
Hypothesis, or Artistic), and in-repository sources you can check.

| Motif (node) | What the implementation does | Mapping claim | Experience evidence | Sources |
|---|---|---|---|---|
| `haze` | Adds soft fog/veil (clamped). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/haze.md` |
| `soft_blur` | Applies mild blur to reduce sharp detail (clamped). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/soft_blur.md` |
| `color_grade` | Adjusts saturation/contrast/tonal balance (clamped). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/color_grade.md` |
| `lowpass` | Attenuates high frequencies above cutoff (clamped). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |
| `noise_bed` | Adds quiet broadband noise floor (clamped). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/noise_bed.md` |
| `reverb` | Adds gentle space/decay (clamped). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/reverb.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Artistic | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- [Interpretation boundaries and reviewed sources](../research/experience-interpretation.md)
- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> This page deliberately adds no new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must stay true in the product)

- Prefer softness and subtle blur; avoid disorienting motion.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Artistic: the effect and its parameters are design choices, not clinically validated representations.
- Experience evidence: describes the reported phenomenon only; it does not rate the likelihood that a person sees or hears this effect.
- Supported or Mixed mapping labels require evidence about the mapping itself; phenomenon evidence alone is insufficient.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/cognitive_fog.md`
