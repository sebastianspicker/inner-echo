# Research notes for initial experience dimensions

## Search strategy and safeguards

This report covers the first three experience dimensions in
`src/content/experience/experience-dimensions.json`: hyperarousal, hypervigilance, and panic_peaks.
The goal is to support metaphorical, non-diagnostic audiovisual (AV) design hypotheses — not to show
"what a condition looks or sounds like," simulate clinical states, or give medical advice.

**Databases and source types.** Evidence came mainly from Europe PMC / PubMed-indexed records, major
peer-reviewed journals and academic publishers (for example *Psychological Bulletin*, *Psychological
Medicine*, *Clinical Psychology Review*, *Neuroscience & Biobehavioral Reviews*), and clinical
guidelines (VA/DoD, RANZCP, WFSBP) where relevant.

**Query method.** For each dimension, searches combined the repo label and its synonyms (for example
"hyperarousal physiological tension," "hypervigilance threat monitoring"), measurement terms ("scale,"
"questionnaire," "PCL-5," "CAPS-5," "PDSS"), review filters ("systematic review," "meta-analysis,"
"guideline"), and perception or attention mechanisms ("attentional bias," "locus coeruleus,"
"arousal-biased competition," "interoception"). Sources were prioritized when they:

- addressed subjective experience or phenomenology, attention changes, sensory gating, or
  interoceptive focus rather than only biomarkers, and
- provided DOIs or PMIDs and stable scholarly landing pages.

**Interpretation rule: evidence → perceptual correlate → metaphor, not depiction.** The bridge is:

- empirical or phenomenological findings suggest perceptual correlates (attentional narrowing,
  "threat capture," elevated autonomic readiness, interoceptive amplification), and
- those correlates are represented with bounded signal metaphors (subtle gain, noise floor, gentle
  compression, cautious vignette),

without claiming clinical equivalence. This matches the broader attention and arousal literature, in
which arousal can bias perceptual competition toward "high-priority" signals, and the neurobiological
reviews linking arousal systems to vigilance and attention.

**Safety-first constraints** (especially for a public repository). Some motifs can trigger discomfort
(photosensitivity, vestibular symptoms, migraine, startle), so:

- Avoid or strictly clamp flashes and flicker, following accessibility standards such as WCAG's
  "Three Flashes or Below Threshold."
- Offer Reduced Motion alternatives and a way to disable non-essential animation, in line with WCAG
  guidance on user control and platform "prefers-reduced-motion" support.
- Treat sudden loud sound or sharp transients as potential startle triggers; the acoustic startle
  response is a rapid defensive reflex to sudden intense stimuli.
- Follow the photosensitivity thresholds discussed in epilepsy safety consensus work (hazard conditions
  involving flash frequency and screen area), and treat them as hard design limits, not nice-to-haves.

## Hyperarousal

The repo defines hyperarousal as: “Elevated baseline alertness, physiological tension, and readiness to react.” This is commonly discussed in clinical psychophysiology as elevated sympathetic readiness and altered autonomic regulation (e.g., lower vagally mediated HRV in meta-analytic PTSD work) and is also used more broadly in models of insomnia as persistent multi-level arousal (cognitive/emotional/physiological).

Distinguishing scope (important for mapping):
- *Hyperarousal vs hypervigilance*: hyperarousal is primarily a baseline state of physiological readiness/tension, whereas hypervigilance emphasizes monitoring/scanning and attention allocation toward potential cues. (In practice they can co-occur, but they are not identical design targets.) This distinction matches how attention/arousal reviews separate global arousal systems from selective attentional processes.
- *Hyperarousal vs panic peaks*: panic peaks are episodic surges that rise/fall; hyperarousal is often sustained/tonic. Evidence from PTSD psychophysiology meta-analysis suggests group differences can appear in baseline measures as well as reactivity paradigms, supporting this “tonic vs phasic” distinction as a useful design axis.

