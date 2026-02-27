# Inner Echo — Documentation overview

This repo contains a **privacy-first, client-only** web app: an audio-visual overlay on the webcam feed. Users choose a **Condition** (e.g. tension, dissociation) and the app applies a responsive visual and optional audio **metaphor**. It is an **artistic, educational metaphor**, not a diagnostic or therapy tool.

---

## Documentation structure (canonical)

| Doc | Purpose |
|-----|--------|
| [00_OVERVIEW.md](00_OVERVIEW.md) | This file: navigation and conventions. |
| [10_PRODUCT.md](10_PRODUCT.md) | Product goals, MVP scope, user stories, non-goals. |
| [20_ARCHITECTURE.md](20_ARCHITECTURE.md) | System architecture, data flow, frontend/engine, reliability. |
| [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) | Safety (Stop Everything, Safe Mode, Reduced Motion), ethics, design principles. |
| [40_CONDITIONS.md](40_CONDITIONS.md) | Conditions and experience dimensions; evidence and mapping; links to references. |
| [RELEASE_RC.md](RELEASE_RC.md) | Release-candidate one-pass runbook and tag process. |
| [references/](references/README.md) | Evidence rationale; dimension docs; Evidence Matrix; long-form reports. |
| [generated/](generated/README.md) | Generated catalog and schema (do not edit by hand). |

---

## Source of truth (evidence)

- **docs/references/**: canonical evidence corpus (dimension docs, motif docs, condition summaries, and reports).
- **docs/REFERENCES_AUDIT.md**: current wiring view of what is used by defaults.
- **Conditions data**: runtime data in `src/conditions/`; evidence linkage declared in profile references and dimension mappings.

---

## Conventions

- **Language:** Neutral, non-stigmatizing. Use "suggests", "is consistent with", "may align with" for evidence-based claims.
- **Citations:** Link to repo paths (e.g. `references/dimensions/hyperarousal.md`); no invented external citations.
- **Safety:** Stop Everything, Safe Mode, Reduced Motion, and Audio optional are required. See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md).
