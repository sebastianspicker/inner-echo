# Contributing to Inner Echo

Inner Echo is a client-only audiovisual metaphor application. It is not a diagnostic tool, medical device, or treatment platform. Contributions must preserve that scope and the direct-user-gesture boundary for camera, microphone, and audio startup.

## Setup

Use Node.js 22 and npm:

```bash
git clone https://github.com/sebastianspicker/inner-echo.git
cd inner-echo
npm ci --ignore-scripts
npm rebuild esbuild
npm run dev
```

Do not add a production dependency without explaining why the existing platform and dependency set are insufficient.

## Validation

Run the narrowest relevant test while working, then the broader gate appropriate to the change.

Common checks:

| Command | Scope |
|---|---|
| `npm run typecheck` | Browser, pure-domain, build-config, and repository-tool TypeScript projects. |
| `npm run lint` | Biome checks for source, tests, and tools. Warnings fail. |
| `npm run architecture:check` | Source dependency direction and cycle enforcement. |
| `npm test` | Compact Vitest core-contract tests. |
| `npm run build` | TypeScript build and Vite production build. |
| `npm run bundle:verify` | Lazy Three.js boundary and production diagnostic exclusion. |
| `npm run notices:verify` | Installed and distributed third-party license texts. Run after `npm run build`. |
| `npm run docs:verify` | Tracked generated catalog and schema freshness. |
| `npm run docs:links` | Local targets in maintained Markdown documentation. |
| `npm run verify:contracts` | Profile references and runtime node contracts. |
| `npm run conditions:validate` | Condition profiles and mapping data. |
| `npm run composer:validate` | Composer output and safety ranges. |
| `npm run evidence:verify` | Evidence pages and links. |
| `npm run verify` | Complete build, architecture, test, documentation, contract, data, and inspect gate. |
| `npm run check` | Alias for `verify`. |
| `npm run audit:dependencies` | Moderate-threshold npm advisory check. |
| `npm run release:alpha:local` | Dependency audit plus the complete local gate. |

The complete clean-install and screenshot sequence is documented in [docs/RELEASING.md](docs/RELEASING.md).

## Derived files

- Run `npm run docs:gen` after changing catalog or schema inputs that affect `docs/generated/`.
- Run `npm run evidence:gen` when source mappings or evidence-page templates change.
Do not hand-edit derived catalog, schema, or evidence files. Update the source and run the corresponding command.

## Change scope

- Keep changes focused on one reviewable concern.
- Add a regression test for a corrected contract or failure mode when practical.
- Treat `src/content/experience/profiles/*.json`, schemas, mappings, graph builders, and node registries as one runtime contract.
- Do not preserve a deprecated path without evidence that a supported consumer still needs it.
- Do not commit build output, reports, local environment values, analysis databases, or editor state.

## Safety and privacy requirements

- Do not add camera, microphone, or `AudioContext` startup outside a direct user action.
- Passive URL-hash, local-storage, or migration paths must not activate media or sound.
- Keep Safe Mode, Reduced Motion, Stop Everything, permission errors, and fallback status truthful.
- Do not add recording, upload, analytics, tracking, external fonts, or remote APIs without an explicitly approved scope and updated privacy documentation.
- Avoid strobe behavior, abrupt luminance changes, unbounded feedback, and sudden loud transients.
- Keep evidence HTML on the sanitized `src/content/evidence/markdown.ts` path.

See [docs/30_SAFETY_ETHICS.md](docs/30_SAFETY_ETHICS.md) and [docs/SECURITY.md](docs/SECURITY.md).

## Condition and motif contributions

New or changed dimensions, profiles, and motifs must include:

- the runtime JSON or node change
- the corresponding schema, mapping, and registry update when applicable
- evidence references and a clear statement of evidence limits
- safety clamps and reduced-motion behavior
- focused tests and contract validation

Do not describe a profile as an accurate representation of a diagnosis or of another person's experience.

## Pull requests

Use the repository pull request template. Describe behavior, affected contracts, exact validation, skipped checks, and remaining uncertainty. Do not include secrets, personal health information, raw media, device identifiers, or private vulnerability details in a public pull request.

## Security reports

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md) for private reporting guidance.