Perceptual correlates suitable for cautious signal metaphors:
- Autonomic imbalance findings (e.g., lower HRV meta-analyses) are consistent with a reduced “physiological buffer” and sustained readiness, which can map metaphorically to reduced dynamic headroom (gentle compression/limiting rather than spikes).
- Arousal can bias attention/perception toward “high-priority” signals (“winner-take-more”), suggesting a modest rationale for metaphors like slight edge/contrast emphasis or salience weighting, provided it remains bounded and restrained.
- Psychophysiology work highlights that subjective distress and physiological measures can be partially dissociated; for design, this is a caution against “biomarker cosplay” and supports keeping mappings as optional metaphors with user control.

```markdown
# docs/references/dimensions/hyperarousal.md

## Summary (non-diagnostic)
Repo definition: Elevated baseline alertness, physiological tension, and readiness to react.

In inner-echo, hyperarousal is treated as a design-relevant experience dimension that can be reported across many contexts (stress, fear learning, insomnia, trauma exposure). The AV mapping below is a metaphorical hypothesis: it proposes that certain bounded changes in audiovisual “gain,” noise floor, and dynamic range can align with reported experiences of being tense, on-edge, and reactive without claiming clinical equivalence or simulating a disorder.

Safety note (repo): Prefer smooth modulation; avoid flicker; keep audio dynamics gentle.

---

## Definition & scope
Hyperarousal here means a tonic elevation in alertness/activation (baseline readiness), often described as:
- bodily tension, startle-readiness, difficulty “downshifting,” and sleep disruption.

Distinguish from nearby constructs
- Hypervigilance: primarily attentional scanning/monitoring for cues (hyperarousal can exist without active scanning).
- Panic peaks: brief, phasic surges of alarm that rise and fall (hyperarousal is more sustained).

Common measurement instruments (examples)
- PTSD symptom measures that include arousal/reactivity items:
 - CAPS-5 (structured interview): DOI: https://doi.org/10.1037/pas0000486 (PMID: 28493729)
 - PCL-5 (self-report): DOI: https://doi.org/10.1002/jts.22059 (PMID: 26606250)
- Autonomic correlates sometimes used in research (non-diagnostic, group-level): heart-rate variability (HRV) meta-analyses in PTSD.

---

## Empirical & phenomenological evidence (peer-reviewed)
Evidence highlights
- PTSD psychophysiology meta-analysis reports group-level differences across baseline and reactivity measures (heart rate, skin conductance, startle paradigms). (Pole, 2007; PMID: 17723027)
- HRV meta-analysis indicates lower HRV in PTSD vs controls, consistent with altered autonomic regulation (Schneider & Schwerdtfeger, 2020; PMID: 32854795; PMCID: PMC7525781).
- Insomnia “hyperarousal model” review synthesizes evidence for increased arousal across physiological, cognitive, and emotional levels in insomnia disorder (Riemann et al., 2010; PMID: 19481481).
- Arousal-biased competition theory suggests arousal amplifies perceptual competition, increasing priority-weighting toward salient/goal-relevant stimuli (Mather & Sutherland, 2011; PMCID: PMC3110019).
- Empirical PTSD treatment work shows changes in trauma-potentiated startle and some autonomic indices across therapy, but also notes possible discordance across measures (Maples-Keller et al., 2019; PMID: 31669786).
- Sensory gating work (paired-click / P50 paradigms) suggests altered filtering of repetitive stimuli in chronic PTSD samples (e.g., older but foundational electrophysiology studies).

Limitations / counterpoints
- Many findings are group-level and heterogeneous; hyperarousal experiences vary widely within and across populations.
- Physiological indices (e.g., HRV) are not specific to any one diagnosis and can be influenced by fitness, medication, sleep, and comorbidity.
- Subjective experience ≠ physiology; avoid “this biomarker means this sensation” translation.

---

## Bridge to perception & signal metaphors (HCI/AV reasoning)
Perception-relevant correlates that may be representable in AV (modestly):
- Reduced dynamic headroom / readiness-to-react → metaphor: mild compression/limiting (audio), gently increased baseline “presence.”
- Priority-weighting toward salient cues under arousal → metaphor: subtle edge emphasis or salience weighting (video), small spectral tilt (audio).
- Difficulty downshifting → metaphor: slower release times, smooth envelopes, persistent low-level tension rather than spikes.

---

## AV mapping hypothesis (video + audio)
### Video motifs (bounded, optional)
- Fine grain / low-amplitude noise (clamped): may echo “heightened activation” as a persistent background texture without adding semantic content.
- Very subtle edge sharpening (minimal): can metaphorically represent arousal-biased salience weighting; avoid high contrast.
- Soft vignette (static, faint): can reflect narrowed readiness/focus without moving tunnels or aggressive contrast.

### Audio motifs (bounded, optional)
- Gentle compressor/limiter (slow attack, moderate release): metaphor for reduced dynamic headroom / readiness-to-react; avoids startling peaks.
- Mild high-shelf / presence tilt (tiny): metaphor for “on-edge” sensitivity; keep subtle to avoid harshness.
- Low-level noise bed (very quiet, broadband or pink): metaphor for persistent activation; should remain below conversational masking levels.

### Safety notes (must-have)
- Avoid flicker and rapid luminance pulses; adhere to WCAG flash guidance.
- Provide Reduced Motion: replace any modulation with static texture + user-controlled intensity slider.
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
```

