# inner-echo

Privacy-first, client-only webcam overlay app: users select a **Condition** (metaphorical experience framing) and the app applies a responsive visual (and optional audio) overlay.

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

