# Verification Baseline

Date: 2026-05-16  
Mode: verification-only; no code fixes made.  
Working tree note: the repo was already dirty before this pass. This baseline
reflects the live working tree, not necessarily committed `main`.

## Environment

- CWD: `/Users/sebastian/Git/inner-echo`
- Local Node: `v26.0.0`
- Local npm: `11.12.1`
- CI-declared Node: `22`
- Dependencies: `node_modules/` present.
- Package manager: `npm`, because `package-lock.json` is present.

Important mismatch: CI uses Node 22, but this local pass used Node 26. Several
`tsx`-based scripts passed while emitting Node 26 deprecation warnings:

```text
[DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
```

This warning did not fail commands, but it means the local Node 26 baseline is
not perfectly equivalent to CI.

## Commands Discovered

From `package.json`, `README.md`, docs, and `.github/workflows/ci.yml`:

| Area | Command(s) |
|---|---|
| Install | `npm ci`; CI uses `npm ci --ignore-scripts && npm rebuild` |
| Dev server | `npm run dev` |
| Preview server | `npm run preview` |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint / format check | `npm run lint`; non-strict variant `npm run lint:biome` |
| Unit/component tests | `npm test` |
| Coverage | `npm run test:coverage` |
| Contract verification | `npm run verify:contracts` |
| Data validators | `npm run conditions:validate`, `npm run composer:validate`, `npm run evidence:verify` |
| Debug inspect harness | `npm run debug:inspect` |
| Browser install | `npm run browsers:install` |
| E2E | `npm run test:e2e`, `npm run test:e2e:ui`, `npm run test:e2e:cross-browser` |
| Preview smoke | `npm run test:e2e:preview` |
| Runtime matrix | `npm run runtime:matrix`, `npm run runtime:matrix:required` |
| Screenshots | `npm run screenshots:capture`, `npm run screenshots:convert`, `npm run screenshots:readme`, `npm run screenshots:verify` |
| Aggregate local verify | `npm run verify` |
| Full local gate | `npm run check` |
| Release parity | `npm run release:rc:local`, `npm run release:rc:checklist` |
| Security audit | `npm audit --audit-level=high` from CI |
| Generated docs/data | `npm run docs:gen`, `npm run evidence:gen`, `npm run nodes:report`, `npm run references:audit` |
| Cleanup | `npm run clean:local` |

No Makefile, justfile, Python, Rust, Go, SQL migrations, Docker compose file, or
external service manifest was found in the shallow repo scan.

## Commands Run and Results

| Command | Result | Evidence |
|---|---:|---|
| `node --version` | PASS | `v26.0.0` |
| `npm --version` | PASS | `11.12.1` |
| `npm run typecheck` | PASS | `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit` exited 0. |
| `npm run lint` | PASS | `Checked 209 files in 79ms. No fixes applied.` |
| `npm test` | PASS | `56 passed (56)` test files; `729 passed (729)` tests. |
| `npm run build` | PASS | Vite transformed 269 modules; build completed in about 278-296ms. |
| `npm run conditions:validate` | PASS with warning | `[conditions-validate] OK (8 profiles)` plus Node `DEP0205` warning. |
| `npm run composer:validate` | PASS with warning | `[composer-validate] OK` plus Node `DEP0205` warning. |
| `npm run evidence:verify` | PASS with warning | `[evidence-verify] OK` plus Node `DEP0205` warning. |
| `npm run verify:contracts` | PASS with warning | Reports written; summary `ok=208 warnings=0 errors=0`; Node `DEP0205` warning. |
| `npm run test:coverage` | PASS | `56 passed (56)` files; `729 passed (729)` tests; all-files coverage `90.05%` statements, `75.25%` branches, `88.62%` functions, `92.49%` lines. |
| `npm audit --audit-level=high` | PASS | `found 0 vulnerabilities`. |
| `npm run debug:inspect` | PASS with warning | Re-ran typecheck/lint/test/contracts; `profiles=8 scenarios=24 ok=24 warnings=0 errors=0`; Node `DEP0205` warning. |
| `npm run test:e2e` | FAIL / partial | UI debug E2E passed 10 checks; Chrome cross-browser smoke passed; Firefox and WebKit failed because Playwright browser executables are missing. |
| `npm run test:e2e:preview` | FAIL / partial | Chrome smoke passed; Firefox/WebKit failed for the same missing Playwright browser executables. |
| `npm run runtime:matrix` | PASS with warning | `[runtime-matrix] OK`; Node `DEP0205` warning. |
| `npm run runtime:matrix:required` | PASS with warning | `[runtime-matrix] OK`; Node `DEP0205` warning. |
| `npm run screenshots:verify` | PASS | `[screenshots:verify] OK (10 shots)`. |
| `npm run verify` | PASS with warnings | Build, lint, unit tests, validators, evidence verification, and contract verification all passed; validator/contract subcommands emitted Node `DEP0205` warnings. |

## Failures

### Missing Playwright Firefox/WebKit Browsers

`npm run test:e2e` and `npm run test:e2e:preview` did not fully pass.

Chrome portions passed:

```text
PASS chrome cross-browser smoke
```

Firefox failed:

```text
browserType.launch: Executable doesn't exist at
/Users/sebastian/Library/Caches/ms-playwright/firefox-1509/firefox/Nightly.app/Contents/MacOS/firefox
```

WebKit failed:

```text
browserType.launch: Executable doesn't exist at
/Users/sebastian/Library/Caches/ms-playwright/webkit-2248/pw_run.sh
```

The tool suggested:

```text
npx playwright install
```

Repo command for this is:

```bash
npm run browsers:install
```

I did not run browser installation during this baseline because it downloads and
writes external browser assets outside the repository. Stronger browser
verification is blocked until Firefox and WebKit Playwright binaries are
installed.

