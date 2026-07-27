# Attention Fragmentation

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: `attention_fragmentation`
- Repository definition: Attention jumps between stimuli; difficulty stabilizing focus.
- Evidence strength: Medium

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: `focus_jitter`, `grain`, `edge_sharpen`
- Audio nodes: `tremolo`, `compressor_limiter`, `highpass`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `focus_jitter` | Small, smoothed focal instability (bounded). | Mixed | Medium | `docs/references/dimensions/attention_fragmentation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/focus_jitter.md` |
| `grain` | Adds fine noise texture (clamped). | Mixed | Medium | `docs/references/dimensions/attention_fragmentation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `edge_sharpen` | Subtle edge enhancement (non-flickering). | Mixed | Medium | `docs/references/dimensions/attention_fragmentation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/edge_sharpen.md` |
| `tremolo` | Slow amplitude modulation (rate/depth clamped). | Mixed | Medium | `docs/references/dimensions/attention_fragmentation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/tremolo.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Mixed | Medium | `docs/references/dimensions/attention_fragmentation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |
| `highpass` | Attenuates low frequencies below cutoff (clamped). | Mixed | Medium | `docs/references/dimensions/attention_fragmentation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/highpass.md` |

## Evidence links (in-repo)

- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

- Use gentle jitter; avoid nausea-inducing motion.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/attention_fragmentation.md`
