# Hyperarousal

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: `hyperarousal`
- Repository definition: Elevated baseline alertness, physiological tension, and readiness to react.
- Evidence strength: High

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: `grain`, `edge_sharpen`, `vignette`
- Audio nodes: `compressor_limiter`, `highpass`, `noise_bed`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `grain` | Adds fine noise texture (clamped). | Mixed | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `edge_sharpen` | Subtle edge enhancement (non-flickering). | Mixed | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/edge_sharpen.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | Mixed | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Mixed | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |
| `highpass` | Attenuates low frequencies below cutoff (clamped). | Mixed | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/highpass.md` |
| `noise_bed` | Adds quiet broadband noise floor (clamped). | Mixed | High | `docs/references/dimensions/hyperarousal.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/noise_bed.md` |

## Evidence links (in-repo)

- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

- Prefer smooth modulation; avoid flicker; keep audio dynamics gentle.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/hyperarousal.md`
