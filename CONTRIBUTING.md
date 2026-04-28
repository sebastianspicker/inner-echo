# Contributing to inner-echo

Thanks for taking the time. A few things to know before you start.

## What this project is

inner-echo is a privacy-first, browser-only audiovisual metaphor tool. It is not a diagnostic tool, medical device, or treatment platform. Contributions should respect that framing.

## How to set up

```bash
git clone https://github.com/sebastianspicker/inner-echo.git
cd inner-echo
npm ci
npm run browsers:install
npm run dev
```

Quality gates before opening a PR:

```bash
npm run typecheck   # TypeScript type-check
npm run lint        # Biome lint (warnings fail)
npm test            # Vitest unit tests
npm run verify:contracts  # JSON contract verification
```

## npm script taxonomy

**Development**
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build locally

**Quality**
- `npm run typecheck` — TypeScript type-check (both `tsconfig.json` and `tsconfig.node.json`)
- `npm run lint` — Biome lint for `src/`, `tests/`, and `scripts/` (warnings fail)
- `npm test` — Vitest unit tests
- `npm run test:coverage` — unit tests with V8 coverage report
- `npm run browsers:install` — install the Chrome, Firefox, and WebKit browsers used by e2e and preview smoke

**Validation**
- `npm run conditions:validate` — validate condition definitions
- `npm run composer:validate` — validate composer configuration
- `npm run evidence:verify` — verify evidence references
- `npm run verify:contracts` — verify JSON-runtime contracts

**Pipeline**
- `npm run verify` — build + test + all validations
- `npm run test:e2e:preview` — cross-browser smoke against `vite preview`
- `npm run check` — verify + dev e2e + preview smoke
- `npm run release:rc:checklist` — full RC gate: clean install, Playwright browsers, check, screenshots

**Generation**
- `npm run docs:gen` — regenerate documentation
- `npm run evidence:gen` — generate evidence pages
- `npm run screenshots:capture` — capture README screenshots (requires Playwright)
- `npm run screenshots:convert` — convert screenshots to optimised formats
- `npm run screenshots:readme` — capture + convert in one step
- `npm run screenshots:verify` — verify screenshot assets are up to date

## Why no ESLint?

TypeScript strict mode with `noUnusedLocals` / `noUnusedParameters` catches a large part of what ESLint would flag. The project avoids ESLint to minimize tooling complexity and install time, and uses Biome for the remaining lint, accessibility, and security checks.

## Language conventions

User-facing messages in `src/ui/cameraMessages.ts` are in English. Keep this convention for camera/audio status messages.

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
