# sensory_overload

## Summary (non-diagnostic)
**Repo definition (inner-echo):** “Too much input at once; difficulty filtering sensory signals.”

**Definition & scope:** Sensory overload is the experience of being overwhelmed by concurrent sensory input, often described as difficulty filtering, over-inclusion, distractibility, and discomfort with ordinary stimuli. Distinguish from:
- **Hypervigilance:** threat-focused scan/monitoring vs “too much input.”
- **Attention fragmentation:** jumping focus vs “flooding” by input volume/intensity.
- **Misophonia/phonophobia:** stimulus-specific aversion (overload can be broader).

**Common measurement instruments (examples):**
- Adolescent/Adult Sensory Profile (AASP) patterns (sensitivity/avoiding/low registration).
- Sensory Gating Inventory (SGI) and related short/translated versions (subjective gating difficulties).
- Psychophysiology paradigms (e.g., P50 suppression) as lab correlates of filtering (not a subjective measure by itself).

## Evidence highlights
- A meta-analysis of psychiatric disorders using AASP finds a broad, transdiagnostic pattern of sensory processing difficulties, including elevated sensory sensitivity and sensory avoiding (meta-analysis).
- A primary study in adults with ADHD links self-reported perceptual inundation (SGI) with a neurophysiological sensory gating measure (P50 suppression) and explicitly describes “flooded with sensory stimuli” experiences (primary).
- Validation work supports SGI as a subjective measure of gating-related perceptual anomalies (psychometrics).
- Cross-cultural validation of SGI variants supports measurement portability but also indicates that subjective gating is multi-dimensional (psychometrics).

## What is NOT supported / limitations (counterpoints)
- Sensory overload is not reducible to one biomarker; P50 and self-report are correlated in some contexts but not a diagnostic signature.
- Overload is context-dependent (fatigue, stress, environment); designs should prioritize controllability.
- Representing overload with “harsh intensity” is unsafe and ethically misaligned.

## Bridge to perception & signal metaphors (HCI/AV reasoning)
Design-relevant correlates that can be metaphorically represented:
- Increased “channels” competing at once (density/over-inclusion).
- Reduced filtering (background becomes foreground).
- Stress-modulated intensity (small increases feel large).

Metaphor should emphasize **crowding** and **loss of filtering**, not violence or chaos.

## Mapping hypothesis (video + audio motifs + safety)
### Video motifs (metaphor hypotheses)
- **Controlled increase in layer density (low):** add subtle additional textures rather than brighter flashes.
- **Edge sharpen (very subtle, optional):** can hint at “too sharp/too much detail,” but risks irritation—use cautiously.
- **Grain/noise (low) + slight contrast lift clamp:** conveys “too much signal,” but avoid harshness.

### Audio motifs (metaphor hypotheses)
- **Broadband noise bed (very low) with user-controlled mute:** suggests background becoming intrusive.
- **Compressor/limiter (strong safety):** prevents painful peaks and metaphorically flattens dynamic range under overload.
- **Avoid harsh highpass/white noise by default:** if used, clamp and provide instant “calm” preset.

### Safety clamps & Reduced Motion
- Follow repo safety note: never default to harsh intensity; provide quick calming toggles.
- Reduced Motion: keep “overload” represented via static layering, not motion.
- Provide instant “Calm Mode” (lowpass + remove extra layers).

## Motif consistency check
**Recommended**
- Layer density increase + strong limiter + quick calm toggle (best matches “too much at once” without triggers).

**Optional**
- Very subtle edge sharpen (can read as “irritating sharpness,” but may also be “stylish”).

**Avoid**
- Loud noise, strobing layers, rapid jitter, or aggressive EQ boosts (high trigger risk; not ethically aligned).

## Strength of evidence: Medium
Rationale: meta-analytic and empirical support for transdiagnostic sensory processing difficulties and subjective overload constructs; direct mapping from these to AV parameters is inferential and must be safety-tested.

