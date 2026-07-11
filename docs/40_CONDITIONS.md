# Conditions and experience dimensions

Canonical conditions doc. This project uses metaphorical AV presets built from experience dimensions (non-diagnostic). Evidence and rationale live under `docs/references/**` and the deep research reports.

---

## Purpose

Conditions are data-driven presets that define a metaphorical audio-visual overlay. Each condition is built from experience dimensions (e.g. hyperarousal, rumination_loop, derealization). The app does not diagnose or simulate clinical reality; it offers an artistic, educational metaphor.

---

## Source of truth (evidence)

- **`src/conditions/**`** — condition catalog, profiles, and dimension/motif mapping (runtime; treated as a read-only contract).
- **`docs/references/**`** — evidence-backed rationale docs for each dimension (see [references/INDEX.md](references/INDEX.md)) plus [references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md).
- **Deep research reports** — primary citation bundles under [references/reports/](references/reports/).
- **Audit output** — generated mapping overview in [REFERENCES_AUDIT.md](REFERENCES_AUDIT.md) (dimension → default motifs → evidence doc links).

---

## Condition → dimensions (current set)

| Condition | Experience dimensions (evidence-based) |
|-----------|----------------------------------------|
| Anxiety (Generalized / Social) | hyperarousal, hypervigilance, rumination_loop |
| Panic Disorder | panic_peaks, hyperarousal |
| Depressive Disorder | emotional_numbing, cognitive_fog, time_dilation |
| Trauma / PTSD | hyperarousal, hypervigilance, intrusion |
| OCD | rumination_loop, intrusion, compulsive_loop |
| Depersonalization / Derealization | derealization, depersonalization, time_dilation |
| ADHD (Attention Fragmentation / Overload) | attention_fragmentation, sensory_overload, hyperarousal |

Evidence strength (dimension-level) is in [references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md). HIGH/MEDIUM/Low refers to support for the phenomenon in the literature, not to clinical accuracy of the overlay.

---

## Guided setup and composition

The app exposes three user-facing setup modes:

- **Experience dimensions**: the default guided path; select dimensions directly and blend motif suggestions without choosing a diagnosis-labelled profile.
- **Curated collections**: select one contextual condition profile.
- **Combine collections**: an advanced path that blends multiple curated collections with per-collection weights.

Saved-preset schema v2 and shared URL payloads retain the internal wire values `symptom`, `preset`, and `multimorbid` for compatibility. Those implementation terms are not the public labels.

Important framing:

- Composition is a perceptual metaphor of an interaction field — it does not imply clinical causality.
- Default motif suggestions come from evidence-linked mappings in:
  - `src/conditions/dimension-to-signal-mapping.json` (motifs + safety notes)
  - `docs/references/dimensions/*.md` (dimension rationales)
- The composer uses global safety clamps + Safe Mode + Reduced Motion. Strong time-based effects and feedback are capped.

### Nonlinear interaction option

In advanced composition, Interaction Amount introduces a conservative, code-defined interaction matrix that can slightly amplify certain dimension pairs (e.g. `hyperarousal` + `intrusion`). It is always clamped by safety limits.

---

## Authoring conditions

1. Add an entry to `src/conditions/catalog.json` (id, label, description, tags).
2. Create `src/conditions/profiles/<id>.json` with `video_stack`, optional `audio_stack`, `safety`, `ui.controls`. Use only nodes and motifs supported by the Evidence Matrix for the chosen dimensions (or mark as speculative and cap intensity).
3. Run `npm run docs:gen` to regenerate [generated/](generated/README.md) catalog and schema.
4. Validate safety framing and constraints in [30_SAFETY_ETHICS.md](30_SAFETY_ETHICS.md) before shipping.

---

## Evidence alignment

- Every dimension has a rationale doc under `references/dimensions/<id>.md` citing the deep research reports.
- Every profile should use only video/audio nodes that appear in the Evidence Matrix for its dimensions, or be explicitly marked speculative with strong caps.
- **Avoid** (from references): flicker/strobe, sudden loud transients, jump-scares, body distortion, comedic loop portrayal, literal "this is what disorder X looks like."

For a repo-wide overview of dimension→motif→evidence links, see [REFERENCES_AUDIT.md](REFERENCES_AUDIT.md).
