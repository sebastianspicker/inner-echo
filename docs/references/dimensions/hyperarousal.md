# Hyperarousal

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation.


The repo defines **hyperarousal** as: **“Elevated baseline alertness, physiological tension, and readiness to react.”** This is commonly discussed in clinical psychophysiology as elevated sympathetic readiness and altered autonomic regulation (e.g., lower vagally mediated HRV in meta-analytic PTSD work) and is also used more broadly in models of insomnia as persistent multi-level arousal (cognitive/emotional/physiological).

**Distinguishing scope (important for mapping):**
- *Hyperarousal vs hypervigilance*: hyperarousal is primarily a **baseline state** of physiological readiness/tension, whereas hypervigilance emphasizes **monitoring/scanning** and attention allocation toward potential cues. (In practice they can co-occur, but they are not identical design targets.) This distinction matches how attention/arousal reviews separate global arousal systems from selective attentional processes.
- *Hyperarousal vs panic peaks*: panic peaks are **episodic surges** that rise/fall; hyperarousal is often **sustained/tonic**. Evidence from PTSD psychophysiology meta-analysis suggests group differences can appear in baseline measures as well as reactivity paradigms, supporting this “tonic vs phasic” distinction as a useful design axis.

**Perceptual correlates suitable for cautious signal metaphors:**
- Autonomic imbalance findings (e.g., lower HRV meta-analyses) are consistent with a **reduced “physiological buffer”** and sustained readiness, which can map metaphorically to reduced dynamic headroom (gentle compression/limiting rather than spikes).
- Arousal can bias attention/perception toward “high-priority” signals (“winner-take-more”), suggesting a modest rationale for metaphors like **slight edge/contrast emphasis** or **salience weighting**—as long as it is bounded and not intense.
- Psychophysiology work highlights that subjective distress and physiological measures can be partially dissociated; for design, this is a caution against “biomarker cosplay” and supports keeping mappings as **optional metaphors** with user control.

markdown
# docs/references/dimensions/hyperarousal.md

## Summary (non-diagnostic)
**Repo definition:** Elevated baseline alertness, physiological tension, and readiness to react.

In *inner-echo*, **hyperarousal** is treated as a **design-relevant experience dimension** that can be reported across many contexts (stress, fear learning, insomnia, trauma exposure). The AV mapping below is a **metaphorical hypothesis**: it proposes that certain bounded changes in audiovisual “gain,” noise floor, and dynamic range can *align with* reported experiences of being tense, on-edge, and reactive—**without claiming clinical equivalence or simulating a disorder**.

**Safety note (repo):** Prefer smooth modulation; avoid flicker; keep audio dynamics gentle.

---

## Definition & scope
Hyperarousal here means a **tonic elevation** in alertness/activation (baseline readiness), often described as:
- bodily tension, startle-readiness, difficulty “downshifting,” and sleep disruption.

**Distinguish from nearby constructs**
- **Hypervigilance:** primarily attentional scanning/monitoring for cues (hyperarousal can exist without active scanning).
- **Panic peaks:** brief, phasic surges of alarm that rise and fall (hyperarousal is more sustained).

**Common measurement instruments (examples)**
- PTSD symptom measures that include arousal/reactivity items:
  - CAPS-5 (structured interview) — DOI: https://doi.org/10.1037/pas0000486 (PMID: 28493729)
  - PCL-5 (self-report) — DOI: https://doi.org/10.1002/jts.22059 (PMID: 26606250)
- Autonomic correlates sometimes used in research (non-diagnostic, group-level): heart-rate variability (HRV) meta-analyses in PTSD.

---

