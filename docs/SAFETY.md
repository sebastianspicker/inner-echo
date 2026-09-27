# Safety and ethics

Inner Echo builds audiovisual metaphors from documented experience dimensions. It does not reproduce,
diagnose, score, or treat a condition. A rendered profile is a design interpretation, not an
objective representation of a person.

Evidence sources and limits live under [references/](references/README.md).

## Required controls

1. Stop Everything invalidates pending work and releases active camera, microphone, audio,
   rendering-loop, and GPU resources.
2. Safe Mode stays available and applies conservative profile and engine clamps.
3. Reduced Motion follows the system preference until you choose an application setting, and disables
   or simplifies configured motion-sensitive nodes.
4. Global intensity stays adjustable while the experience is active.
5. Sound and microphone input stay optional, separate, and off by default.

Controls must report the runtime outcome they actually produce. A flag change with no matching
resource or parameter behavior is a defect.

## Consent and privacy

- Welcome acknowledgement and setup do not request media or start sound.
- Camera, sound, and microphone input require separate direct user actions.
- Hash imports, preset loading, migration, and startup defaults cannot activate media.
- Permission denial, interruption, or an unsupported capability is reported without automatic retry.
- You can leave setup without granting media permissions.
- Don't record or log device identifiers, stream details, track labels, media content, or potentially
  identifying preset data.

## Sensory constraints

- Don't introduce strobe effects or rapid high-contrast luminance changes.
- Avoid abrupt zoom, shake, or spatial motion that bypasses Reduced Motion policy.
- Bound temporal feedback and recursive effects.
- Avoid sudden loud transients and keep audio within profile and engine limits.
- Smooth parameter changes when an abrupt transition could be startling.
- Keep a usable stop path during loading, fallback, and error states.

Profile `safe_mode_clamps`, `reduced_motion_policy`, schema ranges, composer policy, user controls,
and engine limits form one safety contract. A profile cannot opt out of engine limits.

Safe Mode is on by default and restricts configured intensity, feedback, contrast, motion, and audio
ranges. It does not guarantee that every user will find an effect comfortable; warnings, intensity
control, Reduced Motion, and Stop Everything remain necessary.

A new motion-sensitive node must define Reduced Motion behavior and include a focused test or
contract check.

## Audio and reactive coupling

Synthesized sound and microphone input are separate. Their combined signal passes through the profile
effects, master gain, and a mandatory final output guard. That guard bounds per-channel digital
samples below -6 dBFS independently of the selected chain and master setting. Lower profile
compressor ceilings are attenuation settings, not additional hard limits. The bound does not
establish acoustic hearing safety or reconstructed true peak; device volume and individual
sensitivity still matter. Disabling sound or using Stop Everything must dispose of the corresponding
audio resources.

Reactive audio-to-video and video-to-audio mappings are metaphors, not claims about clinical
mechanisms. They must use bounded target ranges, attack and release smoothing, Safe Mode and Reduced
Motion policy, and a user-visible maximum feedback control. Unknown nodes or parameters are rejected
or skipped, never reported as success.

## Language and accessibility

- Describe profiles as metaphors or curated collections, not diagnoses or simulations.
- Don't tell a user what they are experiencing or imply that camera or microphone data reveals mental
  state.
- State evidence gaps and design hypotheses directly.
- Avoid dramatic, stigmatizing, therapeutic, or promotional claims.
- Explain permission, storage, fallback, and stop consequences in plain language.

Critical start, stop, consent, safety, and dialog controls target at least 44 by 44 CSS pixels.
Keyboard workflows, visible focus, semantic status, contrast, and responsive layout are
implementation requirements. Automated checks cover only part of that contract; the project does not
claim WCAG conformance without manual assistive-technology evidence.

## Authoring checklist

For a profile, dimension, motif, mapping, or node change:

1. Document the metaphor and evidence limit.
2. Define schema ranges, conservative defaults, Safe Mode clamps, and Reduced Motion behavior.
3. Check audio peak, motion, luminance, and temporal-feedback risk.
4. Align profiles, mappings, graph builders, registries, and evidence pages.
5. Add focused tests and run the authoring checks in [PROFILE_AUTHORING.md](PROFILE_AUTHORING.md).
6. Verify warnings, controls, fallbacks, and stop behavior.

Don't copy a known invalid mapping for consistency. Fix the shared defect or report the unsupported
mapping explicitly.
