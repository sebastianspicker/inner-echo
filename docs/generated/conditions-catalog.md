# Conditions catalog

<!-- Source: scripts/docs/gen-docs.ts. Edit the source contracts, then run npm run docs:gen. -->

Summary of all conditions and their profiles (id, label, tags, safety, nodes).

## Table

| id | label | tags | safety (intensity max) | nodes |
|----|-------|------|------------------------|-------|
| adhd | ADHD (Attention Fragmentation / Overload) | attention_fragmentation, hyperarousal, sensory_overload | 0.65 | color_grade, compressor_limiter, edge_sharpen, focus_jitter, highpass, lowpass, noise_bed, salience_competition, tremolo |
| anxiety | Anxiety (Generalized / Social) | hyperarousal, hypervigilance, rumination_loop, tension | 0.65 | color_grade, compressor_limiter, edge_sharpen, gaze_tunnel, grain, highpass, noise_bed, tremolo |
| depression | Depressive Disorder | cognitive_fog, emotional_numbing, time_dilation | 0.7 | color_grade, compressor_limiter, flutter, grain, haze, lowpass, noise_bed, reverb, soft_blur, temporal_smear |
| dpdr | Depersonalization / Derealization | depersonalization, derealization, time_dilation | 0.58 | color_grade, compressor_limiter, delay, flutter, glass_veil, haze, lowpass, reverb |
| none | None (Clean) | baseline | 0 | - |
| ocd | OCD (Intrusion + Compulsive Loop) | compulsive_loop, intrusion, rumination_loop | 0.66 | compressor_limiter, delay, feedback_loop, grid_hint, lowpass, tremolo, vignette |
| panic | Panic Disorder | hyperarousal, panic_peaks | 0.6 | color_grade, compressor_limiter, lowpass, noise_bed, pulse_tone, reverb, somatic_pulse |
| trauma_ptsd | Trauma / PTSD (Hyperarousal + Intrusion) | hyperarousal, hypervigilance, intrusion | 0.62 | color_grade, compressor_limiter, delay, edge_sharpen, grain, highpass, intrusion_burst, noise_bed |

## Per-condition details

### ADHD (Attention Fragmentation / Overload) (`adhd`)

Metaphor of focus instability and sensory competition (comfort-first, Reduced Motion friendly).

Warnings:

- If you feel overstimulated, reduce Intensity and enable Safe Mode.
- Reduced Motion is recommended for motion sensitivity.
- Audio is optional; keep volume low.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: color_grade, compressor_limiter, edge_sharpen, focus_jitter, highpass, lowpass, noise_bed, salience_competition, tremolo

### Anxiety (Generalized / Social) (`anxiety`)

Metaphor of heightened baseline tension and increased threat-scanning attention (bounded, user-controlled).

Warnings:

- May feel uncomfortable for some users. Use Safe Mode or stop at any time.
- If you are motion-sensitive, enable Reduced Motion.
- Audio is optional; keep volume low.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: color_grade, compressor_limiter, edge_sharpen, gaze_tunnel, grain, highpass, noise_bed, tremolo

### Depressive Disorder (`depression`)

Metaphor of reduced affective contrast and cognitive fog (subtle, non-stereotyped).

Warnings:

- This is a metaphorical overlay. If it feels heavy, reduce Intensity or stop.
- Audio is optional; consider keeping it off.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: color_grade, compressor_limiter, flutter, grain, haze, lowpass, noise_bed, reverb, soft_blur, temporal_smear

### Depersonalization / Derealization (`dpdr`)

Metaphor of 'behind-glass' distance and subtle time drift (avoid disorientation; user-controlled).

Warnings:

- May feel disorienting for some. Enable Reduced Motion if needed.
- Keep Intensity low; Safe Mode recommended.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: color_grade, compressor_limiter, delay, flutter, glass_veil, haze, lowpass, reverb

### None (Clean) (`none`)

No overlay. Baseline camera view.

Nodes: none

### OCD (Intrusion + Compulsive Loop) (`ocd`)

Metaphor of sticky loops + repeated-checking pressure (non-comedic), with gentle recursion and strong clamps.

Warnings:

- Loops are subtle, but may feel 'sticky' or uncomfortable.
- Use Safe Mode; disable Audio if repetitive cues feel unpleasant.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: compressor_limiter, delay, feedback_loop, grid_hint, lowpass, tremolo, vignette

### Panic Disorder (`panic`)

Metaphor of brief, clamped alarm waves (rise/fall), with strong safety controls.

Warnings:

- Designed to be subtle, but may still feel activating for some users.
- Keep Intensity low and enable Safe Mode if needed.
- Audio is optional; keep volume low.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: color_grade, compressor_limiter, lowpass, noise_bed, pulse_tone, reverb, somatic_pulse

### Trauma / PTSD (Hyperarousal + Intrusion) (`trauma_ptsd`)

Metaphor of heightened readiness + monitoring, with abstract intrusion-like interference (non-graphic, opt-out).

Warnings:

- May be activating. Use Safe Mode and keep Intensity low.
- No sudden jump-scares, but brief abstract bursts may still feel unpleasant for some.
- Audio is optional; keep volume low.
- Avoid flashing lights or rapid flicker; enable Reduced Motion if sensitive.
- Keep volume low; avoid headphones at high volume; you can mute audio at any time.

Nodes: color_grade, compressor_limiter, delay, edge_sharpen, grain, highpass, intrusion_burst, noise_bed
