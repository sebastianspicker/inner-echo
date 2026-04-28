# Sensory Overload

> **Non-diagnostic, metaphor framing:** This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- **Dimension**: `sensory_overload`
- **Definition (repo)**: Too much input at once; difficulty filtering sensory signals.
- **Evidence strength (communication label)**: **Medium**

## What the product maps (default motifs)

These are the conservative *default-enabled* motifs used by the composer when this dimension is selected:

- **Video nodes**: `grain`, `interference`, `edge_sharpen`, `vignette`
- **Audio nodes**: `noise_bed`, `compressor_limiter`, `lowpass`

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a **short technical summary** (what the simulation does)
- a **claim label** (Supported / Mixed / Hypothesis / Artistic)
- **sources** (in-repo) so readers can verify

| Motif (node) | What it does in the simulation | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
| `grain` | Adds fine noise texture (clamped). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/grain.md` |
| `interference` | Adds gentle distortion artifacts (clamped; no strobe). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/interference.md` |
| `edge_sharpen` | Subtle edge enhancement (non-flickering). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/edge_sharpen.md` |
| `vignette` | Darkens edges to narrow the frame (static or gently modulated). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/vignette.md` |
| `noise_bed` | Adds quiet broadband noise floor (clamped). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/noise_bed.md` |
| `compressor_limiter` | Reduces peaks and smooths dynamics (safety-first). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/compressor_limiter.md` |
| `lowpass` | Attenuates high frequencies above cutoff (clamped). | **Mixed** | **Medium** | `docs/references/dimensions/sensory_overload.md`, `docs/references/EVIDENCE_MATRIX.md`, `docs/references/motifs/lowpass.md` |

## Evidence links (in-repo)

- **Matrix row**: `docs/references/EVIDENCE_MATRIX.md`
- **Audit (what’s wired by default)**: `docs/REFERENCES_AUDIT.md`
- **Long-form corpus**:
  - `docs/references/reports/deep-research-report.md`
  - `docs/references/reports/deep-research-report-2.md`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the report documents above.

## Safety notes (must remain true in the product)

- Never default to harsh intensity; provide quick calming toggles.
- Hard limits: no flicker/strobe; no sudden loud transients; keep effects user-controlled; provide Reduced Motion and Safe Mode.

## Claim labeling

- **Supported**: the corpus supports the phenomenon and a conservative mapping is plausible.
- **Mixed**: phenomenon is supported, but the specific motif choice is interpretive.
- **Hypothesis**: evidence gap; keep conservative / off-by-default.

## Rationale doc path (self-reference)

- `docs/references/dimensions/sensory_overload.md`
