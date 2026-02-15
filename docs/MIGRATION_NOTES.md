# Migration notes — Documentation merge (2026-02-15)

After the documentation merge, use the canonical docs below. Redundant and unused files have been removed; the archive folder used during cleanup has been deleted.

---

## Where to find what (canonical)

| Topic | Use this | Replaces / merges |
|-------|----------|-------------------|
| **Product goals, scope, MVP** | [docs/10_PRODUCT.md](10_PRODUCT.md) | PRD.md, MVP.md (merged); USER_STORIES.md (summary in 10_PRODUCT). |
| **Architecture, data flow, frontend** | [docs/20_ARCHITECTURE.md](20_ARCHITECTURE.md) | ARCHITECTURE.md, FRONTEND.md (merged). Root ARCHITECTURE.md is a pointer to 20_ARCHITECTURE. |
| **Safety, ethics, design principles** | [docs/30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) | DESIGN.md (ethics/safety parts merged). |
| **Conditions, dimensions, evidence** | [docs/40_CONDITIONS.md](40_CONDITIONS.md) + [references/](references/README.md) + [Scientific/](../Scientific/INVENTORY.md) | Single entry point for conditions; details in references and Scientific/. |
| **Doc overview and navigation** | [docs/00_OVERVIEW.md](00_OVERVIEW.md) | — |
| **Contributor standards, glossary, how to add Condition** | Root [AGENTS.md](../AGENTS.md) | Canonical; docs/AGENTS.md was removed as duplicate. |
| **Evidence matrix, dimension rationale** | [references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md), [references/dimensions/](references/INDEX.md) | — |
| **Evidence gaps** | [references/EVIDENCE_GAPS.md](references/EVIDENCE_GAPS.md) | — |
| **Reliability, browser, WebGL fallback** | [docs/RELIABILITY.md](RELIABILITY.md) | — |
| **Security, privacy** | [docs/SECURITY.md](SECURITY.md) | — |
| **Generated catalog/schema** | [docs/generated/](generated/README.md) | — |

---

## Files removed during cleanup

| File | Reason |
|------|--------|
| docs/AGENTS.md | Duplicate of root AGENTS.md; root is canonical. |
| docs/PLANS.md | Stub only ("Not populated in Phase 0"). |
| docs/PRODUCT_SENSE.md | Stub only. |
| docs/QUALITY_SCORE.md | Stub only. |
| docs/PHASE_01_TESTING.md, PHASE_02_TESTING.md, PHASE_06_*, PHASE_08_*, PHASE_09_*, PHASE_12_* | Phase implementation notes; behaviour covered by 20_ARCHITECTURE and RELIABILITY. |
| docs/design-docs/index.md (or design-docs/ folder) | Content in 20_ARCHITECTURE and conditions docs; referenced old Phase 5. |
| docs/scientific/docs/ (subtree) | Duplicate of docs/references and reports; canonical is Scientific/ + docs/references/. |
| docs/_archive/ | Temporary archive folder used during cleanup; deleted. |

---

## Files kept in place

- **PRD.md, MVP.md, USER_STORIES.md, DESIGN.md** (in docs/ or root as applicable) — Reference; canonical product/safety content is in 10_PRODUCT and 30_SAFETY_ETHICS.
- **docs/ARCHITECTURE.md, docs/FRONTEND.md** — Reference; canonical merged version is 20_ARCHITECTURE.
- **docs/references/reports/** — Original deep research; Scientific/ is the canonical evidence source.
- **docs/generated/** — Generated; do not edit by hand.
- **Scientific/** — Single source of truth for evidence.
- **src/conditions/README.md, EVIDENCE.md, MAPPING.md, EVIDENCE_STAND.md** — Canonical for the conditions folder.
