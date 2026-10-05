# Compulsive Loop

> Generated reference: this page summarizes the current dimension definition, mapping, and
> in-repository corpus. It is not an independent research document.

> Non-diagnostic framing: this page supports design rationale for audiovisual metaphors. It does not
> diagnose or simulate a disorder.

## Summary

- Dimension: `compulsive_loop`
- Repository definition: Urge to repeat actions/mental checks; 'stuckness' in a loop.
- Evidence strength: High

## What the product maps (default motifs)

These are the conservative default-enabled motifs the composer uses when this dimension is selected:

- Video nodes: `feedback_loop`, `vignette`, `grain`
- Audio nodes: `delay`, `lowpass`, `compressor_limiter`

## Motif-by-motif traceability

Each row gives a short technical summary of the implementation, a claim label (Supported, Mixed,
Hypothesis, or Artistic), and in-repository sources you can check.

| Motif (node) | What the implementation does | Mapping claim | Experience evidence | Sources |
|---|---|---|---|---|
| `feedback_loop` | Short afterimage whose persistence lengthens on a slow cycle so the image resurfaces (bounded; reduced-motion disables). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/feedback_loop.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `grain` | Adds fine midtone-weighted grain that re-seeds at a bounded rate (clamped). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `delay` | Short echo with low feedback/mix (clamped). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/delay.md` |
| `lowpass` | Attenuates high frequencies above cutoff, with an optional slow bounded sweep (clamped). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- [Interpretation boundaries and reviewed sources](../research/experience-interpretation.md)
- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> This page deliberately adds no new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must stay true in the product)

- Do not portray as comedic; keep loop cues minimal and controllable.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Artistic: the effect and its parameters are design choices, not clinically validated representations.
- Experience evidence: describes the reported phenomenon only; it does not rate the likelihood that a person sees or hears this effect.
- Supported or Mixed mapping labels require evidence about the mapping itself; phenomenon evidence alone is insufficient.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/compulsive_loop.md`
