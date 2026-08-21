# Inner Echo

[![CI](https://github.com/sebastianspicker/inner-echo/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianspicker/inner-echo/actions/workflows/ci.yml)

Inner Echo is a client-only Vite and React application that applies profile-driven visual effects to a webcam feed and can add an optional local Web Audio layer. Profiles are audiovisual metaphors for discussing experience dimensions. They are not diagnostic results or clinical simulations.

The browser requests camera, microphone, and audio access only after direct user actions. Media is processed in the page and is not uploaded by the application.

After an authorized GitHub Pages deployment, the live application is served at [sebastianspicker.github.io/inner-echo](https://sebastianspicker.github.io/inner-echo/). The current local candidate has not been published, so that URL is not release evidence. Each media capability remains off until its direct activation control is selected.


## Project scope

The package version is `0.1.0-alpha.1`. The application is an alpha-stage research and design tool.

Alpha status has practical consequences:

- Profile, preset, and user-interface contracts may change before a stable release.
- Automated checks do not establish support for real Safari media permissions, physical mobile cameras, or assistive-technology workflows.
- The application has not been validated for clinical or unattended use.
- Browser and device support is limited to the automated and manual evidence described in [docs/RELIABILITY.md](docs/RELIABILITY.md).

## Current capabilities

- Direct-gesture camera startup with WebGL effects and a Canvas2D or raw-preview fallback.
- Experience-dimension setup, curated profile selection, and weighted profile composition.
- Safe Mode, Reduced Motion, global intensity, and Stop Everything controls.
- Optional synthesized audio and optional microphone input with separate activation controls.
- Local preset storage and URL-hash sharing of visual and composer state. Passive imports do not enable media or audio.
- Bundled evidence documents rendered through the sanitized Markdown path in `src/evidence/markdown.ts`.
- Contract validation for profile JSON, video nodes, audio nodes, safety ranges, and evidence links.

## Known limitations

- There is no backend, account system, analytics service, recording, export, or offline cache.
- Camera and microphone behavior depends on browser permission policy and a secure context. Loopback development URLs are treated as secure by current browsers.
- WebGL availability and performance vary by browser, GPU, and device. Fallback modes do not provide the full effect stack.
- Local validation does not replace real-device, real-permission, or screen-reader testing.
- The evidence mappings describe metaphor design choices and documented hypotheses. They do not establish clinical validity.
- GitHub Pages cannot apply the full response-header policy in `public/_headers`, and all projects under `sebastianspicker.github.io` share one browser origin. See [Security and privacy](docs/SECURITY.md#github-pages-boundary) before treating that host as a permission or storage boundary.

## Requirements

- Node.js 22, matching the CI workflow
- npm, using the checked-in `package-lock.json`
- A current browser with camera support

## Installation

```bash
git clone https://github.com/sebastianspicker/inner-echo.git
cd inner-echo
npm ci --ignore-scripts
npm rebuild esbuild
```

## Configuration

The application does not require a runtime configuration file and does not consume `VITE_*` variables.

The browser stores only local interface state:

| Storage location | Key or format | Purpose |
|---|---|---|
| `localStorage` | `inner-echo-welcome-acknowledged-v2` | Welcome acknowledgement. |
| `localStorage` | `ie_custom_presets_v2` | Up to 30 saved setup snapshots. |
| URL hash | `#preset=` | A schema-validated shared setup payload, limited to 8,192 characters. |

The loader can migrate the legacy `ie_custom_preset` key. Storage failures are reported and do not activate media.

## Usage

Start the development server:

```bash
npm run dev
```

Open the loopback URL printed by Vite, normally `http://localhost:5173`.

The primary flow is:

1. Review the welcome and privacy disclosure.
2. Select Continue to setup. This does not request media access.
3. Choose experience dimensions or a curated collection.
4. Select Start camera to request camera access.
5. Enable sound and microphone input separately if needed.
6. Use Safe Mode, Reduced Motion, intensity, or Stop Everything at any time.

Stop Everything releases the active media and audio resources and returns the interface to its idle state.

## Security considerations

- The runtime contains no application analytics, remote API, external font, recording, or media-upload path.
- Camera, microphone, and `AudioContext` startup require explicit user actions.
- Shared URL hashes and local preset migrations cannot activate media or sound.
- Evidence HTML passes through DOMPurify before it reaches the rendered dialog.
- Safe Mode and Reduced Motion apply clamps or disable motion-sensitive nodes according to the profile contract.

See [docs/SECURITY.md](docs/SECURITY.md), [docs/RELIABILITY.md](docs/RELIABILITY.md), and [docs/30_SAFETY_ETHICS.md](docs/30_SAFETY_ETHICS.md) for maintained details.

## Development workflow

| Command | Purpose |
|---|---|
| `npm run typecheck` | Check both TypeScript projects without emitting files. |
| `npm run lint` | Run Biome against `src/`, `tests/`, and `scripts/`; warnings fail the command. |
| `npm test` | Run the compact Vitest core-contract suite. |
| `npm run build` | Type-check and build the production static files. |
| `npm run notices:verify` | Verify installed license texts and their copies in the current production build. |
| `npm run docs:links` | Check local file targets in maintained Markdown documentation. |
| `npm run verify:contracts` | Verify JSON references against implemented audio and video nodes. |
| `npm run conditions:validate` | Validate condition profiles and mappings. |
| `npm run composer:validate` | Validate composer behavior and safety ranges. |
| `npm run evidence:verify` | Verify evidence documents and links. |
| `npm run verify` | Build, verify notices and links, lint, test, and run contract and data validation. |
| `npm run check` | Alias for the complete deterministic local verification gate. |
| `npm run audit:dependencies` | Fail on moderate or higher npm advisories. |
| `npm run release:alpha:local` | Run the dependency audit and the complete local check. |
| `npm run release:alpha:checklist` | Perform the clean install and deterministic local verification sequence. |

The alpha release procedure is documented in [docs/RELEASING.md](docs/RELEASING.md).

Run `npm run verify` before opening a pull request.

## Testing

Vitest covers direct schema, graph-safety, sanitization, and inactive activation-state contracts. Manual validation remains necessary for browser permissions, device compatibility, rendering, and accessibility behavior.

## Repository structure

| Path | Responsibility |
|---|---|
| `src/app/` | React application composition. |
| `src/ui/` | Permission flows, controls, status, evidence dialog, and runtime hooks. |
| `src/engine/` | Camera, audio, WebGL or Canvas, effects, coupling, and cleanup. |
| `src/conditions/` | Catalog, profiles, schemas, mappings, and graph construction. |
| `src/composer/` | Profile and experience-dimension composition. |
| `src/contractVerification/` | Runtime node registries and contract probes. |
| `src/evidence/` | Bundled document loading and sanitized Markdown rendering. |
| `tests/` | Compact direct Vitest core-contract coverage. |
| `scripts/docs/` | Documentation derivation and evidence validation. |
| `scripts/validation/` | Contract, profile, composer, and inspection commands. |
| `scripts/release/` | Static artifact notice verification. |
| `scripts/deploy/` | GitHub Pages assembly, base-path handling, CSP fallback, and artifact verification. |
| `scripts/lib/` | Shared script implementation modules. |
| `docs/` | Architecture, product, safety, reliability, release, and evidence documentation. |
| `public/` | Static response-header policy and third-party license notices copied into the build. |

Derived contract references under `docs/generated/` are tracked and must match their source contracts. Build output, coverage, reports, local analysis tools, editor state, and ad hoc captures are ignored.

## Deployment and operation

`npm run build` writes a root-based live application to `dist/`. The Pages-specific commands build the exact project-site artifact locally:

```bash
npm run pages:build
npm run pages:verify
npm run notices:verify
```

The default Pages base path is `/inner-echo/`. Set `INNER_ECHO_PAGES_BASE_PATH=/` when preparing an artifact for a root custom domain. The assembled `dist/` serves the live application at the site root, includes `.nojekyll`, and adds a strict CSP meta fallback. The GitHub Pages workflow installs with lifecycle scripts disabled, rebuilds `esbuild`, runs the dependency audit and application gate, assembles and verifies the exact Pages artifact, then uploads `dist/`. Deployment is triggered only by a successful push-triggered `main` CI run.

Before the first authorized deployment, set **Repository settings → Pages → Source** to **GitHub Actions**. The workflow reads the existing Pages configuration but deliberately does not change or self-enable repository settings.

A deployment must:

1. Serve `dist/index.html` and its referenced assets over HTTPS.
2. Route the application root to `index.html`.
3. Keep every generated asset below the configured base path.
4. Keep camera and microphone permissions restricted to the intended origin.
5. Verify the delivered CSP, response headers, and same-origin request behavior on the actual host.

GitHub Pages does not process `public/_headers`. The Pages artifact's meta CSP constrains scripts, styles, images, media, connections, objects, base URLs, and forms, but it cannot enforce `frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options`, or `Permissions-Policy`. Use a dedicated origin on a header-capable host or proxy when the complete policy is required. Treat `public/_headers` as the intended policy, not evidence that any host enforces it.

## Troubleshooting

- Camera or microphone permission denied: update the site permission in the browser and select the activation control again. The application does not retry in a loop.
- Effects unavailable: check WebGL availability. The interface should report a 2D, raw-preview, or unavailable fallback rather than claim that effects are active.
- Port already in use: pass another port to Vite with `npm run dev -- --port 5174`, or set `PORT` for a custom smoke script.
- Local storage is unavailable or full: saved presets may fail without affecting the active session. Check browser storage policy and available space.
- Dependency state differs from the lockfile: remove only the local `node_modules/` directory if appropriate, then run the installation commands again.

## Contribution guidance

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing runtime contracts, profiles, evidence mappings, or permission flows. Keep changes focused, add a regression test for behavior changes when practical, and report exact checks and skipped checks in the pull request.

Do not include credentials, personal health information, raw media, device identifiers, or private vulnerability details in issues or pull requests. Report suspected vulnerabilities through the process in [SECURITY.md](SECURITY.md).

## Additional documentation

- Documentation index: [docs/00_OVERVIEW.md](docs/00_OVERVIEW.md)
- Architecture: [docs/20_ARCHITECTURE.md](docs/20_ARCHITECTURE.md)
- Condition contracts: [docs/40_CONDITIONS.md](docs/40_CONDITIONS.md)
- Evidence methodology: [docs/references/README.md](docs/references/README.md)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security reporting: [SECURITY.md](SECURITY.md)

## License

The repository is licensed under the [MIT License](LICENSE). Runtime dependency notices and license texts are recorded in [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt).
