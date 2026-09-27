# Alpha release procedure

This runbook covers the local, CI, artifact, and manual evidence needed for an Inner Echo alpha
release. Its commands do not tag, push, or publish; the Pages workflow can publish only after an
authorized push-triggered `main` CI run.

## Candidate identity

- Package version: `0.1.0-alpha.1`
- Tag: `v0.1.0-alpha.1`
- Release title: `Inner Echo 0.1.0-alpha.1`
- Later alpha candidates increment the final number, for example `0.1.0-alpha.2`.

The package stays private because this repository ships a static web application, not an npm package.

## Preconditions

- Use Node.js 22 and the checked-in `package-lock.json`.
- Freeze the intended candidate diff and account for every untracked source, test, document, and asset.
- Confirm the candidate contains no local environment value, local report, analysis database, or ad hoc capture.
- Resolve all moderate or higher findings from `npm run audit:dependencies`.

## Local candidate gate

The single command is:

```bash
npm run release:alpha:checklist
```

It runs this sequence:

1. Remove local `dist/`, `reports/`, and TypeScript build-state output.
2. Install the checked-in lockfile with `npm ci --ignore-scripts`.
3. Rebuild `esbuild` for the Vite build.
4. Run the moderate-threshold dependency audit and `npm run check`.

To rerun the application gate without reinstalling dependencies:

```bash
npm run release:alpha:local
```

That command runs `npm run audit:dependencies` followed by `npm run check`.

## CI evidence

Require the `validate` job in `.github/workflows/ci.yml` on the exact candidate commit. It installs
from the lockfile with lifecycle scripts disabled, rebuilds `esbuild`, and runs the
moderate-threshold dependency audit with Node.js 22 and npm 11. Pull requests run the complete
`npm run verify` gate and upload no deployment candidates. On main pushes, a separate job with
`pages: read` obtains the configured base path. The validation job builds and assembles the site
once, runs `npm run verify:source`, and checks the final Pages artifact and notices.

CI retains the verified site and separate handoff metadata for seven days. The metadata records the
commit SHA, CI run ID and attempt, normalized base path, creation time, and a SHA-256 digest of the
site paths and bytes. It stays outside `dist/` and is never published.

Pages accepts only successful main-push CI runs from this repository. It downloads the two artifacts
from the exact triggering run and attempt, checks the metadata against the current Pages
configuration, verifies the unchanged site digest, and rechecks that main still points to the
candidate. Missing, expired, mismatched, or stale candidates cannot deploy. A changed base path or
expired artifact needs a fresh CI run; rerunning Pages does not rebuild a site. The Pages workflow
installs no dependencies and runs no audit, application tests, or build. It repackages the verified
directory with the Pages upload action and deploys through the protected `github-pages` environment.
The deployment job checks main again after any environment approval wait.

Cross-run retrieval uses explicit `run-id` and `github-token` inputs with `actions: read`, as
documented by
[actions/download-artifact](https://github.com/actions/download-artifact#download-artifacts-from-other-workflow-runs-or-repositories).

## Manual evidence

Before publishing an alpha, record the following against the exact static artifact:

1. Real Safari camera, microphone, audio, and Stop Everything flow.
2. One physical mobile-camera flow at a narrow viewport.
3. Keyboard-only navigation through welcome, setup, camera activation, safety controls, evidence
   dialog, and stop.
4. A VoiceOver and Safari pass. Add an NVDA pass in Chrome or Firefox when a Windows test environment
   is available.
5. WebGL-disabled behavior that reports a 2D, raw-preview, or unavailable state accurately.
6. The final CSP behavior and available response headers on the intended host, with GitHub Pages
   header limitations recorded rather than inferred away.
7. Runtime requests limited to same-origin static application delivery.

Local validation does not substitute for real Safari permission and accessibility evidence.

## Static artifact

`npm run build` produces `dist/` using the configured Vite base. For the configured GitHub project
site, prepare and verify the exact upload artifact with:

```bash
npm run pages:build
npm run pages:verify
npm run notices:verify
```

The local Pages build uses `/inner-echo/` by default; CI uses the base path returned by the
repository's Pages configuration. The artifact contains the live application at its configured base
and the device-free mock at `<base>/demo/`. The `dist/` directory is ignored and must not be
committed. Validate the exact contents before deployment, including:

- `index.html`, `demo/index.html`, and their referenced asset paths
- favicon and brand asset presence
- final CSP behavior and the host's documented header limitations
- absence of source maps or local paths not intended for publication
- `THIRD_PARTY_NOTICES.txt` and `third-party-licenses/` matching the verified public copies
- absence of media, audio, media-playback, persistent-storage, clipboard, and network capability
  across every static and dynamic JavaScript chunk in the mock demo closure

`.github/workflows/pages.yml` publishes to GitHub Pages. A successful push-triggered `main` CI run
can deploy, so do not commit or push a candidate until publication is authorized. The workflow does
not remove the manual browser, device, accessibility, origin-isolation, or live-response
verification requirements. Artifact verification establishes the intended meta CSP but not which
response headers the host sends.

Before the first authorized run, confirm that **Repository settings → Pages → Source** is **GitHub
Actions**. The workflow does not self-enable Pages or change that repository setting.

## Release notes

Use factual notes with these sections:

- Current capabilities
- Safety and privacy boundaries
- Validation performed against the tagged commit
- Known limitations
- Compatibility and migration notes

Do not claim production, clinical, accessibility, browser, or device readiness beyond the recorded
evidence.

## Known limitations for `0.1.0-alpha.1`

- Profile, preset, and interface contracts may change before a stable release.
- Real Safari, physical mobile camera, and assistive-technology evidence must be recorded separately.
- WebGL performance varies by device and browser; fallback modes omit the full effect stack.
- There is no backend, account system, recording, export, analytics, or offline cache.
- The repository cannot configure the complete header policy through bare GitHub Pages, and project
  sites share an origin with other sites under the same account. Measure actual live headers
  separately.
- The evidence mappings are metaphor design inputs, not diagnostic or clinical claims.

## Compatibility and migration

There is no prior stable release to upgrade from. This candidate still supports the current
local-preset and URL-hash payload version, but alpha releases may change those contracts. Export or
preserve any locally saved presets before testing a later alpha.
