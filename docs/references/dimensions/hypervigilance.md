# Hypervigilance

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation.


The repo defines **hypervigilance** as: **“Scanning for threats, narrowed attention, heightened sensitivity to cues.”** This aligns with a large threat-attention literature in anxiety and trauma exposure, often operationalized as **threat-related attentional bias**, and with empirical work that treats hypervigilance as a state that can influence scanning patterns and autonomic arousal (e.g., pupil dilation).

**What is strongly supported vs contested (important for design claims):**
- Large meta-analytic work finds threat-related attentional bias effects in anxiety on average, but effect sizes are modest and heterogeneity is meaningful (paradigm, stimulus type, sample).
- Eye-tracking meta-analysis suggests small but significant relationships between anxiety/fear symptoms and both early orienting and maintenance on threat, and also explicitly highlights measurement issues and reliability differences between eye tracking and RT-based measures.
- Counterpoints include arguments that the field has faced “crisis”-type concerns about reliability and universality of attentional bias, motivating restrained design language and optionality rather than definitive “this is hypervigilance.”

markdown
# docs/references/dimensions/hypervigilance.md

## Summary (non-diagnostic)
**Repo definition:** Scanning for threats, narrowed attention, heightened sensitivity to cues.

In *inner-echo*, **hypervigilance** is treated as a **metaphorical design target** describing moments when attention feels “grabbed” by potential cues, with a tendency to scan and difficulty disengaging. The mapping below does **not** claim that a visual effect equals a psychological mechanism; it proposes bounded AV motifs that may *align with* documented patterns in attention-bias and hypervigilance research.

**Safety note (repo):** Avoid jump-scares; use subtle focus narrowing and noise, not sudden spikes.

---

## Definition & scope
Hypervigilance here emphasizes **selective attention + monitoring**, not merely elevated baseline activation.

**Distinguish from nearby constructs**
- **Hyperarousal:** tonic physiological readiness/tension; may occur without scanning.
- **Intrusion / rumination loops (other repo dimensions):** content-driven re-entry; hypervigilance is more cue-driven monitoring.

**Common measurement instruments (examples)**
- PTSD symptom measures that include hypervigilance items:
  - CAPS-5 — https://doi.org/10.1037/pas0000486 (PMID: 28493729)
  - PCL-5 — https://doi.org/10.1002/jts.22059 (PMID: 26606250)
- **Brief Hypervigilance Scale (BHS)** (self-report):
  - https://doi.org/10.1037/tra0000070 (PMID: 26121174)
- **Body Vigilance Scale (BVS)** (panic-relevant attentional focus to bodily cues; related construct):
  - https://doi.org/10.1037/0022-006X.65.2.214 (PMID: 9086684)
- Behavioral paradigms used in research (measurement caveats): dot-probe, emotional Stroop, spatial cueing, and increasingly eye-tracking free-viewing tasks.

---

