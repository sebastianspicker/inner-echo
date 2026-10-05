# Motif / node index

This index lists audiovisual motifs (video and audio nodes) with links to their evidence pages.

It is generated from the motifs referenced by
`src/content/experience/experience-dimensions.json`. Read the source data and the in-repository
evidence corpus; don't treat this index as an independent research document.

> A specific node is an artistic, engineering implementation of a metaphor. The evidence in this
> project mostly supports experience dimensions and reported phenomena, so read node-level claims
> cautiously.

## Motifs

- [`chroma_aberration`](./chroma_aberration.md): Minor RGB channel offset near edges (very low).
- [`color_grade`](./color_grade.md): Adjusts saturation/contrast/tonal balance (clamped).
- [`compressor_limiter`](./compressor_limiter.md): Reduces peaks and smooths dynamics (safety-first).
- [`delay`](./delay.md): Short echo with low feedback/mix (clamped).
- [`edge_sharpen`](./edge_sharpen.md): Unsharp-mask detail gain up to 2.2x (non-flickering).
- [`feedback_loop`](./feedback_loop.md): Short afterimage whose persistence lengthens on a slow cycle so the image resurfaces (bounded; reduced-motion disables).
- [`flutter`](./flutter.md): Low-depth pitch/phase wobble (clamped).
- [`focus_jitter`](./focus_jitter.md): Small, smoothed focal instability (bounded).
- [`gaze_tunnel`](./gaze_tunnel.md): Keeps the centre clear and crisp while the periphery softens, dims and loses colour (static).
- [`glass_veil`](./glass_veil.md): Pale, low-contrast veil with slow large-scale ripple, a small colour fringe and a short persistence ghost (bounded).
- [`grain`](./grain.md): Adds fine midtone-weighted grain that re-seeds at a bounded rate (clamped).
- [`grid_hint`](./grid_hint.md): Subtle grid overlay hint (very low contrast).
- [`haze`](./haze.md): Pale fog veil whose density drifts very slowly at large scale (clamped).
- [`highpass`](./highpass.md): Attenuates low frequencies below cutoff (clamped).
- [`interference`](./interference.md): Slowly drifting soft bands and faint line static with sparse eased micro-bursts (clamped; no strobe).
- [`lowpass`](./lowpass.md): Attenuates high frequencies above cutoff, with an optional slow bounded sweep (clamped).
- [`noise_bed`](./noise_bed.md): Adds quiet broadband noise floor (clamped).
- [`pulse`](./pulse.md): Slow, bounded envelope modulation (no strobe).
- [`pulse_tone`](./pulse_tone.md): Adds a soft tone pulse (level clamped).
- [`reverb`](./reverb.md): Adds gentle space/decay (clamped).
- [`salience_competition`](./salience_competition.md): An attention spot stays sharp and lifted while the rest softens; the spot holds, then moves with eased transitions.
- [`soft_blur`](./soft_blur.md): 13-tap disc blur up to about 1.4% of the frame height (clamped).
- [`somatic_pulse`](./somatic_pulse.md): Slow breath-like wave plus sparse rise-crest-release surges: bounded brightening, pull-in and peripheral narrowing.
- [`temporal_smear`](./temporal_smear.md): Faint afterimage with a bounded, frame-rate-independent persistence time (feedback clamped).
- [`tremolo`](./tremolo.md): Slow amplitude modulation (rate/depth clamped).
- [`vignette`](./vignette.md): Darkens edges to narrow the frame (static or gently modulated).