## Hypervigilance

The repo defines hypervigilance as: “Scanning for threats, narrowed attention, heightened sensitivity to cues.” This aligns with a large threat-attention literature in anxiety and trauma exposure, often operationalized as threat-related attentional bias, and with empirical work that treats hypervigilance as a state that can influence scanning patterns and autonomic arousal (e.g., pupil dilation).

What is strongly supported vs contested (important for design claims):
- Large meta-analytic work finds threat-related attentional bias effects in anxiety on average, but effect sizes are modest and heterogeneity is meaningful (paradigm, stimulus type, sample).
- Eye-tracking meta-analysis suggests small but significant relationships between anxiety/fear symptoms and both early orienting and maintenance on threat, and also explicitly highlights measurement issues and reliability differences between eye tracking and RT-based measures.
- Counterpoints include arguments that the field has faced “crisis”-type concerns about reliability and universality of attentional bias, motivating restrained design language and optionality rather than definitive “this is hypervigilance.”

```markdown
# docs/references/dimensions/hypervigilance.md

## Summary (non-diagnostic)
Repo definition: Scanning for threats, narrowed attention, heightened sensitivity to cues.

In inner-echo, hypervigilance is treated as a metaphorical design target describing moments when attention feels “grabbed” by potential cues, with a tendency to scan and difficulty disengaging. The mapping below does not claim that a visual effect equals a psychological mechanism; it proposes bounded AV motifs that may *align with* documented patterns in attention-bias and hypervigilance research.

Safety note (repo): Avoid jump-scares; use subtle focus narrowing and noise, not sudden spikes.

---

## Definition & scope
Hypervigilance here emphasizes selective attention + monitoring, not merely elevated baseline activation.

Distinguish from nearby constructs
- Hyperarousal: tonic physiological readiness/tension; may occur without scanning.
- Intrusion / rumination loops (other repo dimensions): content-driven re-entry; hypervigilance is more cue-driven monitoring.

Common measurement instruments (examples)
- PTSD symptom measures that include hypervigilance items:
 - CAPS-5: https://doi.org/10.1037/pas0000486 (PMID: 28493729)
 - PCL-5: https://doi.org/10.1002/jts.22059 (PMID: 26606250)
- Brief Hypervigilance Scale (BHS) (self-report):
 - https://doi.org/10.1037/tra0000070 (PMID: 26121174)
- Body Vigilance Scale (BVS) (panic-relevant attentional focus to bodily cues; related construct):
 - https://doi.org/10.1037/0022-006X.65.2.214 (PMID: 9086684)
- Behavioral paradigms used in research (measurement caveats): dot-probe, emotional Stroop, spatial cueing, and increasingly eye-tracking free-viewing tasks.

---

## Empirical & phenomenological evidence (peer-reviewed)
Evidence highlights
- Threat-related attentional bias meta-analysis in anxiety reports a reliable mean effect but with boundary conditions and heterogeneity (Bar-Haim et al., 2007; PMID: 17201568; DOI: https://doi.org/10.1037/0033-2909.133.1.1).
- Integrative review decomposes threat bias into components (facilitated orienting, difficulty disengaging, avoidance) and discusses mechanisms (Cisler & Koster, 2010; PMCID: PMC2814889).
- Eye-tracking systematic review/meta-analysis finds small but significant relations between anxiety/fear symptoms and both reflexive orienting and maintenance on threat, and argues eye-tracking indices can improve psychometrics vs RT measures (Clauss et al., 2022; https://doi.org/10.1016/j.cpr.2022.102142).
- Experimental manipulation study tests a “forward feedback loop”: inducing hypervigilance changes visual scanning and pupil size (autonomic arousal proxy) and self-reported anxiety (Kimble et al., 2014; PMID: 24507631).
- Hypervigilance scale development work supports a brief self-report measure and links to dissociation/betrayal-related constructs in a college sample (Bernstein et al., 2015; PMID: 26121174; https://doi.org/10.1037/tra0000070).
- Body vigilance research in panic disorder shows elevated attention to bodily perturbations and reductions with CBT, highlighting a monitoring component that can be external (threat cues) or internal (interoceptive) (Schmidt et al., 1997; PMID: 9086684).
- Eye-tracking work in trauma/PTSD suggests attentional allocation toward negative information relates to PTSD pathology; attention bias variability may relate to trauma exposure more broadly (Alon et al., 2023; https://doi.org/10.1016/j.janxdis.2023.102715).

Limitations / counterpoints
- Attentional bias is not uniform: some PTSD/anxiety studies report vigilance, some avoidance, some null effects; task reliability has been debated.
- Hypervigilance in everyday language can overgeneralize; design docs should avoid implying that any single AV cue represents a clinical state.

---

## Bridge to perception & signal metaphors (HCI/AV reasoning)
Perception-relevant correlates that may be representable in AV (modestly):
- Threat capture / rapid orienting → metaphor: brief, soft “salience ping” (not a jump-scare), or subtle localized contrast change.
- Difficulty disengaging / sustained monitoring → metaphor: persistent peripheral “edge watchfulness” (low amplitude), or mild sustained noise floor.
- Narrowed attention → metaphor: faint vignette or depth-of-field without moving tunnels, zooms, or aggressive narrowing.
- Autonomic arousal coupling (pupil dilation findings, etc.) → metaphor: gentle brightness “breathing” *only if user-controlled*.

---

## AV mapping hypothesis (video + audio)
### Video motifs (bounded, optional)
- Static, very soft vignette: metaphor for narrowed attention; keep minimal to avoid tunnel effects.
- Subtle edge shimmer (slow, non-flickering): metaphor for “monitoring the periphery”; avoid high-frequency flicker.
- Micro-grain / low-level interference: metaphor for persistent scanning load; keep amplitude low.

### Audio motifs (bounded, optional)
- Gentle noise bed (very quiet): metaphor for background monitoring.
- Mild high-pass tilt (tiny) or presence lift: metaphor for cue sensitivity; clamp to avoid harshness.
- Short, soft “ping” events (rare, user-controlled): metaphor for salience capture; do not startle.

### Safety notes (must-have)
- Avoid jump-scares in both modalities.
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
```

