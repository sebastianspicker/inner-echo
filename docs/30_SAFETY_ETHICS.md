# Safety and ethics

Inner Echo uses audiovisual metaphors built from documented experience dimensions. It does not claim to reproduce, diagnose, score, or treat a condition. A rendered profile is a design interpretation, not an objective representation of a person.

Evidence sources and limitations are maintained under [references/](references/README.md).

## Required controls

1. Stop Everything releases active media, audio, rendering loops, and related runtime resources.
2. Safe Mode remains available and applies conservative profile and engine clamps.
3. Reduced Motion follows the system preference until the user chooses a setting and disables or simplifies configured motion-sensitive nodes.
4. Global intensity remains adjustable while the experience is active.
5. Sound and microphone input remain optional, separate, and off by default.

These controls must report the runtime state they actually produce. A flag change without corresponding resource or parameter behavior is a defect.

## Permission and consent boundaries

- Welcome acknowledgement does not request media or start audio.
- Camera starts only after a direct activation action.
- Microphone input has a separate direct activation action.
- `AudioContext` startup or resume requires a direct activation action.
- URL hashes, local preset loading, storage migration, and startup defaults cannot activate media or sound.
- Permission denial, interruption, or unsupported media is reported without an automatic retry loop.
- A user can leave the preflight flow without granting media permissions.

## Sensory constraints

- Do not introduce strobe effects or rapid high-contrast luminance changes.
- Avoid abrupt zoom, shake, or spatial motion that bypasses Reduced Motion policy.
- Bound temporal feedback and recursive visual effects.
- Avoid sudden loud transients and keep audio parameters within the profile and engine limits.
- Apply parameter changes with smoothing where an abrupt transition could be startling.
- Keep a usable stop path during loading, fallback, and error states.

Profile `safe_mode_clamps`, `reduced_motion_policy`, schema ranges, composer safety logic, and engine limits form one safety contract. A profile cannot opt out of engine-level limits.

## Safe Mode

Safe Mode limits configured intensity, feedback, contrast, motion, and audio ranges. It is enabled by default. Condition and composer changes must preserve conservative defaults and explicit maximums.

Safe Mode is not a guarantee that every user will find an effect comfortable. Warnings, intensity control, Reduced Motion, and Stop Everything remain necessary.

## Reduced Motion

Reduced Motion combines the operating-system preference with an explicit in-application choice. Profile policy may disable temporal smear, feedback, pulse, focus jitter, or other registered motion-sensitive nodes.

A new motion-sensitive node must define its reduced-motion behavior and include a focused test or contract check.

## Audio and microphone input

Synthesized sound and microphone input are separate concerns:

- Sound remains off until explicitly enabled.
- Microphone input remains off until separately requested.
- Microphone audio is not recorded or uploaded by the application.
- Microphone gain and gate settings feed a limiter-protected local graph.
- Audio nodes use conservative ranges and smoothing.
- Disabling sound or using Stop Everything must release the corresponding resources deterministically.

Do not log device identifiers, stream details, track labels, or media content.

## Reactive coupling

The runtime can map smoothed audio features into video parameters and smoothed video metrics into audio parameters. This bidirectional mapping is an audiovisual metaphor, not a claim about a clinical mechanism.

Reactive coupling must:

- use a user-visible maximum feedback limit
- clamp all target ranges
- avoid high-frequency on and off behavior
- apply attack and release smoothing
- respect Safe Mode and Reduced Motion
- skip or reject unknown nodes and parameters rather than report false success

The current audio features include loudness, spectral centroid, and spectral flux. Current video metrics include motion energy, average luminance, and edge energy.

## Language

- Describe profiles as metaphors or curated collections, not diagnoses or simulations.
- Avoid statements that tell a user what they are experiencing.
- State evidence gaps and hypotheses directly.
- Explain permission, storage, fallback, and stop consequences in plain language.
- Avoid dramatic, stigmatizing, therapeutic, or promotional claims.

## Accessibility boundary

Critical start, stop, consent, safety, and dialog controls target a minimum 44 by 44 CSS-pixel hit area. Keyboard workflows, visible focus, semantic status, contrast, and responsive layout are implementation requirements.

Automated checks cover selected parts of that contract. The project does not claim WCAG conformance until manual assistive-technology evidence is recorded.

## Authoring checklist

For a new or changed profile, dimension, motif, or node:

1. Document the metaphor and evidence limit.
2. Define schema ranges and safe defaults.
3. Define Safe Mode and Reduced Motion behavior.
4. Check audio peak, motion, luminance, and temporal-feedback risk.
5. Align the profile, mappings, graph builder, and node registries.
6. Add focused tests and run contract, condition, composer, and evidence validation.
7. Verify the visible warning, controls, fallback, and stop behavior.

Do not merge a mapping solely because a source file or similar profile already contains it. Fix shared defects instead of copying them.
