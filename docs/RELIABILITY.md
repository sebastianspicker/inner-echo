# RELIABILITY.md — Browser matrix, fallbacks, and known issues

This document describes supported browsers, fallback behaviour, and mitigations for known issues. It is intended for developers and release checks.

---

## Browser matrix

| Browser        | getUserMedia (camera) | getUserMedia (mic) | WebGL (Three.js) | AudioContext / autoplay |
|----------------|------------------------|--------------------|------------------|--------------------------|
| Chrome (latest)| ✓                      | ✓                  | ✓                | ✓ (after user gesture)   |
| Firefox (latest)| ✓                    | ✓                  | ✓                | ✓ (after user gesture)   |
| Safari (latest)| ✓                      | ✓                  | ✓                | ✓ (after user gesture)   |
| Edge (latest)  | ✓                      | ✓                  | ✓                | ✓ (after user gesture)   |

- **getUserMedia (camera)**: Required. The app requests video-only by default; mic is a separate, optional permission.
- **getUserMedia (mic)**: Optional. Used only when the user explicitly enables microphone for reactive audio→video modulation.
- **WebGL**: Used for the full overlay pipeline. If effects cannot start, the runtime reports the actual renderer mode and keeps the underlying raw camera preview visible where possible.
- **AudioContext**: Must be started after a user gesture (click/touch). Browsers block autoplay; the app does not play audio until the user clicks “Enable audio”.

### Browser-specific behaviour

- **Chrome**: Camera and mic permissions are per-origin. Autoplay policy requires user gesture for AudioContext; our “Enable audio” button satisfies this.
- **Firefox**: Same pattern; mic is a separate permission prompt. WebGL is generally well supported.
- **Safari**: Stricter autoplay and gesture requirements. `playsInline` and `muted` are set on the video element to allow inline playback. AudioContext must be resumed after user interaction.

---

## WebGL fallback strategy

1. **WebGL**: The lazily loaded overlay runtime uses Three.js for the full video node graph and reports `webgl` only after that renderer is active.
2. **2D**: When a valid 2D surface is available, camera passthrough is drawn without effects and reported as `2d`.
3. **Raw preview**: If the effects surface cannot be reused safely, the overlay is hidden and the underlying video remains visible. The UI reports that effects are unavailable; it does not claim they are active.
4. **Unavailable**: Missing or unusable media/rendering surfaces are reported as `unavailable` with a recovery message. Stop Everything and the surrounding controls remain usable in every mode.

---

## Known issues and mitigations

| Issue | Mitigation |
|-------|------------|
| **Low FPS on weak devices** | FPS guard in the WebGL pipeline reduces internal render resolution (scale 1 → 0.75 → 0.5) when FPS drops below 30. Stress controls are development-only. |
| **Camera permission denied** | UI shows a clear message; no retry loop. User can click “Start camera” again after granting permission. |
| **Mic permission denied** | Shown in mic status; user can continue with synth-only audio. |
| **AudioContext blocked** | Audio stays “off” until the user clicks “Enable audio” (user gesture). No autoplay. |
| **WebGL context lost** | The effects loop stops and the UI reports the fallback state. Raw camera remains visible where available; reload may restore WebGL effects. |
| **Reduced Motion** | Conditions with temporal/smear effects respect the Reduced Motion preference and can disable or simplify those nodes (see condition profiles and `reduced_motion_policy`). |
| **Resize during active overlay** | Canvas and WebGL pipeline resize with the container; no explicit debounce. Rare visual glitches on very fast resize are acceptable in MVP. |

---

## Verifying reliability

- **Automated**: Playwright exercises the current core flow in its installed Chrome, Firefox, and WebKit engines. This is not equivalent to a real Safari/device permission smoke.
- **Manual**: Start camera → switch setup modes → enable/disable audio and mic → Stop Everything. Repeat in Chrome, Firefox, and real Safari.
- **WebGL fallback**: Disable WebGL or use a device without it; confirm the UI reports `2d`, raw preview, or unavailable truthfully and does not claim effects are active.
- **Debug panel (dev only)**: When running in development, the debug panel shows renderer mode (webgl vs 2d), fps, renderScale, audio and mic state. Use “Copy diagnostics” to capture state for support.

---

## Release checklist (reliability)

Before release, verify:

- [ ] **Full gate run**: Run `npm run check` (verify + dev e2e + preview smoke) and require a green result before tagging.
- [ ] **Browser matrix**: Smoke-test start/stop, condition switch, audio and mic in Chrome, Firefox, and Safari (or your supported set).
- [ ] **WebGL fallback**: With WebGL disabled (or on a device without WebGL), confirm 2D passthrough and no crash.
- [ ] **Stop Everything**: After starting camera and optional audio/mic, click “Stop Everything”; confirm no orphan streams, loops, or console errors.
- [ ] **ErrorBoundary**: Use the dev “Throw test error” button (or trigger a crash); confirm “Reset App” appears and reload works.
- [ ] **Security & privacy**: See [SECURITY.md](./SECURITY.md) for the full release checklist (CSP, permissions, logging).

## RC workflow (single-pass)

Use this flow for release candidates:

1. Run local parity gate: `npm run release:rc:local` (exactly `npm run check`).
2. Generate and verify README screenshots:
   - `npm run screenshots:readme`
   - `npm run screenshots:verify`
3. Push branch and require green CI jobs:
   - `validate`
   - `release_candidate_gate`
4. After CI is green, run manual smoke checks (camera start/stop, setup-mode switches, Method & Evidence dialog, mobile layout).
5. Tag candidate with `v0.1.0-rc.N` (for example `v0.1.0-rc.1`), increasing `N` for each retry.

Detailed one-pass runbook: [RELEASE_RC.md](./RELEASE_RC.md).
