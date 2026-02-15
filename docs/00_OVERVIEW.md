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
| [references/](references/README.md) | Evidence rationale; dimension docs; Evidence Matrix. Scientific/ is the single source of truth. |
| [generated/](generated/README.md) | Generated catalog and schema (do not edit by hand). |

Root: **[AGENTS.md](../AGENTS.md)** — contributor standards, glossary, Definition of Done, how to add a Condition.

---

## Source of truth (evidence)

- **Scientific/** (repo root): sole authoritative source for evidence. All dimension rationales and AV motif mappings are supported by `Scientific/` or explicitly labeled "Evidence gap". See [Scientific/INVENTORY.md](../Scientific/INVENTORY.md).
- **docs/references/**: derived dimension docs, Evidence Matrix, Evidence gaps. Every claim traces to Scientific/ or is marked as unsubstantiated.
- **Conditions data**: runtime data in `src/conditions/`; canonical evidence-aligned snapshot in `docs/scientific/src/conditions/`. See [src/conditions/EVIDENCE_STAND.md](../src/conditions/EVIDENCE_STAND.md).

---

## Conventions

- **Language:** Neutral, non-stigmatizing. Use "suggests", "is consistent with", "may align with" for evidence-based claims.
- **Citations:** Link to repo paths (e.g. `references/dimensions/hyperarousal.md`) or Scientific/; no invented external citations.
- **Safety:** Stop Everything, Safe Mode, Reduced Motion, and Audio optional are required. See [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md).