## Panic peaks

The repo defines panic_peaks as: “Sudden waves of intense fear or bodily alarm that rise and fall.” This is strongly consistent with both classic cognitive models (catastrophic misinterpretation of bodily sensations) and modern interoception/anxiety research emphasizing how bodily signals can become the focus of negative appraisal and attention.

Evidence that supports “rise/fall surges” and careful limits:
- PDSS development work supports clinical measurement of panic severity and explicitly ties to panic attack frequency, distress, anticipatory anxiety, avoidance, and impairment. This is compatible with the repository's “peaks” framing while remaining diagnostic in origin.
- CO₂ challenge literature systematically reviews provocation paradigms used to reliably elicit panic attacks in controlled settings, but network meta-analysis shows CO₂ vulnerability is not fully specific to panic disorder. This supports careful wording and non-diagnostic framing.
- Interoception meta-analysis finds anxiety is associated with more negative evaluation and attention to bodily signals (questionnaire measures), supporting “bodily alarm” and body-focused salience as a plausible correlate for AV metaphors like pulse, breath, and constrained dynamic range. Measure overlap and specificity still require caution.
- Qualitative phenomenology (e.g., adolescents’ lived experience) emphasizes overwhelming, engulfing bodily sensations; this supports metaphors that are intense but bounded and user-controlled, rather than chaotic or incapacitating visuals.

