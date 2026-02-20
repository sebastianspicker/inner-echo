# inner-echo

Privacy-first, client-only webcam overlay app: users select a **Condition** (metaphorical experience framing) and the app applies a responsive visual (and optional audio) overlay.

## “Making mental illness visible” — what does that mean here?

People often say they want to “make mental illness visible.” But **what does it mean to make something visible** when the hardest parts are *internal*—felt by the person experiencing them, and often **not directly accessible** to people who are not affected?

In this repo, “visible” does **not** mean:

- diagnosing or “showing what a disorder looks like,”
- claiming a specific clinical mechanism,
- or turning lived experience into spectacle.

Instead, *inner-echo* is about building **careful, safety-first audiovisual metaphors** that can help bridge the empathy gap: creating a shared, inspectable “interaction field” that may feel *consistent with reports of* certain experiences—while staying explicit about uncertainty, limits, and artistic choice.

If you’re looking for sources and traceability for what is evidence-backed vs. hypothesis vs. purely artistic, start at `docs/references/README.md`.

## Single Source of Truth (SSOT)

Canonical condition data and research references live in:

- `src/conditions/**`
- `docs/references/**`

If there is any discrepancy elsewhere in the repo, these paths win.

## Safety principles (high level)

- Non-diagnostic, metaphor framing only (no medical claims).
- **Stop Everything** button must stop camera/audio/mic/render loops.
- **Safe Mode** and **Reduced Motion** must always be available.
- Audio is optional and conservative; no sudden peaks.
- No strobing/flicker effects.

## Dev

```bash
npm install
npm run dev
```

## Generate derived docs

```bash
npm run docs:gen
```

Generated outputs go to `docs/generated/` and are derived from `src/conditions/**` (do not edit by hand).

