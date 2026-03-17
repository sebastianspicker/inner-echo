# Contributing to inner-echo

Thanks for taking the time. A few things to know before you start.

## What this project is

inner-echo is a privacy-first, browser-only audiovisual metaphor tool. It is not a diagnostic tool, medical device, or treatment platform. Contributions should respect that framing.

## How to set up

```bash
git clone https://github.com/sebastianspicker/inner-echo.git
cd inner-echo
npm ci
npm run dev
```

Quality gates before opening a PR:

```bash
npm run lint        # TypeScript type-check
npm test            # Vitest unit tests
npm run verify:contracts  # JSON contract verification
```

## What to contribute

- Bug fixes and accessibility improvements are always welcome.
- New experience dimensions or motif changes should include evidence references (see `docs/references/README.md`).
- Safety-critical changes (anything touching visual effects, audio, or camera/mic handling) require extra care — see `docs/30_SAFETY_ETHICS.md`.

## What not to contribute

- Diagnostic language, clinical claims, or anything that implies the tool assesses mental state.
- Features that transmit camera, microphone, or user data to a remote service.
- Strobe effects, rapid luminance flicker, or sudden loud audio transients.

## Pull requests

Use the PR template. Keep changes focused — one concern per PR is easier to review.

## Reporting safety issues

See `docs/SECURITY.md` for responsible disclosure instructions.
