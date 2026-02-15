# Compulsive Loop

> **Non-diagnostic, metaphor framing:** This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- **Dimension**: `compulsive_loop`
- **Definition (repo)**: Urge to repeat actions/mental checks; 'stuckness' in a loop.
- **Evidence strength (communication label)**: **High**

## What the product maps (default motifs)

These are the conservative *default-enabled* motifs used by the composer when this dimension is selected:

- **Video nodes**: `feedback_loop`, `grid_hint`, `vignette`, `grain`
- **Audio nodes**: `delay`, `lowpass`, `compressor_limiter`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a **short technical summary** (what the simulation does)
- a **claim label** (Supported / Mixed / Hypothesis / Artistic)
- **sources** (in-repo) so readers can verify

| Motif (node) | What it does in the simulation | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `feedback_loop` | Low-feedback image recurrence (bounded; reduced-motion disables). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/feedback_loop.md` |
| `grid_hint` | Subtle grid overlay hint (very low contrast). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grid_hint.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `grain` | Adds fine noise texture (clamped). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `delay` | Short echo with low feedback/mix (clamped). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/delay.md` |
| `lowpass` | Attenuates high frequencies above cutoff (clamped). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | **Mixed** | **High** | `docs/references/dimensions/compulsive_loop.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |

## Evidence links (in-repo)

- **Matrix row**: `docs/references/EVIDENCE_MATRIX.md`
- **Audit (what’s wired by default)**: `docs/REFERENCES_AUDIT.md`
- **Long-form corpus**:
  - `docs/references/reports/deep-research-report.md`
  - `docs/references/reports/deep-research-report-2.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the report documents above.

## Safety notes (must remain true in the product)

- Do not portray as comedic; keep loop cues minimal and controllable.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- **Supported**: the corpus supports the phenomenon and a conservative mapping is plausible.
- **Mixed**: phenomenon is supported, but the specific motif choice is interpretive.
- **Hypothesis**: evidence gap; keep conservative / off-by-default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/compulsive_loop.md`