## Bibliography (APA + DOI/PMID + stable links)
- van den Boogert, F., Klein, K., Spaan, P., Sizoo, B., Bouman, Y. H. A., Hoogendijk, W. J. G., & Roza, S. J. (2022). Sensory processing difficulties in psychiatric disorders: A meta-analysis. *Journal of Psychiatric Research, 151*, 173–180. https://doi.org/10.1016/j.jpsychires.2022.04.020
  DOI: 10.1016/j.jpsychires.2022.04.020
- Micoulaud-Franchi, J.-A., et al. (2015). Sensory gating in adults with ADHD: Event-evoked potential and perceptual experience reports comparisons with schizophrenia. *Biological Psychology, 106*, 47–56. https://doi.org/10.1016/j.biopsycho.2015.03.002
  DOI: 10.1016/j.biopsycho.2015.03.002
- Kotz, S., et al. (2023). Validation of the Dutch Sensory Gating Inventory (D-SGI): Psychometric properties. *Psychology & Neuroscience / (Taylor & Francis).* https://doi.org/10.1080/23279095.2023.2235453
  DOI: 10.1080/23279095.2023.2235453
- Hetrick, W. P., Erickson, M. A., & Smith, D. A. (2012). The Sensory Gating Inventory: A self-report measure of sensory filtering experiences. (Original scale paper; use publisher/PubMed for definitive metadata.)
- (OCD-related sensory over-responsivity) Sensory over-responsivity and obsessive-compulsive disorder: Measuring and conceptual links. *Journal of Psychiatric Research.* https://www.sciencedirect.com/science/article/pii/S0022395622001194
  Stable link: ScienceDirect publisher page.

## Repo-ready deliverables
- File: `docs/references/dimensions/sensory_overload.md`
- Add row to: `docs/references/EVIDENCE_MATRIX.md`
- Ensure linked from: `docs/references/README.md`

# Sensory Overload

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation. **Source of truth:** Scientific/ only.

---

## Summary (non-diagnostic)

**Repo definition:** Too much input at once; difficulty filtering sensory signals.

**Sensory overload** = experience of being overwhelmed by concurrent sensory input (difficulty filtering, over-inclusion, distractibility). Supported by **Scientific/deep-research-report-2.md**. Distinct from hypervigilance (threat-focused), attention fragmentation (jumping focus), and stimulus-specific aversion (e.g. misophonia).

---

## Definition & scope (from Scientific/)

- Design correlates: increased “channels” competing; reduced filtering (background becomes foreground); stress-modulated intensity. Metaphor = **crowding** and **loss of filtering**, not violence or chaos.
- Measurement: AASP (sensitivity/avoiding/low registration); Sensory Gating Inventory (SGI); P50 suppression (lab correlate, not subjective).

---

## Supported phenomena & AV mapping (Scientific/)

**Evidence (from Scientific/):** Meta-analysis of psychiatric disorders (AASP)—transdiagnostic sensory processing difficulties; primary study (ADHD + SGI + P50) “flooded with sensory stimuli”; SGI validation; cross-cultural SGI variants.

**Video motifs (supported):** Controlled increase in layer density (low); grain (low) + slight contrast lift clamp; edge sharpen (very subtle, optional).

**Audio motifs (supported):** Broadband noise bed (very low, user-controlled mute); compressor_limiter (strong safety). Avoid harsh highpass/white noise by default; if used, clamp and provide instant “calm” preset.

---

## Safety (from Scientific/)

- Never default to harsh intensity; provide quick calming toggles. Reduced Motion: represent “overload” via static layering, not motion. Instant “Calm Mode” (lowpass + remove extra layers).
- **Avoid:** Loud noise, strobing layers, rapid jitter, aggressive EQ boosts (high trigger risk; not ethically aligned).
- Sensory overload is not one biomarker; P50 and self-report correlate in some contexts only.

---

## Evidence strength: MEDIUM

Rationale (Scientific/): Meta-analytic and empirical support for transdiagnostic sensory processing difficulties and subjective overload; direct mapping to AV parameters inferential; must be safety-tested.

---

## Evidence gap

- Overload is context-dependent (fatigue, stress, environment); designs should prioritize controllability.
- Representing overload with “harsh intensity” is unsafe and ethically misaligned.
