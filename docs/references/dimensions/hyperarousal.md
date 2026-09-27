# Hyperarousal

> Generated reference: this page summarizes the current dimension definition, mapping, and
> in-repository corpus. It is not an independent research document.

> Non-diagnostic framing: this page supports design rationale for audiovisual metaphors. It does not
> diagnose or simulate a disorder.

## Summary

- Dimension: `hyperarousal`
- Repository definition: Elevated baseline alertness, physiological tension, and readiness to react.
- Evidence strength: High

## What the product maps (default motifs)

These are the conservative default-enabled motifs the composer uses when this dimension is selected:

- Video nodes: `grain`, `edge_sharpen`, `vignette`
- Audio nodes: `compressor_limiter`, `highpass`, `noise_bed`

## Motif-by-motif traceability

Each row gives a short technical summary of the implementation, a claim label (Supported, Mixed,
Hypothesis, or Artistic), and in-repository sources you can check.

| Motif (node) | What the implementation does | Mapping claim | Experience evidence | Sources |
|---|---|---|---|---|
| `grain` | Adds fine noise texture (clamped). | Artistic | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `edge_sharpen` | Subtle edge enhancement (non-flickering). | Artistic | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/edge_sharpen.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | Artistic | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Artistic | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |
| `highpass` | Attenuates low frequencies below cutoff (clamped). | Artistic | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/highpass.md` |
| `noise_bed` | Adds quiet broadband noise floor (clamped). | Artistic | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/noise_bed.md` |

## Evidence links (in-repo)

- [Interpretation boundaries and reviewed sources](../research/experience-interpretation.md)
- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> This page deliberately adds no new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must stay true in the product)

- Prefer smooth modulation; avoid flicker; keep audio dynamics gentle.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Artistic: the effect and its parameters are design choices, not clinically validated representations.
- Experience evidence: describes the reported phenomenon only; it does not rate the likelihood that a person sees or hears this effect.
- Supported or Mixed mapping labels require evidence about the mapping itself; phenomenon evidence alone is insufficient.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/hyperarousal.md`