## Empirical & phenomenological evidence (peer-reviewed)
**Evidence highlights**
- Threat-related attentional bias meta-analysis in anxiety reports a reliable mean effect but with boundary conditions and heterogeneity (Bar-Haim et al., 2007; PMID: 17201568; DOI: https://doi.org/10.1037/0033-2909.133.1.1).
- Integrative review decomposes threat bias into components (facilitated orienting, difficulty disengaging, avoidance) and discusses mechanisms (Cisler & Koster, 2010; PMCID: PMC2814889).
- Eye-tracking systematic review/meta-analysis finds small but significant relations between anxiety/fear symptoms and both reflexive orienting and maintenance on threat, and argues eye-tracking indices can improve psychometrics vs RT measures (Clauss et al., 2022; https://doi.org/10.1016/j.cpr.2022.102142).
- Experimental manipulation study tests a “forward feedback loop”: inducing hypervigilance changes visual scanning and pupil size (autonomic arousal proxy) and self-reported anxiety (Kimble et al., 2014; PMID: 24507631).
- Hypervigilance scale development work supports a brief self-report measure and links to dissociation/betrayal-related constructs in a college sample (Bernstein et al., 2015; PMID: 26121174; https://doi.org/10.1037/tra0000070).
- Body vigilance research in panic disorder shows elevated attention to bodily perturbations and reductions with CBT, highlighting a monitoring component that can be external (threat cues) or internal (interoceptive) (Schmidt et al., 1997; PMID: 9086684).
- Eye-tracking work in trauma/PTSD suggests attentional allocation toward negative information relates to PTSD pathology; attention bias variability may relate to trauma exposure more broadly (Alon et al., 2023; https://doi.org/10.1016/j.janxdis.2023.102715).

**Limitations / counterpoints**
- Attentional bias is not uniform: some PTSD/anxiety studies report vigilance, some avoidance, some null effects; task reliability has been debated.
- Hypervigilance in everyday language can overgeneralize; design docs should avoid implying that any single AV cue represents a clinical state.

---

## Bridge to perception & signal metaphors (HCI/AV reasoning)
Perception-relevant correlates that may be representable in AV (modestly):
- **Threat capture / rapid orienting** → metaphor: brief, soft “salience ping” (not a jump-scare), or subtle localized contrast change.
- **Difficulty disengaging / sustained monitoring** → metaphor: persistent peripheral “edge watchfulness” (low amplitude), or mild sustained noise floor.
- **Narrowed attention** → metaphor: faint vignette or depth-of-field *without* moving tunnels, zooms, or aggressive narrowing.
- **Autonomic arousal coupling** (pupil dilation findings, etc.) → metaphor: gentle brightness “breathing” *only if user-controlled*.

---

## AV mapping hypothesis (video + audio)
### Video motifs (bounded, optional)
- **Static, very soft vignette**: metaphor for narrowed attention; keep minimal to avoid tunnel effects.
- **Subtle edge shimmer (slow, non-flickering)**: metaphor for “monitoring the periphery”; avoid high-frequency flicker.
- **Micro-grain / low-level interference**: metaphor for persistent scanning load; keep amplitude low.

### Audio motifs (bounded, optional)
- **Gentle noise bed** (very quiet): metaphor for background monitoring.
- **Mild high-pass tilt** (tiny) or **presence lift**: metaphor for cue sensitivity; clamp to avoid harshness.
- **Short, soft “ping” events** (rare, user-controlled): metaphor for salience capture; do not startle.

### Safety notes (must-have)
- Avoid **jump-scares** in both modalities.
- No sudden amplitude spikes (use limiter).
- Provide a “Reduced Motion / Reduced Surprise” mode: remove pings and use static vignette + lower noise only.

---

## Strength of evidence: MEDIUM
Rationale: substantial review literature supports threat-related attention effects *on average*, but effect sizes and reliability are debated; patterns can include vigilance, maintenance, avoidance, or null results depending on method and sample.

---

## Bibliography (APA; DOI/PMID + stable links)
- Alon, Y., Bar-Haim, Y., Dykan, C. D. G., Suarez-Jiminez, B., Zhu, X., Neria, Y., & Lazarov, A. (2023). Eye-tracking indices of attention allocation and attention bias variability are differently related to trauma exposure and PTSD. *Journal of Anxiety Disorders, 96*, 102715. https://doi.org/10.1016/j.janxdis.2023.102715
- Bar-Haim, Y., Lamy, D., Pergamin, L., Bakermans-Kranenburg, M. J., & van IJzendoorn, M. H. (2007). Threat-related attentional bias in anxious and nonanxious individuals: A meta-analytic study. *Psychological Bulletin, 133*(1), 1–24. https://doi.org/10.1037/0033-2909.133.1.1 (PMID: 17201568) https://pubmed.ncbi.nlm.nih.gov/17201568/
- Bernstein, R. E., Delker, B. C., Knight, J. A., & Freyd, J. J. (2015). Hypervigilance in college students: Associations with betrayal and dissociation and psychometric properties in a Brief Hypervigilance Scale. *Psychological Trauma: Theory, Research, Practice, and Policy, 7*, 448–455. https://doi.org/10.1037/tra0000070 (PMID: 26121174)
- Cisler, J. M., & Koster, E. H. W. (2010). Mechanisms of attentional biases towards threat in anxiety disorders: An integrative review. *Clinical Psychology Review, 30*(2), 203–216. (PMCID: PMC2814889) https://pmc.ncbi.nlm.nih.gov/articles/PMC2814889/
- Clauss, K., Gorday, J. Y., & Bardeen, J. R. (2022). Eye tracking evidence of threat-related attentional bias in anxiety- and fear-related disorders: A systematic review and meta-analysis. *Clinical Psychology Review, 93*, 102142. https://doi.org/10.1016/j.cpr.2022.102142
- Kimble, M. O., et al. (2014). The impact of hypervigilance: Evidence for a forward feedback loop. *Journal of Anxiety Disorders*. (PMID: 24507631) https://pubmed.ncbi.nlm.nih.gov/24507631/
- McNally, R. J. (2019). Attentional bias for threat: Crisis or opportunity? *Clinical Psychology Review*. https://doi.org/10.1016/j.cpr.2018.05.005
- Schmidt, N. B., Lerew, D. R., & Trakowski, J. H. (1997). Body vigilance in panic disorder: Evaluating attention to bodily perturbations. *Journal of Consulting and Clinical Psychology, 65*(2), 214–220. https://doi.org/10.1037/0022-006X.65.2.214 (PMID: 9086684) https://pubmed.ncbi.nlm.nih.gov/9086684/

# Hypervigilance

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation. **Source of truth:** Scientific/ only.

---

## Summary (non-diagnostic)

**Repo definition:** Scanning for threats, narrowed attention, heightened sensitivity to cues.

**Hypervigilance** is treated as a metaphorical design target (attention “grabbed” by cues, tendency to scan, difficulty disengaging). The mapping is supported by **Scientific/deep-research-report.md** and does **not** claim that a visual effect equals a psychological mechanism.

**Safety note (from Scientific/):** Avoid jump-scares; use subtle focus narrowing and noise, not sudden spikes.

---

## Definition & scope (from Scientific/)

- Emphasizes **selective attention + monitoring**, not merely elevated baseline activation.
- **Distinguish:** Hyperarousal = tonic readiness; Intrusion/rumination = content-driven; hypervigilance = cue-driven monitoring.

---

## Supported phenomena & AV mapping (Scientific/)

**Evidence (from Scientific/):** Threat-related attentional bias (meta-analytic support, heterogeneous); narrowed attention; difficulty disengaging; optional autonomic coupling (pupil/arousal).

**Video motifs (supported):** Static soft vignette, subtle edge emphasis (non-flickering), micro-grain.

**Audio motifs (supported):** Quiet noise bed, mild high-pass tilt, compressor_limiter. Optional soft salience “ping” only if rare and user-controlled (do not startle).

---

## Safety (from Scientific/)

- No jump-scares; no sudden amplitude spikes (use limiter).
- Reduced Motion / Reduced Surprise: remove pings; static vignette + lower noise only.
- No fast scanning camera motion (vestibular risk).

---

## Evidence strength: MEDIUM

Rationale (Scientific/): Substantial review literature supports threat-related attention effects on average; effect sizes and reliability are debated; patterns vary (vigilance, maintenance, avoidance, null).

---

## Evidence gap

- Scientific/ does not support “this is what hypervigilance looks like”; design language must stay optional and restrained.
- Exact salience-ping parameters (rate, loudness) are not specified; keep optional and minimal.