## Empirical & phenomenological evidence (peer-reviewed)
**Evidence highlights**
- PTSD psychophysiology meta-analysis reports group-level differences across baseline and reactivity measures (heart rate, skin conductance, startle paradigms). (Pole, 2007; PMID: 17723027)
- HRV meta-analysis indicates lower HRV in PTSD vs controls, consistent with altered autonomic regulation (Schneider & Schwerdtfeger, 2020; PMID: 32854795; PMCID: PMC7525781).
- Insomnia “hyperarousal model” review synthesizes evidence for increased arousal across physiological, cognitive, and emotional levels in insomnia disorder (Riemann et al., 2010; PMID: 19481481).
- Arousal-biased competition theory suggests arousal amplifies perceptual competition, increasing priority-weighting toward salient/goal-relevant stimuli (Mather & Sutherland, 2011; PMCID: PMC3110019).
- Empirical PTSD treatment work shows changes in trauma-potentiated startle and some autonomic indices across therapy, but also notes possible discordance across measures (Maples-Keller et al., 2019; PMID: 31669786).
- Sensory gating work (paired-click / P50 paradigms) suggests altered filtering of repetitive stimuli in chronic PTSD samples (e.g., older but foundational electrophysiology studies).

**Limitations / counterpoints**
- Many findings are **group-level** and heterogeneous; hyperarousal experiences vary widely within and across populations.
- Physiological indices (e.g., HRV) are **not specific** to any one diagnosis and can be influenced by fitness, medication, sleep, and comorbidity.
- Subjective experience ≠ physiology; avoid “this biomarker means this sensation” translation.

---

## Bridge to perception & signal metaphors (HCI/AV reasoning)
Perception-relevant correlates that may be representable in AV (modestly):
- **Reduced dynamic headroom / readiness-to-react** → metaphor: mild compression/limiting (audio), gently increased baseline “presence.”
- **Priority-weighting toward salient cues** under arousal → metaphor: subtle edge emphasis or salience weighting (video), small spectral tilt (audio).
- **Difficulty downshifting** → metaphor: slower release times, smooth envelopes, persistent low-level tension rather than spikes.

---

## AV mapping hypothesis (video + audio)
### Video motifs (bounded, optional)
- **Fine grain / low-amplitude noise** (clamped): may echo “heightened activation” as a persistent background texture without adding semantic content.
- **Very subtle edge sharpening** (minimal): can metaphorically represent arousal-biased salience weighting; avoid high contrast.
- **Soft vignette (static, faint)**: can reflect narrowed readiness/focus *without* moving tunnels or aggressive contrast.

### Audio motifs (bounded, optional)
- **Gentle compressor/limiter** (slow attack, moderate release): metaphor for reduced dynamic headroom / readiness-to-react; avoids startling peaks.
- **Mild high-shelf / presence tilt** (tiny): metaphor for “on-edge” sensitivity; keep subtle to avoid harshness.
- **Low-level noise bed** (very quiet, broadband or pink): metaphor for persistent activation; should remain below conversational masking levels.

### Safety notes (must-have)
- **Avoid flicker** and rapid luminance pulses; adhere to WCAG flash guidance.
- Provide **Reduced Motion**: replace any modulation with static texture + user-controlled intensity slider.
- Cap audio output, avoid sudden transients; provide “Gentle mode” with stricter limiter and softened high frequencies.

---

## Strength of evidence: HIGH
Rationale: multiple converging reviews/meta-analyses plus widely used measurement instruments support the existence of tonic arousal/ANS alterations and attentional effects of arousal, while still requiring caution about specificity and individual variability.

---

