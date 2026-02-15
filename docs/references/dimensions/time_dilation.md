# time_dilation

## Summary (non-diagnostic)
**Repo definition (inner-echo):** “Time feels slowed, accelerated, or uneven.”

**Definition & scope:** Time dilation is the subjective experience that time’s passage is altered (slower, faster, irregular, or “chunked”). Distinguish from:
- **Clock-time beliefs / time perspective:** attitudes toward time, not moment-to-moment distortions.
- **Panic peaks:** may co-occur but is not identical (time changes can happen outside peaks).
- **Derealization:** world feels unreal; time distortion can occur without unreality.

**Common measurement instruments (examples):**
- Passage-of-time judgments; interval estimation/reproduction tasks; temporal bisection tasks.
- Some studies use self-report items about time speed/flow alongside emotion/stress manipulations.

## Evidence highlights
- Reviews synthesize that emotion modulates time perception, with arousal and attention contributing in complex, sometimes opposing ways (review).
- Meta-analytic work indicates emotional valence/arousal can bias time judgments, but effects vary by task and context (meta-analysis).
- Experimental work suggests induced anxiety (threat-of-shock) can lead to *underestimation* of time, highlighting that “time slows” is not universal (primary).
- Threat-related manipulations can alter time perception, consistent with attention/arousal mechanisms (primary).
- Reviews on physiological stress and time perception emphasize heterogeneity and methodological constraints (systematic review).
- Counterpoint: subjective time dilation in frightening situations may reflect memory/retrospective reconstruction rather than increased online perceptual resolution (primary).

## What is NOT supported / limitations (counterpoints)
- There is no single direction of effect (“emotion slows time” is false as a general rule).
- Lab intervals are often short; lived experience is multi-scale and context dependent.
- A literal “slow-motion effect” risks overstating evidence and increasing motion-trigger risk.

## Bridge to perception & signal metaphors (HCI/AV reasoning)
A cautious metaphor is **temporal instability of processing** rather than literal slow motion:
- Variable “beat” / pacing (micro tempo drift) to signal uneven passage.
- Slight temporal echo (clamped) to suggest lingering moments.
- Occasional “skipped” micro-events (careful: can be disorienting).

## Mapping hypothesis (video + audio motifs + safety)
### Video motifs (metaphor hypotheses)
- **Temporal smear / echo (very low, clamped):** a faint afterimage trail suggests lingering time, not a dramatic ghosting effect.
- **Subtle timing jitter in transitions (very low):** small variability in transition easing (not frame-jitter) to imply uneven time flow.
- **Avoid literal slow-mo:** if used at all, keep to extremely small percentage changes and user-controlled.

### Audio motifs (metaphor hypotheses)
- **Flutter/wow (very low depth):** micro-instability in pitch/time can metaphorically match temporal unevenness.
- **Short delay (very low mix):** tiny temporal echo without rhythmic repetition.
- **Limiter/compressor:** prevents sudden shocks and reduces fatigue.

### Safety clamps & Reduced Motion
- Provide Reduced Motion: disable smear/jitter; keep only gentle audio flutter at minimal depth.
- Cap any feedback or smear; forbid flicker and abrupt time skips.
- Offer immediate “stabilize time” toggle (repo safety note).

## Motif consistency check
**Recommended**
- Very low audio flutter + short delay + limiter (aligned with temporal instability and safest).

**Optional**
- Very low temporal smear (can read as derealization if too strong; clamp hard).

**Avoid**
- Strong slow-motion, reverse, stutter edits, or frame skipping (stylish, disorienting, can be triggering).

## Strength of evidence: Medium
Rationale: substantial perception literature with reviews/meta-analyses; direction/magnitude depends on arousal, attention, and context, so AV mapping must remain conservative and testable.

## Bibliography (APA + DOI/PMID + stable links)
- Lake, J. I., LaBar, K. S., & Meck, W. H. (2016). Emotional modulation of interval timing and time perception. *Neuroscience & Biobehavioral Reviews, 64*, 403–420. https://doi.org/10.1016/j.neubiorev.2016.03.003
  DOI: 10.1016/j.neubiorev.2016.03.003