```markdown
# docs/references/dimensions/panic_peaks.md

## Summary (non-diagnostic)
Repo definition: Sudden waves of intense fear or bodily alarm that rise and fall.

In inner-echo, panic_peaks is treated as a metaphorical design hypothesis for sudden, time-bounded surges of alarm. The mapping below emphasizes envelope-shaped change (rise → crest → release) rather than shock effects. It does not claim to reproduce panic attacks or depict any diagnosis.

Safety note (repo): Provide strong user control; cap intensity; avoid strobing or harsh audio.

---

## Definition & scope
Panic peaks here emphasize:
- abrupt onset/intensification,
- strong bodily salience (interoceptive alarm),
- and a return toward baseline (minutes-scale “wave” dynamics).

Distinguish from nearby constructs
- Hyperarousal: sustained baseline tension; panic peaks are episodic surges.
- Hypervigilance: scanning for cues; panic peaks can include inward attention (body focus) and catastrophic appraisal.

Common measurement instruments (examples)
- Panic Disorder Severity Scale (PDSS; clinician-rated):
 - https://doi.org/10.1176/ajp.154.11.1571 (multicenter scale; classic paper)
- Self-report adjuncts often used in panic research:
 - anxiety sensitivity measures (AS constructs),
 - body vigilance measures (BVS),
 - interoception questionnaires (research context; interpret cautiously).

---

## Empirical & phenomenological evidence (peer-reviewed)
Evidence highlights
- Cognitive model of panic describes how catastrophic misinterpretation of bodily sensations can escalate a feedback loop into panic (Clark, 1986; PMID: 3741311; https://doi.org/10.1016/0005-7967(86)90011-2).
- PDSS development paper supports structured severity rating of panic disorder symptoms and panic attack-related impairment (Shear et al., 1997; https://doi.org/10.1176/ajp.154.11.1571).
- CO₂ challenge systematic review synthesizes decades of provocation studies; discusses 35% CO₂ protocol and its use for eliciting panic attacks under controlled conditions (Amaral et al., 2013; PMID: 24142095; https://doi.org/10.1590/1516-4446-2012-1045).
- Network meta-analysis indicates CO₂-provoked panic is not fully specific to panic disorder (e.g., also elevated odds in PMDD and SAD), supporting cautious interpretation (Tural & Iosifescu, 2021; PMID: 33250190; https://doi.org/10.1016/j.jpsychires.2020.11.032).
- Review of brain mechanisms links panic attack phenomena to defensive survival circuits (neurobiological framing; use cautiously as metaphor support) (Guan & Cao, 2023/2024; PMID: 37477800; https://doi.org/10.1007/s12264-023-01088-9).
- Interoception questionnaire meta-analysis finds anxiety associates with increased negative evaluation and attention to bodily signals (Clemente et al., 2024; https://doi.org/10.1016/j.neubiorev.2024.105923).
- Qualitative lived-experience work in adolescents describes panic disorder as overwhelming / “drowning in sensations,” supporting design principles of intensity-with-bounds and user control (BMC Psychology, 2022; PMCID: PMC9167912; https://pmc.ncbi.nlm.nih.gov/articles/PMC9167912/).
- Experimental interoceptive learning work suggests fear can generalize to respiratory sensations and safety learning matters (example study; PMID: 26459842).

Limitations / counterpoints
- Panic-like provocation responses are not diagnosis-specific; CO₂ and other challenges can elicit fear responses in multiple groups.
- Interoception questionnaires can overlap with anxiety questionnaires; interpret correlations cautiously.
- Neurobiological models are not “maps” of subjective experience; they only weakly constrain metaphor choices.

---

## Bridge to perception & signal metaphors (HCI/AV reasoning)
Perception-relevant correlates that may be representable in AV (modestly):
- Rapid intensification + release → envelope-based modulation (not flicker).
- Interoceptive salience → low-frequency pulse / breath-like amplitude shape (gentle).
- Catastrophic appraisal loop (model) → rising tension cue that resolves, emphasizing return-to-baseline.

---

## AV mapping hypothesis (video + audio)
### Video motifs (bounded, user-controlled)
- Slow, clamped “pressure swell” (e.g., slight contrast lift + mild peripheral blur that returns): metaphor for rise/fall wave.
- Subtle radial vignette (static) with intensity envelope: metaphor for narrowed field during peak; avoid zoom/tunnel motion.
- Minimal chroma desaturation during crest: metaphor for “alarm mode” salience shift; keep small.

### Audio motifs (bounded, user-controlled)
- Pulse / heartbeat-like transient (soft) or breath-like swell: metaphor for bodily alarm salience; avoid realism and avoid loudness spikes.
- Gentle low-pass sweep up/down: metaphor for “world muffling” during peak; return to baseline.
- Limiter with strict ceiling: prevents startle transients; supports safety.

### Safety notes (must-have)
- No strobing, no rapid zooms; adhere to WCAG flash guidance.
- Provide “Reduced Motion”: replace swell motion with static scene + subtle luminance change (slow).
- Provide “Reduced Intensity”: flatten envelope depth, reduce audio bandwidth shifts, lower noise/pulse.
- Always allow user stop/pause and quick return-to-neutral.

---

## Strength of evidence: HIGH
Rationale: panic surges are extensively studied and measured; multiple reviews and foundational theory exist. However, provocation paradigms and neurobiology are not fully specific, so the design rationale must stay explicitly metaphorical.

---

## Bibliography (APA; DOI/PMID + stable links)
- Amaral, J. M. X., Spadaro, P. T. M., Pereira, V. M., Silva, A. C. O., & Nardi, A. E. (2013). The carbon dioxide challenge test in panic disorder: A systematic review of preclinical and clinical research. *Brazilian Journal of Psychiatry, 35*(3), 318–331. https://doi.org/10.1590/1516-4446-2012-1045 (PMID: 24142095)
- Clark, D. M. (1986). A cognitive approach to panic. *Behaviour Research and Therapy, 24*(4), 461–470. https://doi.org/10.1016/0005-7967(86)90011-2 (PMID: 3741311) https://pubmed.ncbi.nlm.nih.gov/3741311/
- Clemente, R., Murphy, A., & Murphy, J. (2024). The relationship between self-reported interoception and anxiety: A systematic review and meta-analysis. *Neuroscience & Biobehavioral Reviews, 167*, 105923. https://doi.org/10.1016/j.neubiorev.2024.105923
- Guan, X., & Cao, P. (2023/2024). Brain mechanisms underlying panic attack and panic disorder. *Neuroscience Bulletin*. https://doi.org/10.1007/s12264-023-01088-9 (PMID: 37477800) https://pubmed.ncbi.nlm.nih.gov/37477800/
- Shear, M. K., et al. (1997). Multicenter collaborative Panic Disorder Severity Scale. *American Journal of Psychiatry, 154*(11), 1571–1575. https://doi.org/10.1176/ajp.154.11.1571 (PMID: 9356566) https://pubmed.ncbi.nlm.nih.gov/9356566/
- Tural, U., & Iosifescu, D. V. (2021). A systematic review and network meta-analysis of carbon dioxide provocation in psychiatric disorders. *Journal of Psychiatric Research, 143*, 508–515. https://doi.org/10.1016/j.jpsychires.2020.11.032 (PMID: 33250190) https://pubmed.ncbi.nlm.nih.gov/33250190/
- (Qualitative phenomenology) Adolescents’ lived experience of panic disorder: Interpretative phenomenological analysis. *BMC Psychology* (PMCID: PMC9167912) https://pmc.ncbi.nlm.nih.gov/articles/PMC9167912/
- (Example interoceptive learning) Generalization of fear to respiratory sensations. (PMID: 26459842) https://pubmed.ncbi.nlm.nih.gov/26459842/
```
