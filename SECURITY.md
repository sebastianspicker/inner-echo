# Security and privacy

## Report a vulnerability

Don't disclose a suspected vulnerability in a public issue.

Use [GitHub private vulnerability reporting](https://github.com/sebastianspicker/inner-echo/security/advisories/new)
when it is available. Include the affected commit, reproduction steps, impact, and the smallest
practical proof. If private reporting is unavailable, contact the maintainer through an established
private channel.

Don't include credentials, identifying health information, raw camera or microphone media, device
identifiers, or unrelated local logs.

## Trust boundaries

Inner Echo has no account, session, cookie, backend API, upload, or remote media-processing path. Its
inputs are the camera and optional microphone streams the browser grants, shared URL hashes,
same-origin local storage, bundled experience JSON, bundled evidence Markdown, npm dependencies, and
the static host.

Camera, microphone, and `AudioContext` startup each require a separate direct user action. Passive
startup, preset loading, storage migration, and shared hashes cannot activate media or sound. Stop
Everything invalidates pending requests and releases active streams, audio resources, rendering work,
and GPU resources before reporting idle.

The browser origin is the effective storage and permission boundary. Other pages on the same origin
can read or alter the same local-storage keys. The application does not claim encrypted or
multi-user isolation for local state.

## Shared links and evidence navigation

`#preset=` payloads are base64url-encoded JSON, not encrypted or authenticated. Anyone who has a
shared link can inspect or modify its configuration. The application caps the payload at 8,192
characters, validates its schema, forces audio off when applying it, and removes a valid payload
from the visible address after import.

Evidence Markdown is bundled, parsed, and sanitized through `src/content/evidence/markdown.ts`.
Don't introduce another evidence HTML injection path. Bundled documents load locally; selecting an
external citation can navigate to a third-party site. The application does not fetch those citations
in the background, and the destination is outside Inner Echo's trust boundary. Unsafe link schemes
are rejected, and new browsing contexts use `noopener noreferrer`.

The evidence generator accepts only bounded alphanumeric, underscore, and hyphen identifiers for
filenames. It checks all planned destinations before writing, rejects paths outside the repository,
and rejects existing symlink components. This protects against malformed contributed data and
committed symlinks; generation assumes no concurrent hostile process is replacing filesystem paths.

## Runtime requests and logging

The current runtime has no analytics, tracking, remote font, third-party API, recording, or
media-upload integration. Production application assets, profiles, and evidence documents are
bundled or served from the same origin. Development may use Vite's same-origin connection. There is
no service worker or offline cache.

Production logging must not include device identifiers, media content, stream or track details,
preset contents, or user identifiers. Development diagnostics are gated by `import.meta.env.DEV`.

## Response policy and GitHub Pages

`public/_headers` records the intended policy for a header-capable host:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
Permissions-Policy: camera=(self), microphone=(self)
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Verify actual deployed responses, because a static host may ignore, replace, or supplement that file.
The Vite development server uses a looser development-only CSP and is not evidence of production
policy.

The Pages workflow builds for the base path reported by the repository's Pages configuration; the
local default is `/inner-echo/`. Because the repository cannot configure Pages response headers
through `public/_headers`, the artifact injects a document-level meta CSP without `frame-ancestors`.
Artifact verification therefore proves the intended meta policy, not the presence or absence of
header-only controls such as frame denial, MIME-sniffing protection, or Permissions Policy. Measure
and record the live response separately.

GitHub project sites are path-separated, not origin-separated. A deployment under
`sebastianspicker.github.io` shares media permissions and local storage with sibling project sites on
that origin. A dedicated custom domain isolates that browser state; a header-capable host or proxy is
required when the complete repository policy must be configured.

## Dependency and release controls

- CI installs the lockfile with lifecycle scripts disabled, rebuilds `esbuild`, runs `npm audit` at
  the moderate threshold, and runs the complete repository gate.
- Dependabot covers npm and GitHub Actions dependencies. GitHub Actions references are pinned to full
  commit identifiers.
- `npm run bundle:verify` rejects production diagnostic markers and an eager Three.js closure.
- `npm run pages:verify` traverses the mock demo's static and dynamic import closure and rejects
  invalid entry paths, external or escaping assets, source maps, local paths, and forbidden device,
  media, storage, clipboard, or network capability in every demo JavaScript chunk.
- `npm run notices:verify` validates distributed third-party license material against installed
  packages and the built artifact.

For a clean lockfile-backed alpha candidate, run:

```bash
npm run release:alpha:checklist
```

Use `npm run release:alpha:local` only to rerun the audit and gate after the clean installation. See
[docs/RELEASING.md](docs/RELEASING.md) for the complete procedure and required live-browser and
live-host evidence.
