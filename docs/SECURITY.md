# SECURITY.md — Security and privacy

## Reporting a vulnerability

If you find a security issue, please **do not open a public GitHub issue**.

Prefer [GitHub's private vulnerability reporting](https://github.com/sebastianspicker/inner-echo/security/advisories/new) so the disclosure stays confidential until a fix is ready.

Alternatively, email the details to **sebastian.spicker@googlemail.com** with:
- a description of the issue,
- steps to reproduce or a proof of concept,
- any suggested fix if you have one.

You will receive a response within 7 days. Once confirmed, a fix will be prioritised and you will be credited in the release notes (unless you prefer anonymity).

This project is a local-only browser app with no server, no user accounts, and no remote data transmission — the attack surface is limited. The most relevant concerns are XSS, clickjacking, and supply-chain vulnerabilities in npm dependencies.

---

## Privacy-first by default

- **Local-first**: All processing in the browser. No transmission of video or audio data to any server.
- **No uploads**: In MVP, neither webcam nor microphone data is uploaded or streamed.
- **No trackers**: No analytics, no third-party scripts, no tracking cookies.
- **No network calls in MVP**: In the Minimal Viable Product, no network requests are allowed (no external CDNs, no remote fonts, no API calls). Everything runs fully offline-capable in the client.

---

## No third-party calls

- The app must not load scripts, fonts, or data from third-party origins in MVP.
- All assets are bundled or served from the same origin as the app.
- If you add analytics, CDNs, or external APIs in a future phase, document them and obtain approval; they are out of scope for MVP.

---

## Permissions policy

- **Camera**: Access only after explicit user action (e.g. click on “Start camera”). No automatic `getUserMedia()` on load.
- **Microphone**: Optional and only after user gesture. Never enabled by default; user must explicitly enable.
- **AudioContext**: Start only after user gesture (browser requirement); no audio autoplay.

All permission-triggering actions must be bound to a concrete user gesture event (click, touch).

For static hosting or when you control response headers, you can restrict feature usage with **Permissions-Policy** (formerly Feature-Policy), for example:

```http
Permissions-Policy: camera=(self), microphone=(self)
```

This allows camera and microphone only for the same origin. Omit or narrow other features as needed.

---

## Content Security Policy (CSP)

Even for static hosting, a strict CSP is recommended to reduce XSS and unauthorised resource loading.

**Suggested CSP (adjust for your host):**

- `default-src 'self'` — only load resources from same origin.
- `script-src 'self'` — scripts only from same origin (Vite/build output).
- `style-src 'self'` — styles only from same origin; keep runtime styling in CSS rather than inline attributes.
- `img-src 'self' data:` — images from self and data URIs (e.g. placeholders).
- `media-src 'self' blob:` — video/audio from self and blob (e.g. MediaStream).
- `connect-src 'self'` — same-origin fetch/XHR only (keep `'self'` for local docs/profile fetches).
- `frame-ancestors 'none'` — prevent iframe embedding. Deliver CSP as an HTTP response header so this directive applies.

Example HTTP header (server config or `public/_headers`):

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

Development note: the local Vite dev server uses a looser header (`'unsafe-inline'` for scripts/styles) so the dev bootstrap and HMR can run. Keep that exception scoped to development only; preview and production should use the strict header above.

Avoid a CSP `<meta>` tag here. The app already relies on response headers, which prevents a stricter document-level meta policy from breaking the Vite dev bootstrap and keeps `frame-ancestors` enforceable.

Tighten or relax directives (for example `worker-src` or `form-action`) only if your deployment surface requires it.

---

## Logging principles

- **Development**: Logs for state, renderer mode, FPS and errors are allowed (see `src/utils/logger.ts`). Use `logger.debug` / `logger.warn` instead of raw `console` where appropriate.
- **Production**: Keep logging minimal; no sensitive data (no device IDs, no media content, no user identifiers, no stream or track details).
- No persistent storage of video/audio without an explicit, separately approved scope.

---

## Release checklist (security & privacy)

Before releasing a build:

- [ ] **Baseline quality gate**: Run `npm run check` and block release on any failure.
- [ ] **No third-party requests**: Confirm no network calls (DevTools Network tab, or run with network disabled). No external scripts, fonts, or CDNs.
- [ ] **Permissions**: Camera and mic only after user gesture; no `getUserMedia` or `AudioContext` on page load.
- [ ] **CSP**: Deploy the recommended header-delivered CSP (or equivalent) and verify both preview and browser smoke runs stay green without CSP violations.
- [ ] **Permissions-Policy**: If you control headers, set camera/microphone to `(self)` (or stricter).
- [ ] **Logs**: Ensure no sensitive data is logged (search for `console.*` and `logger.*`; no device IDs, no media, no PII).
- [ ] **Debug panel**: Confirm the dev-only debug panel is not exposed in production (it is gated by `import.meta.env.DEV`; production builds should not include it).
- [ ] **ErrorBoundary**: “Reset App” must not leak sensitive data; it only reloads the page.
- [ ] **Local artifact cleanup**: Optionally run `npm run clean:local` before packaging to remove local `dist/` and `reports/` leftovers.

## RC security gate (required)

For each release-candidate cycle:

1. Run `npm run release:rc:local` (must be green).
2. Run `npm run screenshots:readme` and `npm run screenshots:verify` so README images remain deterministic and non-PII.
3. Ensure CI `release_candidate_gate` is green on the same commit.
4. Draft RC tag in `v0.1.0-rc.N` format and include known limitations in release notes.
5. Do not publish or tag if any of the above gates fail.

Full release-candidate runbook: [RELEASE_RC.md](./RELEASE_RC.md).
