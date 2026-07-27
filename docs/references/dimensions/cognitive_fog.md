# Cognitive Fog

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: `cognitive_fog`
- Repository definition: Slowed thinking, reduced clarity, difficulty sustaining mental effort.
- Evidence strength: Medium

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: `haze`, `soft_blur`, `color_grade`
- Audio nodes: `lowpass`, `noise_bed`, `reverb`, `compressor_limiter`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `haze` | Adds soft fog/veil (clamped). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/haze.md` |
| `soft_blur` | Applies mild blur to reduce sharp detail (clamped). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/soft_blur.md` |
| `color_grade` | Adjusts saturation/contrast/tonal balance (clamped). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/color_grade.md` |
| `lowpass` | Attenuates high frequencies above cutoff (clamped). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |
| `noise_bed` | Adds quiet broadband noise floor (clamped). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/noise_bed.md` |
| `reverb` | Adds gentle space/decay (clamped). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/reverb.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Mixed | Medium | `docs/references/dimensions/cognitive_fog.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

- Prefer softness and subtle blur; avoid disorienting motion.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/cognitive_fog.md`