- Cui, S., et al. (2023). The effect of emotion on time perception: A meta-analysis. *Psychonomic Bulletin & Review.* https://doi.org/10.3758/s13423-022-02148-3
  DOI: 10.3758/s13423-022-02148-3
- Sarigiannidis, I., Grillon, C., Ernst, M., Roiser, J. P., & Robinson, O. J. (2020). Anxiety makes time pass quicker while fear has no effect. *Cognition, 197*, 104116. https://doi.org/10.1016/j.cognition.2019.104116
  DOI: 10.1016/j.cognition.2019.104116
- Bar-Haim, Y., Kerem, A., Lamy, D., & Zakay, D. (2010). When time slows down: The influence of threat on time perception in anxiety. *Cognition & Emotion, 24*(2), 255–263. https://doi.org/10.1080/02699930903387603
  DOI: 10.1080/02699930903387603
- Antal, A., et al. (2025). Physiological stress and time perception: A systematic review. *Psychoneuroendocrinology.* https://doi.org/10.1016/j.psyneuen.2025.106664
  DOI: 10.1016/j.psyneuen.2025.106664
- Stetson, C., Fiesta, M. P., & Eagleman, D. M. (2007). Does time really slow down during a frightening event? *PLOS ONE, 2*(12), e1295. https://doi.org/10.1371/journal.pone.0001295
  DOI: 10.1371/journal.pone.0001295

## Repo-ready deliverables
- File: `docs/references/dimensions/time_dilation.md`
- Add row to: `docs/references/EVIDENCE_MATRIX.md`
- Ensure linked from: `docs/references/README.md`

# Time Dilation

> **Non-diagnostic, metaphor framing:** This document supports design hypotheses for audiovisual metaphors. It does not diagnose, and it is not a clinical simulation. **Source of truth:** Scientific/ only.

---

## Summary (non-diagnostic)

**Repo definition:** Time feels slowed, accelerated, or uneven.

**Time dilation** = subjective alteration in time’s passage (slower, faster, irregular, “chunked”). Supported by **Scientific/deep-research-report-2.md**. Distinct from clock-time beliefs, panic peaks, and derealization.

---

## Definition & scope (from Scientific/)

- Emotion modulates time perception; arousal and attention contribute in complex, sometimes opposing ways. No single direction of effect (“emotion slows time” is not a general rule).
- Measurement: passage-of-time judgments; interval estimation/reproduction; temporal bisection.

---

## Supported phenomena & AV mapping (Scientific/)

**Evidence (from Scientific/):** Reviews on emotion and time perception; meta-analytic work on valence/arousal and time judgments (effects vary by task/context); threat-of-shock can lead to *underestimation* of time (“time slows” not universal); threat manipulations alter time perception; counterpoint: frightening situations may reflect retrospective reconstruction rather than online perceptual resolution.

**Video motifs (supported):** Temporal smear/echo (very low, clamped); subtle timing jitter in transitions (very low). Avoid literal slow-mo; if used, minimal and user-controlled.

**Audio motifs (supported):** Flutter/wow (very low depth); short delay (very low mix); compressor_limiter.

---

## Safety (from Scientific/)

- Reduced Motion: disable smear/jitter; keep only gentle audio flutter at minimal depth.
- Cap feedback/smear; forbid flicker and abrupt time skips. Offer “stabilize time” toggle.
- **Avoid:** Strong slow-motion, reverse, stutter edits, frame skipping (disorienting, triggering).

---

## Evidence strength: MEDIUM

Rationale (Scientific/): Substantial time-perception literature with reviews/meta-analyses; direction/magnitude depend on arousal, attention, context—AV mapping must remain conservative.

---

## Evidence gap

- Lab intervals often short; lived experience multi-scale and context-dependent.
- Literal “slow-motion effect” risks overstating evidence and increasing motion-trigger risk.
