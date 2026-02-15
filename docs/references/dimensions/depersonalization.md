# depersonalization

## Summary (non-diagnostic)
**Repo definition (inner-echo):** “Feeling detached from the self or body; reduced sense of agency.”

**Definition & scope:** Depersonalization is a felt detachment from one’s self/body (e.g., “observing myself,” reduced ownership, reduced agency). Distinguish from:
- **Derealization:** “world feels unreal/distant.”
- **Emotional numbing:** reduced affective intensity; may co-occur but is distinct.
- **Body image distortion:** depersonalization is not primarily visual body morphing.

**Common measurement instruments (examples):**
- Cambridge Depersonalisation Scale (CDS).
- Dissociative Experiences Scale (DES) and state dissociation measures (CADSS).
- Experimental paradigms probing sense of agency/ownership (research context).

## Evidence highlights
- Scale/phenomenology work highlights depersonalization as a multi-faceted syndrome (self-detachment, agency changes, emotional coloring changes) and supports reliable measurement (psychometrics).
- Systematic reviews synthesize experimental evidence and propose mechanistic models involving affective/cognitive/physiological alterations (review).
- Electrodermal systematic review suggests a pattern of altered emotional responding with arousal features in depersonalization presentations (review).
- Epidemiology reviews show wide prevalence ranges depending on setting and measurement, reinforcing that depersonalization experiences can be transient and not necessarily diagnostic (systematic review).
- Newer neuroscience work explores brain dynamics/network alterations; results remain heterogeneous (primary).

## What is NOT supported / limitations (counterpoints)
- Depersonalization is not well represented by dramatic “body horror” visuals; such portrayals are sensational and unsafe.
- Biomarkers are not specific; reality testing is usually intact.
- The most defensible metaphor is reduced agency/ownership and increased self-observation—not distortion.

## Bridge to perception & signal metaphors (HCI/AV reasoning)
A cautious metaphor is **distance from agency**:
- Slight decoupling between intention and effect (tiny latency).
- Increased “observer mode” (UI layer separation) rather than body distortion.
- Reduced interoceptive/affective salience can be represented by restrained dynamics.

## Mapping hypothesis (video + audio motifs + safety)
### Video motifs (metaphor hypotheses)
- **User-controlled micro-latency in non-critical animations (clamped):** a tiny delay between input and visual confirmation can metaphorically suggest reduced agency—must be optional and never impair usability.
- **Soft vignette + subtle UI layer separation:** suggests “observing self” without depicting body changes.
- **Avoid body distortion:** keep imagery abstract and centered on interface/perceptual distance.

### Audio motifs (metaphor hypotheses)
- **Mild room/reverb + lowpass (gentle):** can make “self voice” feel slightly distant without disorientation.
- **Very low chorus/detune (optional, minimal):** suggests self-distance; keep subtle to avoid dizziness.
- **Limiter/compressor:** reduce startling peaks.

### Safety clamps & Reduced Motion
- Follow repo safety note: no unsettling body distortions; user-controlled; subtle.
- Reduced Motion: keep effects static; disable input-latency metaphor if it risks frustration—replace with gentler grading.

## Motif consistency check
**Recommended**
- Subtle “distance” via mild lowpass + restrained dynamics; optional UI-layer separation (aligns with detachment metaphor, safer).

**Optional**
- Micro-latency (only if UX testing confirms it doesn’t frustrate users).
- Minimal detune (watch vestibular sensitivity).

**Avoid**
- Body morphing, unsettling face/body artifacts, strong spatial audio tricks, fast camera drift (trigger risk; sensational).

## Strength of evidence: Medium
Rationale: strong phenomenology/scales and systematic reviews; mechanistic specificity is limited and AV mapping must be conservative.

## Bibliography (APA + DOI/PMID + stable links)
- Sierra, M., & Berrios, G. E. (2000). The Cambridge Depersonalisation Scale: A new instrument for the measurement of depersonalisation. *Psychiatry Research, 93*(2), 153–164. https://doi.org/10.1016/S0165-1781(00)00100-1
  DOI: 10.1016/S0165-1781(00)00100-1
