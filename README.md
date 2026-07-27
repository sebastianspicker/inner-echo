# Inner Echo

[![CI](https://github.com/sebastianspicker/inner-echo/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianspicker/inner-echo/actions/workflows/ci.yml)

Inner Echo is a client-only Vite and React application that applies profile-driven visual effects to a webcam feed and can add an optional local Web Audio layer. Profiles are audiovisual metaphors for discussing experience dimensions. They are not diagnostic results or clinical simulations.

The browser requests camera, microphone, and audio access only after direct user actions. Media is processed in the page and is not uploaded by the application.

## Project scope

The package version is `0.1.0-alpha.1`. The application is an alpha-stage research and design tool.

Alpha status has practical consequences:

- Profile, preset, and user-interface contracts may change before a stable release.
- Automated browser checks do not establish support for real Safari media permissions, physical mobile cameras, or assistive-technology workflows.
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
- Automated Playwright coverage uses synthetic media. It does not replace real-device, real-permission, or screen-reader testing.
- The evidence mappings describe metaphor design choices and documented hypotheses. They do not establish clinical validity.
- Deployment is not configured in this repository. A static host must serve `dist/` and apply the policy documented in `public/_headers`.
- The production CSP currently blocks inline style attributes used by the composition map. Resolve and test that conflict before deployment.
- The current lockfile fails the moderate-threshold dependency audit because `sharp@0.34.5` is covered by high-severity inherited libvips advisories.

## Requirements

- Node.js 22, matching the CI workflow
- npm, using the checked-in `package-lock.json`
- A current browser with camera support
- Chrome, Firefox, and WebKit browser binaries for the complete Playwright checks

## Installation

```bash
git clone https://github.com/sebastianspicker/inner-echo.git
cd inner-echo
npm ci --ignore-scripts
npm rebuild esbuild sharp
npm run browsers:install
```

Browser installation is needed only for Playwright checks and screenshot capture. It is not required to run the application in an already installed browser.

## Configuration

The application does not require a runtime configuration file and does not consume `VITE_*` variables. Development and browser-test scripts use loopback defaults.

The custom browser scripts accept these environment variables:

| Variable | Used by | Meaning |
|---|---|---|
| `HOST` | Browser scripts | Host to bind or inspect. The default is `127.0.0.1`. |
| `PORT` | Browser scripts | Local server port. Defaults depend on the script. |
| `HEADLESS` | Runtime matrix | Set to `0` to show the browser. The default is `1`. |
| `REQUIRE_AUDIO` | Runtime matrix | Set to `1` to require the synthesized-audio path. |
| `REQUIRE_MIC` | Runtime matrix | Set to `1` to require the microphone path. |
| `INSPECT_FRAMES` | Debug inspection | Number of frames sampled by inspection scenarios. |

These variables configure development tooling, not the browser application.

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

## Screenshots

All screenshots below use deterministic synthetic camera input. No real camera image is stored in the repository.

### Entry and runtime

![Welcome and privacy disclosure before setup.](assets/readme/screenshots/webp/01-onboarding.webp)

[PNG fallback for the welcome view](assets/readme/screenshots/png/01-onboarding.png)

![Active runtime with synthetic camera input and status controls.](assets/readme/screenshots/webp/02-hero-active.webp)

[PNG fallback for the active runtime](assets/readme/screenshots/png/02-hero-active.png)

![Idle state after Stop Everything.](assets/readme/screenshots/webp/10-stop-everything-idle.webp)

[PNG fallback for the stopped state](assets/readme/screenshots/png/10-stop-everything-idle.png)

### Setup modes

![Curated collection setup.](assets/readme/screenshots/webp/03-preset-mode.webp)

[PNG fallback for curated collections](assets/readme/screenshots/png/03-preset-mode.png)

![Weighted combination of curated collections.](assets/readme/screenshots/webp/04-multimorbid-mode.webp)

[PNG fallback for combined collections](assets/readme/screenshots/png/04-multimorbid-mode.png)

![Experience-dimension setup with weights.](assets/readme/screenshots/webp/05-symptom-mode.webp)

[PNG fallback for experience dimensions](assets/readme/screenshots/png/05-symptom-mode.png)

### Safety, evidence, and responsive layout

![Sound and optional microphone controls.](assets/readme/screenshots/webp/06-audio-mic-controls.webp)

[PNG fallback for sound and microphone controls](assets/readme/screenshots/png/06-audio-mic-controls.png)

![Method and Evidence dialog.](assets/readme/screenshots/webp/07-evidence-drawer.webp)

[PNG fallback for the evidence dialog](assets/readme/screenshots/png/07-evidence-drawer.png)

![Safe Mode and Reduced Motion controls.](assets/readme/screenshots/webp/08-safety-toggles.webp)

[PNG fallback for safety controls](assets/readme/screenshots/png/08-safety-toggles.png)

![Single-column layout at 390 by 844 CSS pixels.](assets/readme/screenshots/webp/09-mobile-home-390x844.webp)

[PNG fallback for the mobile layout](assets/readme/screenshots/png/09-mobile-home-390x844.png)

Capture the canonical screenshot set from the production preview and verify it with:

```bash
npm run screenshots:readme
npm run screenshots:verify
```

## Development workflow

| Command | Purpose |
|---|---|
| `npm run typecheck` | Check both TypeScript projects without emitting files. |
| `npm run lint` | Run Biome against `src/`, `tests/`, and `scripts/`; warnings fail the command. |
| `npm test` | Run the Vitest unit and component suite. |
| `npm run test:coverage` | Run Vitest with V8 coverage. |
| `npm run build` | Type-check and build the production static files. |
| `npm run notices:verify` | Verify installed license texts and their copies in the current production build. |
| `npm run docs:links` | Check local file targets in maintained Markdown documentation. |
| `npm run verify:contracts` | Verify JSON references against implemented audio and video nodes. |
| `npm run conditions:validate` | Validate condition profiles and mappings. |
| `npm run composer:validate` | Validate composer behavior and safety ranges. |
| `npm run evidence:verify` | Verify evidence documents and links. |
| `npm run test:e2e` | Run the Chrome UI suite and Chrome, Firefox, and WebKit smoke flows. |
| `npm run test:e2e:preview` | Run the cross-browser smoke against the production preview server. |
| `npm run runtime:matrix:required` | Exercise required camera, audio, and microphone paths with deterministic fake media. |
| `npm run verify` | Build, verify notices and links, lint, test, and run contract and data validation. |
| `npm run check` | Run `verify`, both browser suites, preview smoke, and the required runtime matrix. |
| `npm run audit:dependencies` | Fail on moderate or higher npm advisories. |
| `npm run release:alpha:local` | Run the dependency audit and the complete local check. |
| `npm run release:alpha:checklist` | Perform the clean install, browser, check, screenshot capture, and screenshot verification sequence. |

The alpha release procedure is documented in [docs/RELEASING.md](docs/RELEASING.md).

Run a focused test while editing, then run `npm run verify` before opening a pull request. Use `npm run check` when a change affects permissions, camera, audio, rendering, fallbacks, browser behavior, or release tooling.

## Testing

Vitest covers source contracts, composition, media lifecycle, rendering parameters, storage codecs, evidence sanitization, and React components. Playwright covers detailed Chrome flows and synthetic-media smoke tests in Chrome, Firefox, and WebKit.

Coverage thresholds in `vite.config.ts` are 85 percent statements, 70 percent branches, 85 percent functions, and 87 percent lines. Browser automation does not establish real-device permissions, physical camera or microphone compatibility, Safari behavior, or assistive-technology compatibility.

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
| `tests/unit/` | Vitest unit and component tests. |
| `tests/helpers/` | Versioned fixtures and helpers used by unit tests. |
| `tests/e2e/` | Browser entrypoints, suites, and shared browser support. |
| `scripts/docs/` | Documentation derivation and evidence validation. |
| `scripts/validation/` | Contract, profile, composer, and inspection commands. |
| `scripts/screenshots/` | README screenshot capture, conversion, and verification. |
| `scripts/release/` | Static artifact notice verification. |
| `scripts/lib/` | Shared script implementation modules. |
| `docs/` | Architecture, product, safety, reliability, release, and evidence documentation. |
| `assets/readme/screenshots/` | Manifest-backed public screenshot set. |
| `public/` | Static response-header policy and third-party license notices copied into the build. |

Derived contract references under `docs/generated/` are tracked and must match their source contracts. Build output, coverage, reports, local analysis tools, editor state, and ad hoc captures are ignored.

## Deployment and operation

`npm run build` writes the static application to `dist/`. The repository does not contain a deployment-provider configuration, container image, server process, public URL, or publication workflow.

A deployment must:

1. Serve `dist/index.html` and its referenced assets over HTTPS.
2. Route the application root to `index.html`.
3. Resolve the composition-map inline-style conflict with the production CSP, then apply and verify the final response-header policy.
4. Keep camera and microphone permissions restricted to the application origin.
5. Verify the deployed response headers and same-origin request behavior.

Some static hosts recognize `public/_headers`; others ignore it. Treat that file as the intended policy, not evidence that a deployed host enforces it.

## Troubleshooting

- Missing Playwright executable: run `npm run browsers:install`, then rerun the failed browser command.
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
