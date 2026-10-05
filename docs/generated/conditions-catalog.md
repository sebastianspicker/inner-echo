# Conditions catalog

<!-- Source: tools/docs/gen-docs.ts. Edit the source contracts, then run npm run docs:gen. -->

Every condition with its label, tags, safety intensity maximum, and nodes.

## Table

| id | label | tags | safety (intensity max) | nodes |
|----|-------|------|------------------------|-------|
| adhd | ADHD-related attention experiences | attention_fragmentation | 1 | color_grade, compressor_limiter, edge_sharpen, grain, highpass, lowpass, noise_bed, salience_competition |
| anxiety | Anxiety-related tension and worry | hyperarousal, hypervigilance, rumination_loop | 1 | color_grade, compressor_limiter, delay, edge_sharpen, gaze_tunnel, grain, highpass, noise_bed, tremolo |
| depression | Depression-related energy and concentration | emotional_numbing, cognitive_fog, time_dilation | 1 | color_grade, compressor_limiter, flutter, grain, haze, lowpass, noise_bed, reverb, soft_blur, temporal_smear, vignette |
| dpdr | Depersonalization / derealization experiences | derealization, depersonalization | 1 | color_grade, compressor_limiter, delay, glass_veil, haze, lowpass, reverb, vignette |
| none | None (Clean) | baseline | 0 | - |
| ocd | OCD-related intrusive thoughts and repetition | intrusion, compulsive_loop | 1 | color_grade, compressor_limiter, delay, feedback_loop, interference, lowpass, vignette |
| panic | Panic-related alarm | panic_peaks, hyperarousal | 1 | color_grade, compressor_limiter, lowpass, noise_bed, reverb, somatic_pulse, vignette |
| trauma_ptsd | PTSD-related experiences | hyperarousal, hypervigilance, intrusion | 1 | color_grade, compressor_limiter, delay, edge_sharpen, grain, highpass, interference, noise_bed, vignette |

## Per-condition details

### ADHD-related attention experiences (`adhd`)

Gently shifting areas of detail with a steady optional sound bed.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, edge_sharpen, grain, highpass, lowpass, noise_bed, salience_competition

### Anxiety-related tension and worry (`anxiety`)

Gentle focus narrowing, restrained detail and quiet sound texture.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, delay, edge_sharpen, gaze_tunnel, grain, highpass, noise_bed, tremolo

### Depression-related energy and concentration (`depression`)

Mild tonal softening and a quiet, filtered sound bed.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, flutter, grain, haze, lowpass, noise_bed, reverb, soft_blur, temporal_smear, vignette

### Depersonalization / derealization experiences (`dpdr`)

A light veil and filtered sound, without delayed or distorted self-images.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, delay, glass_veil, haze, lowpass, reverb, vignette

### None (Clean) (`none`)

No overlay. Baseline camera view.

Nodes: none

### OCD-related intrusive thoughts and repetition (`ocd`)

Subtle image persistence and a quiet echo, both adjustable.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, delay, feedback_loop, interference, lowpass, vignette

### Panic-related alarm (`panic`)

A shallow, slow visual wave with a steady optional sound bed.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, lowpass, noise_bed, reverb, somatic_pulse, vignette

### PTSD-related experiences (`trauma_ptsd`)

Fine static texture and restrained detail, without automatic intrusion bursts.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, delay, edge_sharpen, grain, highpass, interference, noise_bed, vignette