- Merritt Millman, L. S., Huang, X., Wainipitapong, S., Medford, N., & Pick, S. (2024). Behavioural, autonomic, and neural responsivity in depersonalisation-derealisation disorder: A systematic review of experimental evidence. *Neuroscience & Biobehavioral Reviews.* https://doi.org/10.1016/j.neubiorev.2024.105783
  DOI: 10.1016/j.neubiorev.2024.105783
- Horn, M., et al. (2020). Emotional response in depersonalization: A systematic review of electrodermal activity studies. *Journal of Affective Disorders.* https://doi.org/10.1016/j.jad.2020.07.064
  DOI: 10.1016/j.jad.2020.07.064 | PMID: 32739705 | PubMed: https://pubmed.ncbi.nlm.nih.gov/32739705/
- Dalenberg, C. J., et al. (2023). The prevalence of depersonalisation and derealisation: A systematic review. *Journal of Trauma & Dissociation.* https://doi.org/10.1080/15299732.2022.2079796
  DOI: 10.1080/15299732.2022.2079796 | PMID: 35699456 | PubMed: https://pubmed.ncbi.nlm.nih.gov/35699456/
- BMC Psychiatry (2024). Unraveling the brain dynamics of depersonalization–derealization disorder. *BMC Psychiatry.* https://doi.org/10.1186/s12888-024-06096-1
  DOI: 10.1186/s12888-024-06096-1
- Medford, N., & Sierra, M. (2000s). Understanding and treating depersonalisation disorder. *Advances in Psychiatric Treatment.* https://www.cambridge.org/core/journals/advances-in-psychiatric-treatment/article/understanding-and-treating-depersonalisation-disorder/6216AE06994D1094873145C016CC1F57

## Repo-ready deliverables
- File: `docs/references/dimensions/depersonalization.md`
- Add row to: `docs/references/EVIDENCE_MATRIX.md`
- Ensure linked from: `docs/references/README.md`

# Depersonalization

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation. **Source of truth:** Scientific/ only.

---

## Summary (non-diagnostic)

**Repo definition:** Feeling detached from the self or body; reduced sense of agency.

**Depersonalization** = felt detachment from self/body (e.g. “observing myself,” reduced ownership, reduced agency). Supported by **Scientific/deep-research-report-2.md**. Distinct from derealization (world unreal), emotional numbing (reduced affect), and body image distortion (depersonalization not primarily visual body morphing).

---

## Definition & scope (from Scientific/)

- Cautious metaphor: **distance from agency**—slight decoupling intention/effect (tiny latency); “observer mode” (UI layer separation); restrained dynamics for reduced interoceptive/affective salience.
- Measurement: CDS; DES, CADSS; agency/ownership paradigms (research).

---

## Supported phenomena & AV mapping (Scientific/)

**Evidence (from Scientific/):** Scale/phenomenology (multi-faceted: self-detachment, agency changes, emotional coloring); systematic reviews and mechanistic models; electrodermal patterns; epidemiology (wide prevalence ranges).

**Video motifs (supported):** Soft vignette + subtle UI layer separation; optional micro-latency in non-critical animations (clamped, optional—never impair usability). Avoid body distortion; keep imagery abstract.

**Audio motifs (supported):** Mild room/reverb + lowpass (gentle); very low chorus/detune (optional, minimal); compressor_limiter.

---

## Safety (from Scientific/)

- No unsettling body distortions; user-controlled; subtle. Reduced Motion: keep effects static; disable input-latency metaphor if it risks frustration—replace with gentler grading.
- **Avoid:** Body morphing, unsettling face/body artifacts, strong spatial audio tricks, fast camera drift (trigger risk; sensational).
- Depersonalization is not well represented by dramatic “body horror” visuals.

---

## Evidence strength: MEDIUM

Rationale (Scientific/): Strong phenomenology/scales and systematic reviews; mechanistic specificity limited; AV mapping must be conservative.

---

## Evidence gap

- Biomarkers not specific; reality testing usually intact.
- Most defensible metaphor is reduced agency/ownership and increased self-observation—not distortion.
