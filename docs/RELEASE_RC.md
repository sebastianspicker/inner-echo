# RELEASE_RC.md — One-pass release candidate runbook

This runbook defines the single-pass RC process for `inner-echo`.

## Target and tagging

- Default candidate version: `0.1.0-rc.1`
- Tag format: `v0.1.0-rc.N`
- If fixes are required, increment `N` (`v0.1.0-rc.2`, `v0.1.0-rc.3`, ...)

## Preconditions

- Work from a dedicated prep branch.
- Ensure no unintended tracked-file diffs are present.
- Ensure README screenshot manifest exists at `assets/readme/screenshots/manifest.json`.

## One-pass RC checklist

Run in order on the same commit:

```bash
npm run clean:local
npm ci
npm run check
npm run screenshots:readme
npm run screenshots:verify
```

## CI parity

Push the same commit and require green status for:

- `validate`
- `release_candidate_gate`

`release_candidate_gate` must run:

- `npm run release:rc:local`
- `npm run screenshots:verify`

## Manual smoke acceptance

1. Start camera + stop everything path.
2. Switch modes while camera is active (`Experience dimensions` -> `Curated collections` -> `Combine collections`).
3. Open/close the Method & Evidence dialog and validate keyboard navigation and focus return.
4. Confirm mobile layout at ~`390x844` remains usable.
5. Verify `Safe Mode` and `Reduced Motion` toggles are available and responsive.

## Release note content (RC)

Include at minimum:

- Scope summary of RC changes
- Safety/privacy statement (local-only, no real camera screenshots in README)
- Known limitations
- Next action if RC is rejected (increment `rc.N`)

## Known limitations template

- The audiovisual runtime is deferred from the initial entry, but its asynchronous chunk remains substantial and should continue to be monitored.
- Automated Playwright coverage does not replace a real Safari camera/audio smoke, physical mobile-camera smoke, or manual screen-reader pass.
- RC is non-final and may require additional hardening based on validation feedback.
