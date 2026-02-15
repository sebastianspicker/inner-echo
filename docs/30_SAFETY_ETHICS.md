# Safety and ethics

**Canonical safety and ethics doc.** Aligned with [references/README.md](references/README.md) and evidence docs under `docs/references/**`. Non-diagnostic, metaphorical framing only.

---

## Core framing

This project does **not** aim to "accurately simulate" a diagnosis. It uses **metaphors** based on **experience dimensions** (e.g. intrusion, tension, derealization, rumination). Evidence for dimensions and AV motifs is in [references/](references/README.md) and the deep research reports under [references/reports/](references/reports/).

**Design intent:** Support empathy and understanding without shock or sensationalism.

---

## Non-negotiable requirements

1. **Stop Everything** — A global button that stops all media streams, audio contexts, render loops, and WebGL. No exceptions.
2. **Safe Mode** — Parameters (e.g. contrast spikes, feedback) are clamped so users are not overwhelmed. Safe Mode must always be available in the UI.
3. **Reduced Motion** — Time- and motion-heavy effects must be reducible or switchable (e.g. disable temporal_smear, feedback_loop, pulse, focus_jitter). Provide a Reduced Motion toggle.
4. **Audio optional** — Audio off by default; microphone never required and never on by default.

These are consistent with Scientific/ safety notes (e.g. avoid flicker/strobe, sudden loud transients, nausea-inducing motion; provide hard clamps and opt-outs).

---

## Design principles

1. **Dignity and respect:** No caricature, no "edgy" exaggeration for entertainment.
2. **Dimensions over labels:** Use experience dimensions as the creative basis; avoid diagnostic labels as claims.
3. **Control and reversibility:** Intensity, Safe Mode, Reduced Motion, and Stop Everything must be easy to find and use.
4. **Readable UI:** UI stays calm; the artwork lives in the overlay.
5. **Context and consent:** Onboarding and condition-specific warnings; clear metaphor disclaimer.

---

## Safety by design

- **Safe Mode (clamps):** Cap maximum intensity; restrict feedback and time-based effects; avoid high-frequency flicker and harsh contrast spikes; softer transitions. Implementation uses profile `safe_mode_clamps` and engine-level limits.
- **Reduced Motion:** Remove or replace time-based feedback nodes; prefer static or low-motion alternatives. Profile `reduced_motion_policy.disable_nodes` defines which nodes are disabled.
- **Warnings:** Each condition includes warnings (e.g. motion sensitivity, "may feel uncomfortable"). Audio is optional; volume limits and no sudden loud peaks.

References explicitly warn against: flicker/strobe, sudden loud transients, jump-scares, rapid zooms/camera shake, body distortion (depersonalization), comedic portrayal of compulsive loop. See [references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md) and dimension docs under [references/dimensions/](references/INDEX.md).

---

## Coupling loops (audio ↔ video) — safety posture

The system supports a **bidirectional coupling layer** (audio→video and video→audio) as a **perceptual metaphor of mutual reinforcement**. This is **not** presented as a clinical mechanism.

Safety requirements for coupling:

- **Hard cap**: a user-facing **Max Feedback** limit bounds how much audio can modulate video and vice versa.
- **Smoothing everywhere**: all coupling signals use attack/release smoothing (no abrupt jumps).
- **No strobe / flicker**: mappings avoid high-frequency on/off behavior; pulse-like effects are slow and capped and are disabled under Reduced Motion.
- **Audio ceiling**: the audio engine includes limiter/compressor behavior and conservative parameter clamps (no sudden harsh peaks).

Signals used (high-level):

- **Audio → video**: loudness (RMS), spectral centroid (“brightness”), spectral flux (gentle onset proxy)
- **Video → audio**: motion energy, average luminance, edge energy (low-res, smoothed metrics)

All modulation ranges are intentionally small and clamped by Safe Mode and global safety limits.

---

## Microphone (optional) — privacy + calibration

Microphone input is **optional**, **off by default**, **local-only**, and can be disabled at any time.

- **No recording**: mic audio is not stored or uploaded.
- **Permission-separated**: mic requires an explicit user action.
- **Safety chain**: mic input passes through conservative gain + limiter before mixing.
- **Calibration controls**:
  - **Mic Sensitivity**: adjusts conservative mic pre-gain (still limiter-protected).
  - **Noise Gate**: soft gate based on mic loudness to suppress background noise.

Mic features may influence visuals and/or audio modulation, but are always bounded by Max Feedback + Safe Mode clamps.

---

## UI tone and language

- Neutral and supportive; avoid dramatic or stigmatizing language.
- Avoid "You are…" phrasing. Use plain explanations: "This is a metaphorical overlay."
- Always provide a clear exit path (Stop Everything, reduce intensity, Safe Mode).

---

## Privacy and security

- **Local-first:** No transmission of video/audio to servers. No trackers; no analytics in MVP.
- **Permissions:** Camera and microphone only after explicit user action. Mic optional and permission-separated.
- **No network calls in MVP:** No external CDNs, fonts, or API calls for the MVP scope.

See [SECURITY.md](SECURITY.md) for Permissions-Policy, CSP, and release checklist.

---

## Example mappings (metaphorical only)

Experience → signal mappings are **hypotheses** supported by references/Scientific where indicated; otherwise they are labeled as evidence gaps. Examples of supported motifs (see [references/EVIDENCE_MATRIX.md](references/EVIDENCE_MATRIX.md)):

- **Hyperarousal:** grain, edge_sharpen, vignette (video); compressor_limiter, highpass, noise_bed (audio). Avoid flicker and sudden loud transients. Source: Scientific/.
- **Derealization:** haze, chroma_aberration (low), temporal_smear (low); lowpass, flutter, reverb. Avoid strong warping or glitch aesthetics. Source: Scientific/.

Do not present any mapping as a clinical or diagnostic claim.
