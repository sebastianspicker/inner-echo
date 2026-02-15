# SECURITY.md — Security and privacy

## Privacy-first by default

- **Local-first**: All processing in the browser. No transmission of video or audio data to any server.
- **No uploads**: In MVP, neither webcam nor microphone data is uploaded or streamed.
- **No trackers**: No analytics, no third-party scripts, no tracking cookies.
- **No network calls in MVP**: In the Minimal Viable Product, no network requests are allowed (no external CDNs, no remote fonts, no API calls). Everything runs fully offline-capable in the client.

---

## No third-party calls

- The app **must not** load scripts, fonts, or data from third-party origins in MVP.
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
- `style-src 'self' 'unsafe-inline'` — styles from same origin; inline styles are common in React (or use nonces if you move to a non-inline strategy).
- `img-src 'self' data:` — images from self and data URIs (e.g. placeholders).
- `media-src 'self' blob:` — video/audio from self and blob (e.g. MediaStream).
- `connect-src 'none'` — no fetch/XHR to any URL (MVP has no network calls).
- `frame-ancestors 'none'` — prevent embedding in iframes if you do not need it.

Example header (single line for use in server config or meta tag):

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'none';
```

If you serve the app via a meta tag:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'none';">
```

Tighten or relax directives (e.g. `worker-src`, `form-action`) as required by your deployment.

---

## Logging principles

- **Development**: Logs for state, renderer mode, FPS and errors are allowed (see `src/utils/logger.ts`). Use `logger.debug` / `logger.warn` instead of raw `console` where appropriate.
- **Production**: Keep logging minimal; **no** sensitive data (no device IDs, no media content, no user identifiers, no stream or track details).
- No persistent storage of video/audio without an explicit, separately approved scope.

---

## Release checklist (security & privacy)

Before releasing a build:

- [ ] **No third-party requests**: Confirm no network calls (DevTools Network tab, or run with network disabled). No external scripts, fonts, or CDNs.
- [ ] **Permissions**: Camera and mic only after user gesture; no `getUserMedia` or `AudioContext` on page load.
- [ ] **CSP**: If possible, deploy with the recommended CSP (or equivalent) and verify the app still loads and runs.
- [ ] **Permissions-Policy**: If you control headers, set camera/microphone to `(self)` (or stricter).
- [ ] **Logs**: Ensure no sensitive data is logged (search for `console.*` and `logger.*`; no device IDs, no media, no PII).
- [ ] **Debug panel**: Confirm the dev-only debug panel is not exposed in production (it is gated by `import.meta.env.DEV`; production builds should not include it).
- [ ] **ErrorBoundary**: “Reset App” must not leak sensitive data; it only reloads the page.
