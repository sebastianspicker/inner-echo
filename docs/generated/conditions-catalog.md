# Conditions catalog

Every condition with its label, tags, safety intensity maximum, and nodes.

## Table

| id | label | tags | safety (intensity max) | nodes |
|----|-------|------|------------------------|-------|
| adhd | ADHD-related attention experiences | attention_fragmentation | 0.65 | color_grade, compressor_limiter, edge_sharpen, highpass, lowpass, noise_bed, salience_competition |
| anxiety | Anxiety-related tension and worry | hyperarousal, hypervigilance, rumination_loop | 0.65 | color_grade, compressor_limiter, edge_sharpen, gaze_tunnel, grain, highpass, noise_bed, tremolo |
| depression | Depression-related energy and concentration | emotional_numbing, cognitive_fog, time_dilation | 0.7 | color_grade, compressor_limiter, grain, haze, lowpass, noise_bed, reverb, soft_blur |
| dpdr | Depersonalization / derealization experiences | derealization, depersonalization | 0.58 | color_grade, compressor_limiter, glass_veil, haze, lowpass, reverb |
| none | None (Clean) | baseline | 0 | - |
| ocd | OCD-related intrusive thoughts and repetition | intrusion, compulsive_loop | 0.66 | compressor_limiter, delay, feedback_loop, lowpass, vignette |
| panic | Panic-related alarm | panic_peaks, hyperarousal | 0.6 | color_grade, compressor_limiter, lowpass, noise_bed, reverb, somatic_pulse |
| trauma_ptsd | PTSD-related experiences | hyperarousal, hypervigilance, intrusion | 0.62 | color_grade, compressor_limiter, edge_sharpen, grain, highpass, noise_bed |

## Per-condition details

### ADHD-related attention experiences (`adhd`)

Gently shifting areas of detail with a steady optional sound bed.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, edge_sharpen, highpass, lowpass, noise_bed, salience_competition

### Anxiety-related tension and worry (`anxiety`)

Gentle focus narrowing, restrained detail and quiet sound texture.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, edge_sharpen, gaze_tunnel, grain, highpass, noise_bed, tremolo

### Depression-related energy and concentration (`depression`)

Mild tonal softening and a quiet, filtered sound bed.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, grain, haze, lowpass, noise_bed, reverb, soft_blur

### Depersonalization / derealization experiences (`dpdr`)

A light veil and filtered sound, without delayed or distorted self-images.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, glass_veil, haze, lowpass, reverb

### None (Clean) (`none`)

No overlay. Baseline camera view.

Nodes: none

### OCD-related intrusive thoughts and repetition (`ocd`)

Subtle image persistence and a quiet echo, both adjustable.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: compressor_limiter, delay, feedback_loop, lowpass, vignette

### Panic-related alarm (`panic`)

A shallow, slow visual wave with a steady optional sound bed.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, lowpass, noise_bed, reverb, somatic_pulse

### PTSD-related experiences (`trauma_ptsd`)

Fine static texture and restrained detail, without automatic intrusion bursts.

Warnings:

- Start with low intensity and volume; sound is optional.
- Use Reduced Motion for a steadier image. Stop Everything is always available.

Nodes: color_grade, compressor_limiter, edge_sharpen, grain, highpass, noise_bed
