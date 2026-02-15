# Panic Peaks

> **Non-diagnostic, metaphor framing:** This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- **Dimension**: `panic_peaks`
- **Definition (repo)**: Sudden waves of intense fear or bodily alarm that rise and fall.
- **Evidence strength (communication label)**: **High**

## What the product maps (default motifs)

These are the conservative *default-enabled* motifs used by the composer when this dimension is selected:

- **Video nodes**: `pulse`, `vignette`, `soft_blur`, `grain`
- **Audio nodes**: `pulse_tone`, `lowpass`, `compressor_limiter`, `reverb`

## Evidence links (in-repo)

- **Matrix row**: `docs/references/EVIDENCE_MATRIX.md`
- **Audit (what’s wired by default)**: `docs/REFERENCES_AUDIT.md`
- **Long-form corpus**:
  - `docs/references/reports/deep-research-report.md`
  - `docs/references/reports/deep-research-report-2.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the report documents above.

## Safety notes (must remain true in the product)

- Provide strong user control; cap intensity; avoid strobing or harsh audio.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- **Supported**: the corpus supports the phenomenon and a conservative mapping is plausible.
- **Mixed**: phenomenon is supported, but the specific motif choice is interpretive.
- **Hypothesis**: evidence gap; keep conservative / off-by-default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/panic_peaks.md`
