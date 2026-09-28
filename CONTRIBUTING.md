# Contributing to Inner Echo

Inner Echo is a client-only audiovisual metaphor application. It is not a diagnostic tool, medical
device, or treatment platform. Contributions have to preserve that scope and the rule that camera,
microphone, and audio start only from a direct user action.

## Setup

Use Node.js 22 and npm:

```bash
git clone https://github.com/sebastianspicker/inner-echo.git
cd inner-echo
npm ci --ignore-scripts
npm rebuild esbuild
npm run dev
```

Don't add a production dependency without explaining why the existing platform and dependency set
aren't enough.

## Validation

Run the relevant checks while you work, then the complete public gate before proposing a change.

| Command | Scope |
|---|---|
| `npm run typecheck` | Browser, pure-domain, and build-configuration TypeScript projects. |
| `npm run build` | TypeScript build and Vite production build. |
| `npm run bundle:verify` | Lazy Three.js boundary and production diagnostic exclusion. |
| `npm run notices:verify` | Installed and distributed third-party license texts. Run after `npm run build`. |
| `npm run pages:build` | Assemble a GitHub Pages artifact. |
| `npm run pages:verify` | Verify Pages paths, CSP, demo isolation, notices, and artifact hygiene. |
| `npm run verify` | Type-check, build, and verify the runtime bundle and distributed notices. |
| `npm run check` | Alias for `verify`. |
| `npm run audit:dependencies` | Moderate-threshold npm advisory check. |
| `npm run release:alpha:checklist` | Clean install, dependency audit, and complete public gate. |

## Screenshots

The screenshots in `assets/screenshots/` are maintained by hand. They are referenced from
`README.md` and bundled into the demo page. Replace them when the interface changes.

## Change scope

- Keep changes focused on one reviewable concern.
- Treat `src/content/experience/profiles/*.json`, schemas, mappings, graph builders, and node
  registries as one runtime contract.
- Keep `src/demo/` dependency-free and isolated from application, content, domain, runtime, React,
  and production chunks. Its complete static and dynamic JavaScript closure must stay free of camera,
  microphone, audio, media playback, persistent-storage, clipboard, and network capability.
- Don't preserve a deprecated path without evidence that a supported consumer still needs it.
- Don't commit build output, reports, local environment values, analysis databases, or editor state.

## Safety and privacy requirements

- Don't add camera, microphone, or `AudioContext` startup outside a direct user action.
- Passive URL-hash, local-storage, or migration paths must not activate media or sound.
- Make Safe Mode, Reduced Motion, Stop Everything, permission errors, and fallback status report what
  actually happened.
- Don't add recording, upload, analytics, tracking, external fonts, or remote APIs without an
  explicitly approved scope and updated privacy documentation.
- Avoid strobe behavior, abrupt luminance changes, unbounded feedback, and sudden loud transients.
- Keep evidence HTML on the sanitized `src/content/evidence/markdown.ts` path.

See [docs/SAFETY.md](docs/SAFETY.md) and [SECURITY.md](SECURITY.md).

## Condition and motif contributions

New or changed dimensions, profiles, and motifs must include:

- the runtime JSON or node change;
- the matching schema, mapping, and registry update when applicable;
- evidence references and a clear statement of evidence limits;
- safety clamps and Reduced Motion behavior; and
- a successful build and artifact verification.

The full authoring and verification contract is in
[docs/PROFILE_AUTHORING.md](docs/PROFILE_AUTHORING.md). Don't describe a profile as an accurate
representation of a diagnosis or of another person's experience.

## Pull requests

Describe behavior, affected contracts, exact validation, skipped checks, and remaining uncertainty.
Don't include secrets, personal health information, raw media, device identifiers, or private
vulnerability details in a public pull request.

## Security reports

Don't open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md) for
private reporting.
