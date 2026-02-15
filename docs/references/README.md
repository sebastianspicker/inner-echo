# References (Evidence Rationale)

This folder links peer-reviewed sources used to justify **non-diagnostic, metaphorical** AV mappings for inner-echo.

Generated on 2026-02-15.

# References (Evidence Rationale)

**Single source of truth:** All evidence and rationale for experience dimensions and AV metaphor mappings come from the folder **`Scientific/`** at the repo root. No external or uncited claims are used.

- **Scientific/INVENTORY.md** — Lists each Scientific file, topic, dimensions covered, key claims, and safety notes.
- **Scientific/BIBLIOGRAPHY.md** — Clean list of DOIs/PMIDs/URLs as present in Scientific/.
- **EVIDENCE_MATRIX.md** — Dimension → phenomena → video/audio motifs → Scientific file citation; evidence strength (High/Medium/Low) from Scientific/ only.

---

## What this folder is for

This directory holds **derived** dimension rationale documents (`dimensions/*.md`) that align with Scientific/. Each dimension doc:

- States only what **Scientific/** supports.
- Cites the Scientific file(s) that support it (e.g. `Scientific/deep-research-report.md`).
- Includes an **Evidence gap** section where Scientific/ is silent.
- Keeps the project **non-diagnostic** (metaphor framing, not clinical simulation or medical advice).

---

## Safety (from Scientific/)

- Avoid flicker/strobe, sudden loud transients, jump-scares, nausea-inducing motion.
- Provide Stop Everything, Safe Mode, Reduced Motion, and quick return to neutral.
- Hard clamps on intensity, temporal feedback, and audio ceiling; see AGENTS.md and profile `safe_mode_clamps`.

---

## File layout

| Path | Purpose |
|------|--------|
| `Scientific/` | Authoritative references only (deep-research-report.md, deep-research-report-2.md, INVENTORY.md, BIBLIOGRAPHY.md) |
| `docs/references/EVIDENCE_MATRIX.md` | Evidence matrix from Scientific/ |
| `docs/references/dimensions/<id>.md` | Per-dimension rationale (supported by Scientific/) |
| `docs/references/INDEX.md` | Index of dimension docs |
| `docs/references/reports/` | Archived reports; **not** used as source of truth (Scientific/ is) |
| `docs/references/CHANGELOG_SCIENTIFIC_ALIGNMENT.md` | What changed and why (Scientific file citations) |
| `docs/references/EVIDENCE_GAPS.md` | Remaining evidence gaps (Scientific/ silent) |

---

## Citation rule

Every claim in dimension docs and in `experience-dimensions.json` / `dimension-to-signal-mapping.json` must be traceable to a specific file in **Scientific/**. If Scientific/ does not support a claim, it is marked **Unsupported** or **Needs evidence**.
