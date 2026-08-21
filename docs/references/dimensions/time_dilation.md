# Time Dilation

> Generated reference: this page summarizes the current dimension definition,
> mapping, and in-repository corpus. It is not an independent research document.

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: `time_dilation`
- Repository definition: Time feels slowed, accelerated, or uneven.
- Evidence strength: Medium

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: `temporal_smear`, `pulse`, `grain`
- Audio nodes: `flutter`, `delay`, `compressor_limiter`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `temporal_smear` | Blends previous frames for persistence/smear (feedback clamped). | Mixed | Medium | `docs/references/dimensions/time_dilation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/temporal_smear.md` |
| `pulse` | Slow, bounded envelope modulation (no strobe). | Mixed | Medium | `docs/references/dimensions/time_dilation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/pulse.md` |
| `grain` | Adds fine noise texture (clamped). | Mixed | Medium | `docs/references/dimensions/time_dilation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `flutter` | Low-depth pitch/phase wobble (clamped). | Mixed | Medium | `docs/references/dimensions/time_dilation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/flutter.md` |
| `delay` | Short echo with low feedback/mix (clamped). | Mixed | Medium | `docs/references/dimensions/time_dilation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/delay.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Mixed | Medium | `docs/references/dimensions/time_dilation.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

- Offer Reduced Motion; cap temporal feedback effects.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/time_dilation.md`
