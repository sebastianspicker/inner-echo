# Panic Peaks

> Generated reference: this page summarizes the current dimension definition,
> mapping, and in-repository corpus. It is not an independent research document.

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: `panic_peaks`
- Repository definition: Sudden waves of intense fear or bodily alarm that rise and fall.
- Evidence strength: High

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: `pulse`, `vignette`, `soft_blur`, `grain`
- Audio nodes: `pulse_tone`, `lowpass`, `compressor_limiter`, `reverb`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `pulse` | Slow, bounded envelope modulation (no strobe). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/pulse.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `soft_blur` | Applies mild blur to reduce sharp detail (clamped). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/soft_blur.md` |
| `grain` | Adds fine noise texture (clamped). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `pulse_tone` | Adds a soft tone pulse (level clamped). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/pulse_tone.md` |
| `lowpass` | Attenuates high frequencies above cutoff (clamped). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |
| `reverb` | Adds gentle space/decay (clamped). | Mixed | High | `docs/references/dimensions/panic_peaks.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/reverb.md` |

## Evidence links (in-repo)

- Matrix row: `docs/references/EVIDENCE_MATRIX.md`
- Current mapping: `docs/references/MAPPING_SUMMARY.md`
- Long-form corpus:
  - `docs/references/research/initial-dimensions.md`
  - `docs/references/research/remaining-dimensions.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

- Provide strong user control; cap intensity; avoid strobing or harsh audio.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/panic_peaks.md`
