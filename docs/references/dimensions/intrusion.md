# Intrusion

> Generated reference: this page summarizes the current dimension definition, mapping, and
> in-repository corpus. It is not an independent research document.

> Non-diagnostic framing: this page supports design rationale for audiovisual metaphors. It does not
> diagnose or simulate a disorder.

## Summary

- Dimension: `intrusion`
- Repository definition: Unwanted thoughts/images/memories pushing into awareness.
- Evidence strength: Medium

## What the product maps (default motifs)

These are the conservative default-enabled motifs the composer uses when this dimension is selected:

- Video nodes: `interference`, `vignette`, `grain`
- Audio nodes: `delay`, `noise_bed`, `compressor_limiter`

## Motif-by-motif traceability

Each row gives a short technical summary of the implementation, a claim label (Supported, Mixed,
Hypothesis, or Artistic), and in-repository sources you can check.

| Motif (node) | What the implementation does | Mapping claim | Experience evidence | Sources |
|---|---|---|---|---|
| `interference` | Slowly drifting soft bands and faint line static with sparse eased micro-bursts (clamped; no strobe). | Artistic | Medium | `docs/references/dimensions/intrusion.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/interference.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | Artistic | Medium | `docs/references/dimensions/intrusion.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `grain` | Adds fine midtone-weighted grain that re-seeds at a bounded rate (clamped). | Artistic | Medium | `docs/references/dimensions/intrusion.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `delay` | Short echo with low feedback/mix (clamped). | Artistic | Medium | `docs/references/dimensions/intrusion.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/delay.md` |
| `noise_bed` | Adds quiet broadband noise floor (clamped). | Artistic | Medium | `docs/references/dimensions/intrusion.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/noise_bed.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Artistic | Medium | `docs/references/dimensions/intrusion.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- [Interpretation boundaries and reviewed sources](../research/experience-interpretation.md)
- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> This page deliberately adds no new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must stay true in the product)

- No graphic content; use abstract interference textures with conservative limits.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Artistic: the effect and its parameters are design choices, not clinically validated representations.
- Experience evidence: describes the reported phenomenon only; it does not rate the likelihood that a person sees or hears this effect.
- Supported or Mixed mapping labels require evidence about the mapping itself; phenomenon evidence alone is insufficient.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/intrusion.md`
