# Evidence & Method (inner-echo)

This folder is the project’s **evidence navigation layer**. It exists so the website and repo never have to say “trust us”: every experience dimension and every mapping can be traced to an **in-repo evidence document**.

## What this is / what this is not

- **What this is**: a set of cautious, non-diagnostic **design rationales** for audiovisual metaphors (video/audio motifs) that users can browse and verify.
- **What this is not**: a clinical simulation, a diagnostic tool, or medical advice. This project is an **artistic, educational metaphor**.

## Non-diagnostic disclaimer (required reading)

Inner Echo describes **experience dimensions** (e.g., “Hyperarousal”, “Rumination loop”) as **metaphor targets**, not diagnoses. Any mention of psychological or perceptual phenomena is framed as:

- “consistent with reports of…”
- “a cautious mapping hypothesis…”
- “a design metaphor for…”

Never as “this is what disorder X looks like”.

## Methodology (how evidence is selected and represented)

### Evidence corpus (source of truth)

The only sources we cite in the product are **documents that exist in this repo** under:

- `docs/references/reports/` — long-form research synthesis (includes bibliographies)
- `docs/references/EVIDENCE_MATRIX.md` — condensed mapping matrix
- `docs/references/dimensions/*.md` — one page per experience dimension (short, navigable)
- `docs/REFERENCES_AUDIT.md` — the current “what’s wired by default” inventory (dimension → motifs/nodes → rationale doc)

If a claim is not supported by the corpus above, it must be labeled as an **evidence gap** and kept conservative / off-by-default.

### Evidence strength ratings (High / Medium / Low)

Evidence strength is a **communication tool**, not a clinical certainty score.

- **High**: multiple converging sources within the evidence corpus support the described phenomenon and the mapping is conservative.
- **Medium**: some support exists, but there are plausible alternatives, missing details, or the mapping is more interpretive.
- **Low**: limited discussion in the corpus; treat as fragile and keep subtle.
- **Hypothesis (evidence gap)**: not clearly supported; must be labeled and default-conservative.

### Supported vs Mixed vs Hypothesis (claim labeling)

When we describe a dimension→motif relationship, we label it:

- **Supported**: the corpus explicitly supports the relationship as a plausible metaphor.
- **Mixed**: the corpus supports the phenomenon, but the specific motif choice is partly interpretive.
- **Hypothesis**: the corpus does not support the relationship clearly; kept conservative and clearly marked.

## Safety & ethics notes (product posture)

- Avoid flicker/strobe and sudden loud transients.
- Always provide **Stop Everything**, **Safe Mode**, and **Reduced Motion**.
- Keep modulation smooth; clamp temporal feedback; keep audio under a conservative ceiling.

## Navigation map (canonical files)

- `docs/references/INDEX.md` — quick links to all evidence pages
- `docs/references/EVIDENCE_MATRIX.md` — dimension → motifs → evidence
- `docs/references/CONTRIBUTIONS_AND_LIMITS.md` — limitations, controversies, and what is not supported
- `docs/references/dimensions/*.md` — per-dimension pages with careful summaries and links into the corpus
- `docs/references/conditions/*.md` — per-condition evidence summaries (assembled from dimensions)
- `docs/REFERENCES_AUDIT.md` — “what the product uses by default” inventory
