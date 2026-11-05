# Evidence contributions and limits

## Limits

- Experiences vary between people. Group-level descriptions do not predict an individual.
- Many experience dimensions occur across diagnoses and non-clinical contexts.
- Physiological measures, attention measures, and self-report do not always agree.
- Audiovisual meaning depends on the viewer, the environment, and the presentation.
- A source that describes a phenomenon does not validate a specific video or audio mapping.

The evidence corpus does not support claims that Inner Echo:

- shows what a diagnosis looks or sounds like
- diagnoses or assesses a user
- identifies biomarkers
- infers mental state from camera or microphone input
- provides treatment or medical advice

See [experience interpretation and reviewed sources](research/experience-interpretation.md) for the
current collection boundaries and audiovisual design decisions.

## Motifs left out on purpose

- **Grid overlay (`grid_hint`) for compulsive loops:** a grid is an artistic overlay, not a marker
  of OCD. It is left out of the compulsive-loop dimension and the OCD collection so that
  compulsions are not equated with ordering.
- **Chromatic offset (`chroma_aberration`) for depersonalization and derealization:** it can work
  as a metaphor for an "unreal" or "behind glass" feeling, but the evidence supports the
  experience, not this signal mapping. Neither dimension uses it.

## Contributing evidence

1. Add or update the relevant source notes and bibliography under `research/`.
2. Update the matching dimension, motif, condition, and matrix entries.
3. Say whether each claim is source-backed, mixed, or a hypothesis.
4. Keep uncertain mappings conservative and off by default where practical.
5. Preserve the sensory constraints in [../SAFETY.md](../SAFETY.md).
6. Run `npm run evidence:gen`, `npm run evidence:verify`, and `npm run docs:links`.

Use precise language. Describe a mapping as a metaphor or design hypothesis, not a simulation or
clinical representation.
