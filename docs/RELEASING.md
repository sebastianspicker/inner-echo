# Alpha release procedure

This runbook describes the local and CI evidence required for an Inner Echo alpha release. It does not publish, tag, or push anything.

## Candidate identity

- Package version: `0.1.0-alpha.1`
- Tag: `v0.1.0-alpha.1`
- Release title: `Inner Echo 0.1.0-alpha.1`
- Later alpha candidates increment the final number, for example `0.1.0-alpha.2`.

The package remains private because this repository produces a static web application, not an npm package.

## Preconditions

- Use Node.js 22 and the checked-in `package-lock.json`.
- Freeze the intended candidate diff and account for every untracked source, test, document, and asset.
- Confirm that no local environment value, local report, analysis database, or ad hoc capture is in the candidate.
- Resolve all moderate or higher findings from `npm run audit:dependencies`.

## Local candidate gate

The single command is:

```bash
npm run release:alpha:checklist
```

It performs this sequence:

1. Remove local `dist/`, `reports/`, and TypeScript build-state output.
2. Run `npm ci --ignore-scripts`.
3. Rebuild `esbuild` for the Vite build.
4. Run the moderate-threshold dependency audit and `npm run check`.

The application gate can be rerun without reinstalling dependencies with:

```bash
npm run release:alpha:local
```

That command runs `npm run audit:dependencies` followed by `npm run check`.

## CI evidence

Require the `validate` job in `.github/workflows/ci.yml` on the exact candidate commit. It uses a lockfile install with lifecycle scripts disabled, rebuilds `esbuild`, and runs the moderate-threshold dependency audit and deterministic local gate.

## Manual evidence

Before publishing an alpha, record the following against the exact static artifact:

1. Real Safari camera, microphone, audio, and Stop Everything flow.
2. One physical mobile-camera flow at a narrow viewport.
3. Keyboard-only navigation through welcome, setup, camera activation, safety controls, evidence dialog, and stop.
4. A VoiceOver and Safari pass. Add an NVDA pass in Chrome or Firefox when a Windows test environment is available.
5. WebGL-disabled behavior that reports a 2D, raw-preview, or unavailable state truthfully.
6. The final CSP behavior and available response headers on the intended host, with GitHub Pages header limitations recorded rather than inferred away.
7. Runtime requests limited to same-origin static application delivery.

Local validation does not substitute for real Safari permission and accessibility evidence.

## Static artifact

`npm run build` produces a root-based `dist/`. For the configured GitHub project site, prepare and verify the exact upload artifact with:

```bash
npm run pages:build
npm run pages:verify
npm run notices:verify
```

The Pages build uses `/inner-echo/` by default and publishes the live application at the root. The directory is ignored and should not be committed. Validate the exact `dist/` contents before deployment, including:

- `index.html` and referenced asset paths
- favicon and brand asset presence
- final CSP behavior and the host's documented header limitations
- absence of source maps or local paths not intended for publication
- `THIRD_PARTY_NOTICES.txt` and `third-party-licenses/` matching the verified public copies

`.github/workflows/pages.yml` is the publication workflow for the GitHub Pages target. A successful push-triggered `main` CI run can deploy, so do not commit or push a candidate until publication is authorized. The workflow does not remove the manual browser, device, accessibility, origin-isolation, or live-response verification requirements.

Before the first authorized run, confirm that **Repository settings → Pages → Source** is **GitHub Actions**. The workflow does not self-enable Pages or change that repository setting.

## Release notes

Use factual notes with these sections:

- Current capabilities
- Safety and privacy boundaries
- Validation performed against the tagged commit
- Known limitations
- Compatibility and migration notes

Do not claim production, clinical, accessibility, browser, or device readiness beyond the recorded evidence.

## Known limitations for `0.1.0-alpha.1`

- Profile, preset, and interface contracts may change before a stable release.
- Real Safari, physical mobile camera, and assistive-technology evidence must be recorded separately.
- WebGL performance varies by device and browser; fallback modes omit the full effect stack.
- There is no backend, account system, recording, export, analytics, or offline cache.
- Bare GitHub Pages cannot deliver the full security-header policy and shares its origin with other project sites under the same account.
- The evidence mappings are metaphor design inputs, not diagnostic or clinical claims.

## Compatibility and migration

There is no prior stable release to upgrade from. The current local-preset and URL-hash payload version remains supported by this candidate, but alpha releases may change those contracts. Export or preserve any locally saved presets before testing a later alpha.
