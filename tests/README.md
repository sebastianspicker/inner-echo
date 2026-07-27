# Test structure

All test source in this directory is active and versioned.

| Path | Purpose |
|---|---|
| `unit/` | Vitest unit and React component tests discovered by `vite.config.ts`. |
| `helpers/` | Source fixtures and assertions imported by unit tests. These are not standalone tests. |
| `e2e/` | Browser test entrypoints and runtime-matrix coverage. |
| `e2e/suites/` | Test cases consumed by the Chrome UI entrypoint. |
| `e2e/support/` | Browser, server, fake-media, and assertion support. |

The current suite contains 61 Vitest files. All are active and included by the
test configuration.

Screenshot capture is tooling rather than a test and lives under `scripts/screenshots/`.

Run:

```bash
npm test
npm run test:coverage
npm run test:e2e
npm run test:e2e:preview
npm run runtime:matrix:required
```
