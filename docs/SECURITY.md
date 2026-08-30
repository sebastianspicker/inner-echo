# Security and privacy

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue.

Use [GitHub private vulnerability reporting](https://github.com/sebastianspicker/inner-echo/security/advisories/new) when it is available. Include the affected commit, reproduction steps, impact, and the smallest practical proof. If private reporting is unavailable, contact a maintainer through an established private channel.

Do not include credentials, identifying health information, raw camera or microphone media, device identifiers, or unrelated local logs.

## Current trust boundaries

The application has no account, session, cookie, backend API, upload, or remote media-processing path. Relevant inputs are:

- camera and optional microphone streams granted by the browser
- shared URL hashes
- local preset and acknowledgement storage
- bundled condition JSON
- bundled evidence Markdown
- npm dependencies and built static assets

The runtime source contains no application analytics, third-party API, external font, or media-upload integration. Static files still need to be delivered by a host, and a host can add behavior outside this repository.

## Permission activation

- Camera access starts only from a direct user action.
- Microphone input is optional, off by default, and starts only from its separate activation action.
- `AudioContext` startup requires a direct user action. Sound does not autoplay.
- URL hashes, local-storage migrations, startup defaults, and other passive imports cannot activate camera, microphone, or sound.
- Stop Everything must stop active streams, audio resources, and rendering work, then report the idle state.

Changes to these boundaries require focused regression tests.

## HTML and link handling

Evidence Markdown is parsed and sanitized through `src/content/evidence/markdown.ts` before it reaches the rendered dialog. Do not introduce another `dangerouslySetInnerHTML` path for evidence content.

Evidence links are resolved through the local navigation policy. External link activation must reject unsafe schemes and use `noopener noreferrer` where a new browsing context is opened.

## Runtime requests

Production application assets, profiles, and evidence documents are bundled or served from the same origin. The current runtime should not request third-party scripts, fonts, APIs, analytics, or media services.

Development servers may use same-origin connections for Vite. No service worker or offline cache is included.

## Response headers

`public/_headers` records the intended static-host policy:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
Permissions-Policy: camera=(self), microphone=(self)
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Deliver CSP as an HTTP response header so `frame-ancestors` is enforceable. Verify the actual deployed response because a static host may ignore or replace `public/_headers`.

The composition map uses stylesheet-backed position and strength classes so it remains compatible with the production `style-src 'self'` policy. Verify the final page under the deployed header; local source compatibility does not prove that a host delivered the intended policy.

The Vite development server uses a development-only policy compatible with its bootstrap and hot-module reload. Do not copy that looser development policy to a production host.

## GitHub Pages boundary

The GitHub Pages workflow publishes the live application at `/inner-echo/`. The Pages build injects this CSP fallback into the generated HTML document:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
```

This is a document-level meta policy, not a response header. GitHub Pages does not process `public/_headers`, and meta CSP cannot enforce `frame-ancestors`. The Pages host therefore cannot provide the repository's intended frame denial, MIME-sniffing protection, or Permissions Policy. The effective referrer policy remains the standard `meta name="referrer"` declaration in `index.html`.

GitHub project sites are also path-separated, not origin-separated. `/inner-echo/` shares the `https://sebastianspicker.github.io` origin with every other project site under that account. Browser media permissions and local storage are origin-scoped, so another application on that origin is inside the same browser trust boundary. A dedicated custom domain isolates that state from other `github.io` projects. A header-capable host or proxy is still required to enforce the complete header policy.

Do not describe the bare GitHub Pages deployment as satisfying the full production-header contract. Verify its HTTPS response, base path, asset requests, meta CSP, and media activation flows after deployment, and retain the missing header controls as an explicit limitation.

## Logging and local data

- Production logging must not include device identifiers, media content, stream or track details, shared preset contents, or user identifiers.
- Development diagnostics are gated by `import.meta.env.DEV`.
- Welcome acknowledgement and saved presets are local browser state. The application does not claim encrypted or multi-user isolation for that storage.
- Video and audio recording or persistent media storage are outside the current scope.

## Dependency and install policy

- `npm run audit:dependencies` fails on moderate or higher npm advisories.
- Release-critical local and CI gates use the same threshold.
- CI installs the lockfile with lifecycle scripts disabled, then rebuilds `esbuild` for the Vite build.
- Dependabot covers npm and GitHub Actions updates. Updates still require review and the complete relevant gate.
- GitHub Actions references are pinned to full commit identifiers.

An advisory-free audit is evidence about the current npm advisory database, not a complete supply-chain assessment.

## Release security checks

Before an alpha tag:

1. Run `npm run release:alpha:local` against the candidate lockfile.
2. Require the CI validation job on the exact candidate commit.
3. Confirm that camera, microphone, and audio remain direct-user-gesture actions.
4. Confirm that passive preset imports do not activate media or sound.
5. Verify the production build contains no debug interface, local path, secret, source map, or unintended remote request.
6. Verify the controls the intended host can deliver. For GitHub Pages, verify the meta CSP and record the unavailable header-only controls. For a header-capable host, verify CSP, permission policy, frame denial, MIME sniffing protection, and referrer policy from the actual response.
7. Run `npm run notices:verify` after the build and retain the verified notice files in the exact artifact.

See [RELEASING.md](RELEASING.md) for the complete alpha procedure.