## Bibliography (APA; DOI/PMID + stable links)
- Blevins, C. A., Weathers, F. W., Davis, M. T., Witte, T. K., & Domino, J. L. (2015). The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5): Development and initial psychometric evaluation. *Journal of Traumatic Stress, 28*(6), 489–498. https://doi.org/10.1002/jts.22059 (PMID: 26606250) https://pubmed.ncbi.nlm.nih.gov/26606250/
- Mather, M., & Sutherland, M. R. (2011). Arousal-biased competition in perception and memory. *Perspectives on Psychological Science, 6*(2), 114–133. https://doi.org/10.1177/1745691611400234 (PMCID: PMC3110019) https://pmc.ncbi.nlm.nih.gov/articles/PMC3110019/
- Maples-Keller, J. L., Rauch, S. A. M., Jovanovic, T., et al. (2019). Changes in trauma-potentiated startle, skin conductance, and heart rate within prolonged exposure therapy for PTSD in high and low treatment responders. *Journal of Anxiety Disorders, 68*, 102147. https://doi.org/10.1016/j.janxdis.2019.102147 (PMID: 31669786) https://pubmed.ncbi.nlm.nih.gov/31669786/
- Pole, N. (2007). The psychophysiology of posttraumatic stress disorder: A meta-analysis. *Psychological Bulletin, 133*(5), 725–746. https://doi.org/10.1037/0033-2909.133.5.725 (PMID: 17723027) https://pubmed.ncbi.nlm.nih.gov/17723027/
- Riemann, D., Spiegelhalder, K., Feige, B., et al. (2010). The hyperarousal model of insomnia: A review of the concept and its evidence. *Sleep Medicine Reviews, 14*(1), 19–31. https://doi.org/10.1016/j.smrv.2009.04.002 (PMID: 19481481) https://pubmed.ncbi.nlm.nih.gov/19481481/
- Schneider, M., & Schwerdtfeger, A. (2020). Autonomic dysfunction in posttraumatic stress disorder indexed by heart rate variability: A meta-analysis. *Psychological Medicine, 50*(12), 1937–1948. (PMID: 32854795; PMCID: PMC7525781) https://pubmed.ncbi.nlm.nih.gov/32854795/
- Van Bockstaele, E. J., et al. (2020). The locus coeruleus–norepinephrine system in stress and arousal: New insights from optogenetics and chemogenetics. *Frontiers in Psychiatry*. https://doi.org/10.3389/fpsyt.2020.601519
- (Foundational example) Sensory gating in chronic PTSD: reduced P50 suppression. *Biological Psychiatry* (paired-click paradigm; older foundational electrophysiology). (Example landing page: https://www.biologicalpsychiatryjournal.com/article/S0006-3223(99)00047-5/fulltext)

# Hyperarousal

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation. **Source of truth:** Scientific/ only.

---

## Summary (non-diagnostic)

**Repo definition:** Elevated baseline alertness, physiological tension, and readiness to react.

In *inner-echo*, **hyperarousal** is a design-relevant experience dimension. The AV mapping is a **metaphorical hypothesis** supported by **Scientific/deep-research-report.md**: bounded changes in gain, noise floor, and dynamic range can *align with* reported experiences of being tense and on-edge—**without** claiming clinical equivalence.

**Safety note (from Scientific/):** Prefer smooth modulation; avoid flicker; keep audio dynamics gentle. Provide Reduced Motion; cap audio; no sudden transients.

---

## Definition & scope (from Scientific/)

- **Hyperarousal** = tonic elevation in alertness/activation (baseline readiness): bodily tension, startle-readiness, difficulty “downshifting,” sleep disruption.
- **Distinguish:** Hypervigilance = scanning/monitoring; Panic peaks = phasic surges. Hyperarousal is sustained/tonic.

---

## Supported phenomena & AV mapping (Scientific/)

**Perceptual correlates (from Scientific/):** Reduced dynamic headroom → mild compression/limiting (audio); priority-weighting toward salient cues → subtle edge emphasis (video); difficulty downshifting → slow release, persistent low-level tension.

**Video motifs (supported):** Fine grain (low, clamped), very subtle edge sharpening, soft vignette (static, faint).

**Audio motifs (supported):** Gentle compressor/limiter, mild high-shelf/presence tilt, low-level noise bed (very quiet).

---

## Safety (from Scientific/)

- Avoid flicker and rapid luminance pulses (WCAG).
- Provide Reduced Motion: static texture + intensity slider.
- Cap audio; avoid sudden transients; “Gentle mode” with stricter limiter.

---

## Evidence strength: HIGH

Rationale (Scientific/): Multiple converging reviews/meta-analyses and measurement instruments support tonic arousal/ANS alterations and attentional effects; specificity and individual variability require caution.

---

## Evidence gap

- Scientific/ does not specify exact flash-frequency thresholds; implementation follows WCAG and repo safe_mode_clamps.
- Physiological indices (e.g. HRV) are not specific to any one diagnosis; avoid “biomarker = sensation” claims.