## Skipped Checks

| Check | Reason |
|---|---|
| `npm run browsers:install` | Skipped to avoid downloading external browser binaries during a baseline-only pass. Needed to unblock Firefox/WebKit E2E. |
| `npm run check` | Not run as a single aggregate because its E2E phase is already known to fail on missing Firefox/WebKit browser binaries. Its constituent local checks were run; full gate is not green. |
| `npm run release:rc:local` | Alias for `npm run check`; blocked by missing Firefox/WebKit browsers. |
| `npm run release:rc:checklist` | Would run cleanup, clean install, browser install, full check, screenshots generation, and verification; skipped because it is broader and more destructive to local artifacts than needed for a baseline. |
| `npm ci` / CI install path | Skipped because `node_modules/` already exists and this pass was not a clean-install verification. CI install remains unverified locally. |
| `npm run docs:gen` | Generates `docs/generated/*`; skipped because the task is baseline recording, not generated-doc refresh. |
| `npm run evidence:gen` | Generates evidence pages; skipped because generation freshness was not requested. |
| `npm run nodes:report` | Informational/report command; skipped after contract verification passed. |
| `npm run references:audit` | Informational/report command; skipped after `evidence:verify` passed. |
| `npm run screenshots:readme` | Generates/updates screenshot assets; skipped. `screenshots:verify` was run instead. |
| Manual camera/mic/browser visual smoke | Not run manually; only automated synthetic/headless checks were run. |

## Generated Outputs and Caches

These commands produced or refreshed generated local artifacts:

- `npm run build`: `dist/` and TypeScript build info may be refreshed.
- `npm run verify:contracts`: `reports/contract-verification.json` and
  `reports/contract-verification.md`.
- `npm run debug:inspect`: `reports/inspect.json`.
- `npm run test:coverage`: `coverage/`.

`git status --short -- dist reports coverage tsconfig.tsbuildinfo docs/verification-baseline.md`
showed no tracked modifications for those generated/cache paths at the time of
checking, implying they are ignored or unchanged from Git's perspective. They
are still local outputs and should not be treated as source edits.

## Suspicious or Weak Signals

- Local Node 26 differs from CI Node 22. Green local results should be confirmed
  in CI or with local Node 22 before release claims.
- `tsx` scripts pass but emit Node 26 `DEP0205` warnings. This is not a runtime
  app failure, but it is a future compatibility signal for the script toolchain.
- `npm run test:e2e` and `npm run test:e2e:preview` cannot be trusted as full
  browser coverage until Firefox and WebKit binaries are installed.
- `runtime:matrix` uses automated/headless synthetic checks. It is useful for
  regression screening but does not prove real camera/mic hardware behavior,
  user-perceived audio/video quality, or mobile layout quality.
- Coverage includes CSS and barrel files with 0% entries, so aggregate coverage
  should not be used alone as a quality claim.
- `test:coverage` shows weaker areas worth review:
  - `src/ui/ConditionComposerPanel.tsx`: about `48.93%` statements and `44.24%` branches.
  - `src/ui/hooks/useProfileLoad.ts`: about `54.92%` statements and `39.28%` branches.
  - `src/conditions/controlTargets.ts`: about `77.19%` statements and `54.87%` branches.
  - `src/engine/audio/audioEngine.ts`: about `84.63%` statements and `60.52%` branches.
  - `src/contractVerification/*NodeRegistry.ts`: branch coverage around `50-52%`.

## Tests That May Be Implementation-Trivial

No test file was audited deeply enough in this pass to declare it meaningless.
Candidates for a future test-quality audit, based on names/coverage shape only:

- Barrel/index coverage entries at 0% are reporting noise, not meaningful
  behavioral risk by themselves.
- Screenshot manifest/schema checks may be structural rather than behavioral;
  keep them, but do not count them as runtime proof.
- Fake WebAudio tests are necessary for deterministic coverage, but they cannot
  prove browser audio hardware behavior.
- Broad shader node tests can prove parameter plumbing and material shape, but
  they do not prove visual quality without screenshot/canvas-pixel checks.

## Current Verified State

Verified on the live tree:

- TypeScript typecheck passes.
- Biome lint/format check passes for `src/`, `tests/`, and `scripts/`.
- Unit/component Vitest suite passes: 56 files, 729 tests.
- Production build passes.
- `npm run verify` passes.
- Contract verification passes: 208 OK, 0 warnings, 0 errors.
- Condition, composer, and evidence validators pass.
- Debug inspect harness passes: 8 profiles, 24 scenarios, 0 warnings, 0 errors.
- Dependency audit at high severity passes: 0 vulnerabilities.
- Screenshot asset verification passes: 10 shots.
- Chromium-based runtime matrix checks pass, including required audio/mic mode.

Not verified / not fully verified:

- Full Firefox/WebKit cross-browser E2E is blocked by missing Playwright browser
  binaries.
- `npm run check` and release-candidate parity are not green until the missing
  browser dependency is installed and the full gate is rerun.
- Clean-install reproducibility via `npm ci --ignore-scripts && npm rebuild` was
  not run locally.
- Real hardware camera/mic behavior was not manually verified.
- Generated docs/evidence/screenshots were not regenerated.

## Stronger Verification Blockers

1. Install Playwright Firefox/WebKit/Chrome browser assets with
   `npm run browsers:install`, then rerun `npm run test:e2e`,
   `npm run test:e2e:preview`, and `npm run check`.
2. Re-run the baseline under Node 22 to match CI.
3. For release claims, run a clean install path:
   `npm ci --ignore-scripts && npm rebuild`.
4. Add manual or automated real-device smoke checks for camera, mic, audio,
   permission denial, Stop Everything, and mobile layout.
