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

Evidence Markdown is parsed and sanitized through `src/evidence/markdown.ts` before it reaches the rendered dialog. Do not introduce another `dangerouslySetInnerHTML` path for evidence content.

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

The current composition map uses React style attributes for node position and strength. The production `style-src 'self'` policy blocks those attributes. Treat this as a deployment blocker: resolve the implementation or CSP policy, then verify the final page under the deployed header. Do not weaken the policy without reviewing the security impact.

The Vite development server uses a development-only policy compatible with its bootstrap and hot-module reload. Do not copy that looser development policy to a production host.

## Logging and local data

- Production logging must not include device identifiers, media content, stream or track details, shared preset contents, or user identifiers.
- Development diagnostics are gated by `import.meta.env.DEV`.
- Welcome acknowledgement and saved presets are local browser state. The application does not claim encrypted or multi-user isolation for that storage.
- Video and audio recording or persistent media storage are outside the current scope.

## Dependency and install policy

- `npm run audit:dependencies` fails on moderate or higher npm advisories.
- Release-critical local and CI gates use the same threshold.
- CI installs the lockfile with lifecycle scripts disabled, then runs explicit rebuilds only for `esbuild` and `sharp`, which are required by build and screenshot tooling.
- Dependabot covers npm and GitHub Actions updates. Updates still require review and the complete relevant gate.
- GitHub Actions references are pinned to full commit identifiers.

An advisory-free audit is evidence about the current npm advisory database, not a complete supply-chain assessment.

## Release security checks

Before an alpha tag:

1. Run `npm run release:alpha:local` against the candidate lockfile.
2. Require both CI jobs on the exact candidate commit.
3. Confirm that camera, microphone, and audio remain direct-user-gesture actions.
4. Confirm that passive preset imports do not activate media or sound.
5. Verify the production build contains no debug interface, local path, secret, source map, or unintended remote request.
6. Verify CSP, permission policy, frame denial, MIME sniffing protection, and referrer policy on the intended host.
7. Verify that public screenshots use synthetic media and contain no personal information.
8. Run `npm run notices:verify` after the build and retain the verified notice files in the exact artifact.

See [RELEASING.md](RELEASING.md) for the complete alpha procedure.
