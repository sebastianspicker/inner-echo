# Compulsive Loop

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: `compulsive_loop`
- Repository definition: Urge to repeat actions/mental checks; 'stuckness' in a loop.
- Evidence strength: High

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: `feedback_loop`, `grid_hint`, `vignette`, `grain`
- Audio nodes: `delay`, `lowpass`, `compressor_limiter`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `feedback_loop` | Low-feedback image recurrence (bounded; reduced-motion disables). | Mixed | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/feedback_loop.md` |
| `grid_hint` | Subtle grid overlay hint (very low contrast). | Artistic | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grid_hint.md`, `docs/references/CONTRIBUTIONS_AND_LIMITS.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | Mixed | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `grain` | Adds fine noise texture (clamped). | Mixed | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `delay` | Short echo with low feedback/mix (clamped). | Mixed | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/delay.md` |
| `lowpass` | Attenuates high frequencies above cutoff (clamped). | Mixed | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Mixed | High | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

- Do not portray as comedic; keep loop cues minimal and controllable.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/compulsive_loop.md`
