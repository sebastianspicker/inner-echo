# Audit Progress

## Completed

### Item 1: audioEngine.ts — Code Duplication (FIXED)
**File:** `src/engine/audio/audioEngine.ts`
1. `try { node.disconnect() } catch { }` repeated 8× → `safeDisconnect(node)` helper
2. `Math.max(0, Math.min(1, value))` in `setMasterVolume` → `clamp01(value)`

### Item 2: Video effect nodes — Duplicate vertex shader (FIXED)
**Files:** All 13 effect node files under `src/engine/effects/`
- Identical 5-line GLSL vertex shader copy-pasted 13× → `QUAD_VERTEX_SHADER` in `paramUtils.ts`

### Item 3: composeCore.ts — Duplicate param-scaling loop (FIXED)
**Files:** `src/composer/composeCore.ts`, `src/composer/composeBlend.ts`
- Identical `for (k,v) → if number scale by strength` loop repeated twice → `scaleNumericParams(params, strength)` in `composeBlend.ts`

### Item 4: CameraView.tsx — Duplicate import from same module (FIXED)
**File:** `src/ui/CameraView.tsx`
- Two separate `import { ... } from '../engine/reactive'` statements merged into one

### Item 5: EffectControls.tsx — Inconsistent indentation (FIXED)
**File:** `src/ui/EffectControls.tsx`
- `EffectControlsProps` interface used 4-space indentation; corrected to 2-space consistent with rest of file

### Item 6: composeSafety.ts — Replace Math.max/min with clamp utility (FIXED)
**File:** `src/composer/composeSafety.ts`
- Added `import { clamp } from '../utils/numeric'`; replaced 5× `Math.max(0, Math.min(...))` with `clamp(v, 0, max)`

### Item 7: normalize.ts — Replace Math.max/min with clamp utility (FIXED)
**File:** `src/conditions/normalize.ts`
- Added `import { clamp } from '../utils/numeric'`; replaced `Math.max(0, Math.min(max, i0))` with `clamp(i0, 0, max)`

### Item 18: CameraView.tsx — Remaining duplicate '../engine/canvas' import (FIXED)
**File:** `src/ui/CameraView.tsx`
- `type VideoMetrics` was imported separately from `'../engine/canvas'` (line 69); moved inline to the existing import on line 39

### Item 17: Batch duplicate import merges (FIXED)
**Files:** `audioEngine.ts`, `composeBlend.ts`, `composeSafety.ts`, `couplingEngine.ts`, `EvidenceDrawer.tsx`, `useOverlayController.ts`, `useProfileLoad.ts`, `ConditionComposerPanel.tsx`
- 8 more files had multiple import statements from the same module path; all merged using inline `type` modifiers

### Item 16: presetShare.ts — Replace deprecated escape/unescape (FIXED)
**File:** `src/ui/presetShare.ts`
- `btoa(unescape(encodeURIComponent(str)))` and `decodeURIComponent(escape(atob(...)))` replaced with `TextEncoder`/`TextDecoder` — modern, non-deprecated, readable

### Finding A → Item 15: Security dependency updates (APPLIED)
- `dompurify` 3.3.1 → 3.3.3 (security patch — XSS library)
- `rollup` path traversal (GHSA-mw96-cpmx-2vgc, high severity) fixed via `npm audit fix`
- esbuild/Vite moderate vuln requires Vite 8 (breaking) — documented, deferred
- Other within-range updates (`marked`, `vitest`, `@types/*`) — low urgency, deferred

Major version updates (React 19, Vite 8, TypeScript 5.9) are out of scope for a quality audit.

### Item 14: MultimorbidPresetList.tsx + SymptomDimensionList.tsx — Indentation + duplicate import (FIXED)
**Files:** `src/ui/MultimorbidPresetList.tsx`, `src/ui/SymptomDimensionList.tsx`
- Both files used 4-space indentation throughout; corrected to 2-space
- `SymptomDimensionList.tsx` had two separate `import type { ... } from '../composer'` lines merged into one

### Item 13: composerUtils.tsx — Inconsistent indentation (FIXED)
**File:** `src/ui/composerUtils.tsx`
- Entire file used 4-space indentation; corrected to 2-space consistent with the rest of the project

### Item 12: CameraStage.tsx — Inconsistent indentation (FIXED)
**File:** `src/ui/CameraStage.tsx`
- Entire file used 4-space indentation; corrected to 2-space consistent with the rest of the project

### Item 11: AudioMicControls.tsx — Inconsistent interface indentation (FIXED)
**File:** `src/ui/AudioMicControls.tsx`
- `AudioMicControlsProps` interface used 4-space indentation; corrected to 2-space consistent with rest of file and project

### Item 10: CameraHeader.tsx — Inconsistent indentation (FIXED)
**File:** `src/ui/CameraHeader.tsx`
- Entire file (interface, destructuring params, JSX) used 4-space indentation; corrected to 2-space consistent with the rest of the project

### Item 9: DebugPanel.tsx — Duplicate imports from same module (FIXED)
**File:** `src/ui/DebugPanel.tsx`
- 4 separate `import type { ... } from '../engine/audio'` statements (lines 8–11) merged into one
- 2 separate `import type { ... } from '../engine/canvas'` statements (lines 7, 12) merged into one

### Item 8: composeCore.ts — Redundant stableUniqSorted calls (FIXED)
**File:** `src/composer/composeCore.ts`
- `stableUniqSorted` called on `report.missingNodes.video` and `.audio` at line 317–318, then more nodes pushed at 338–344, then deduped again at 346–347 → removed the first two redundant calls

---

# Security Audit Progress (Loop 2)

## Completed

### Sec-2: Input Validation & Injection — ASSESSED
**Severity:** LOW (no actionable issues found)

Entry points reviewed:
- **URL hash** (`window.location.hash` → `decodePresetFromHash` → try/catch → `decodePresetPayload` → Zod `presetPayloadSchema.safeParse`) ✅ All fields validated
- **localStorage** (`parsePresetLibrary` → Zod `presetSnapshotV2Schema.safeParse`; legacy path → try/catch around `JSON.parse`) ✅ Validated before use
- **Evidence docs** (`import.meta.glob`) — build-time bundle, no runtime path traversal ✅
- **Condition profiles** (`import.meta.glob('./profiles/*.json')`) — build-time keyed map, runtime id can only match pre-indexed paths ✅
- **Camera/mic** (`getUserMedia`) — browser-enforced consent dialog ✅
- **No `eval`, dynamic code execution, or raw `innerHTML` assignments** found in source ✅
- **No postMessage listener** — no cross-origin message injection risk ✅

Minor note (LOW): URL hash payload has no maximum length check; large presets/dimensions arrays pass Zod (no `.max()` on arrays) and trigger O(n log n) sort. In a local browser app this is self-inflicted DoS only.

### Sec-1: Dependency Security — ASSESSED
**Severity:** LOW (remaining 2 moderate, unfixable without breaking change)
- `dompurify` and `rollup` CVEs already patched in Loop 1
- Remaining: esbuild/Vite moderate vuln (GHSA-67mh-4wv8-2f99) — fix requires Vite 8 (breaking change); acceptable risk for a local-only browser app on a dev server
- No hardcoded credentials, API keys, or secrets in source code
- `.gitignore` correctly excludes `.env`, `*.pem`, `*.key`, `credentials.json`, and service-account files
- No `.env` file exists; no `.env.example` needed (app has no server-side secrets)
- Dependencies are semver-ranged (`^`), not pinned — acceptable for a private app; exact pinning would strengthen supply-chain integrity but is not critical here

### Sec-3: OWASP Top 10 — ASSESSED + FIXED
**Severity of finding:** MEDIUM (clickjacking) → FIXED

OWASP A1–A10 evaluated against this browser-only static app:
- **A1 Broken Access Control** — N/A (no server, no auth)
- **A2 Cryptographic Failures** — N/A (no sensitive server-side data; localStorage holds user presets only)
- **A3 Injection** — Covered by Sec-2: Zod-validated inputs, DOMPurify for innerHTML, no eval
- **A4 Insecure Design** — Privacy-first; camera/mic require browser consent; no external data transmission
- **A5 Security Misconfiguration** — **FIXED**: `frame-ancestors 'none'` in meta-tag CSP is silently ignored by all browsers (spec-disallowed in meta delivery). Added proper HTTP-header-based protection:
  - `vite.config.ts`: `X-Frame-Options: DENY` + full CSP via `server.headers` / `preview.headers`
  - `public/_headers`: same headers for Netlify/Cloudflare Pages deployment
  - `index.html`: removed ineffective `frame-ancestors 'none'` from meta CSP; added comment explaining why HTTP headers are required
- **A6 Vulnerable Components** — Covered by Sec-1
- **A7 Auth Failures** — N/A (no auth)
- **A8 Software/Data Integrity** — CI action hashes pinned; semver-ranged npm deps acceptable for private app
- **A9 Logging/Monitoring** — logger.error always on; debug/info/warn silenced in prod; no PII in any log call
- **A10 SSRF** — N/A (no server)

### Sec-4: Project-Specific Attack Vectors — ASSESSED
**Severity:** LOW (no actionable issues found)

- **XSS**: Single inner-HTML injection point at `EvidenceDrawer.tsx:242` is guarded by `marked.parse()` → `DOMPurify.sanitize({USE_PROFILES:{html:true}})`. No other raw HTML injection points ✅
- **Clickjacking**: Fixed in Sec-3 (HTTP headers now enforce `frame-ancestors 'none'` + `X-Frame-Options: DENY`) ✅
- **CSRF**: Zero external HTTP requests (`fetch`, `XMLHttpRequest`, `postMessage` absent from entire source) — no attack surface ✅
- **localStorage**: Stores user preset library (`parsePresetLibrary` → Zod-validates every item on read) and a single boolean onboarding flag. No tokens, passwords, or PII ✅
- **URL hash**: `decodePresetFromHash` → try/catch → `decodePresetPayload` → Zod `safeParse`. No max length check = self-inflicted DoS only (same LOW note from Sec-2) ✅
- **Camera/mic**: `getUserMedia` requires browser consent dialog; `audio: false` on video request (intentional separation prevents accidental mic capture); mic only activated via `createMediaStreamSource` into Web Audio graph (no `MediaRecorder`); `track.stop()` called on cleanup to release hardware ✅

### Sec-5: Data Privacy & Secrets Management — ASSESSED
**Severity:** LOW (no issues found — privacy-first architecture confirmed)

- No cookies set anywhere ✅
- No analytics, telemetry, or tracking scripts in source or index.html ✅
- No external data transmission: zero `fetch`/`XMLHttpRequest` calls in entire source ✅
- Camera frames go to a WebGL texture (Three.js); mic data goes to a Web Audio API processing graph — both processed entirely in-browser, never serialised or transmitted ✅
- localStorage holds only non-sensitive user configuration (preset payloads, onboarding flag) — no PII ✅
- Referrer-Policy delivered via HTTP header (`vite.config.ts` + `public/_headers`) limits referrer leakage ✅
- No secrets, API keys, or credentials in source; `.gitignore` excludes all secret file patterns ✅

## In Progress

*(none)*

## Remaining Scope — Security

*(none — all 5 areas assessed)*

---

---

# Documentation Quality Audit Progress (Loop 3)

## Completed

### Doc-1: docs/20_ARCHITECTURE.md — Bold overuse + "robust" (FIXED)
**File:** `docs/20_ARCHITECTURE.md`
- Removed bold mid-sentence emphasis from: "client-only", "Three.js WebGL pipeline", "stack", "WebAudio", "analyser", "Goals:", "Engine"/"conditions"/"UI" in boundary sentence, "user gesture"
- Replaced banned word "robust" with a concrete description: "with a Canvas2D fallback when WebGL init fails"
- Bold retained only for definition-term list prefixes (**Video:**, **Audio:**, **Intensity:**, etc.) per style guide

### Doc-2: docs/00_OVERVIEW.md — Bold overuse in intro (FIXED)
**File:** `docs/00_OVERVIEW.md`
- Removed bold from "privacy-first, client-only", "Condition", "metaphor", "artistic, educational metaphor" in the intro paragraph
- Changed the comma before "not a diagnostic" to an em dash for natural flow

### Doc-3: docs/10_PRODUCT.md — Bold overuse (FIXED)
**File:** `docs/10_PRODUCT.md`
- Removed bold sentence opener "**Canonical product doc.**"
- Removed bold from "**invisible**" (mid-sentence emphasis)
- Removed bold from "**metaphorical**" and "**Condition**" in solution paragraph
- Removed bold from "**not**" (emphatic negation — classic AI slop)
- Removed bold from "**Stop Everything**" in feature list (plain feature name)

### Doc-4: docs/30_SAFETY_ETHICS.md — Bold overuse (FIXED)
**File:** `docs/30_SAFETY_ETHICS.md`
- Removed bold sentence opener "**Canonical safety and ethics doc.**"
- Removed bold from "**not**", "**metaphors**", "**experience dimensions**" in core framing
- Removed bold from "**bidirectional coupling layer**", "**perceptual metaphor of mutual reinforcement**", "**not**" in coupling section
- Removed bolded adjective series: "**optional**, **off by default**, **local-only**" on mic description
- Removed bold from "**hypotheses**" in example mappings

### Doc-5: docs/40_CONDITIONS.md — Bold overuse (FIXED)
**File:** `docs/40_CONDITIONS.md`
- Removed bold from sentence opener, "metaphorical AV presets", "experience dimensions", "data-driven presets", "not", "phenomenon", "Condition Composer", "effective overlay", "perceptual metaphor", "evidence-linked", "global safety clamps", "Interaction Amount", "always clamped", "dimension", "profile"
- Added contraction: "It's always clamped" for natural flow

### Doc-6: docs/SECURITY.md — Bold overuse + CSP factual corrections (FIXED)
**File:** `docs/SECURITY.md`
- Removed bold from "**must not**" and "**no**" (mid-sentence emphasis)
- Fixed `connect-src 'none'` → `connect-src 'self'` (matches deployed headers; `'none'` breaks Vite HMR)
- Updated meta-tag CSP example: removed `frame-ancestors 'none'` (it's silently ignored in meta delivery), added clarifying note
- Updated HTTP header example to match full deployed CSP from vite.config.ts/public/_headers

### Doc-7: docs/REFERENCES_AUDIT.md + docs/references/README.md — Bold overuse (FIXED)
- REFERENCES_AUDIT.md: removed "**evidence-linked**" (line 3)
- references/README.md: removed bold from "evidence navigation layer", "in-repo evidence document", "design rationales", "artistic, educational metaphor", "experience dimensions", "metaphor targets", "documents that exist in this repo", "evidence gap", "communication tool", "Stop Everything/Safe Mode/Reduced Motion" in safety list

### Doc-8: src/conditions/README.md + MAPPING.md — Bold overuse + stale template (FIXED)
- README.md: removed bold from "data-driven condition authoring layer", "metaphorical", "experience dimensions" (mid-sentence), "informed by literature", "implementation-facing", "intended interfaces"; removed stale `Generated: {today}` template artifact
- MAPPING.md: removed bold from "experience dimensions", "educational", "non-diagnostic", "about the underlying experience dimension", "HIGH" (in prose), italics from "not", "phenomenology"

### Doc-9: docs/references/EVIDENCE_MATRIX.md + CONTRIBUTIONS_AND_LIMITS.md + src/conditions/EVIDENCE.md — Bold overuse (FIXED)
- EVIDENCE_MATRIX.md: removed "**metaphor design rationale**" mid-sentence bold
- CONTRIBUTIONS_AND_LIMITS.md: removed bold from "**audiovisual metaphors**", "**experience dimensions**", "**signal metaphors**", "**motif choices**", "**interpretive**", "**Add or edit**"
- EVIDENCE.md: removed bold opener, "**Evidence strength**", "**experience dimension**", "**not**"

### Doc-10: All motif docs (20 files) + condition docs (8 files) — Template bold/italic (FIXED)
- Bulk removed 4 template patterns across 28 files: `*reported phenomena*` (italic), `**artistic/engineering implementation**`, `**evidence corpus**`, `**phenomena**` in blockquote
- All motif and condition reference docs updated consistently via sed

### Doc-11: Final sweep — motifs/INDEX.md + 00_DOC_INVENTORY.md (FIXED/VERIFIED)
- motifs/INDEX.md: removed "**simulation motifs**" and "**experience dimensions and reported phenomena**" mid-sentence bold
- 00_DOC_INVENTORY.md: clean, no violations
- EVIDENCE_MATRIX.md table: bold dimension IDs and evidence labels in table cells are acceptable (reference data, not mid-sentence emphasis)
- Dimension docs lines 22-24: bold field-name descriptors in bullet lists are acceptable (definition-term pattern)
- Generated docs: not edited per audit rules
- No TODO/FIXME/HACK comments in source
- No AI slop words ("robust", "comprehensive", etc.) found in any source file or doc
- Source code comments checked: high quality, explain WHY not WHAT

### Doc-12: docs/references/reports/deep-research-report.md + deep-research-report-2.md — Citation artifacts + bold/italic overuse (FIXED)
**Files:** `docs/references/reports/deep-research-report.md`, `docs/references/reports/deep-research-report-2.md`
- Removed all AI citation artifacts (53 + 18 PUA-wrapped citation blocks U+E000/E002/E001, and 53 + 18 plain `citeturn...` strings) using Python byte-level regex
- Removed bold mid-sentence emphasis from prose sections of both reports (66 removals in report-1, 15 in report-2); definition-term bullets (`- **term**:`) retained
- Removed italic emphatic usage: `*not*` ×3 and `*intense but bounded*` in report-1; `*experience dimension*` in report-2
- Removed italic wrapping from archival AI meta-note at end of report-1
- Code block content (embedded dimension doc templates) preserved untouched

## Remaining Scope — Docs

*(none — all documentation reviewed)*

---

## Code Quality Audit Remaining Scope (Loop 1)
All items addressed — see Loop 1 completed items above.

---

# GitHub Polish & CI Audit Progress (Loop 4)

## Completed

### GH-1: LICENSE file (ADDED)
**Files:** `LICENSE`, `package.json`
- Created MIT License with copyright `2024 Sebastian Spicker`
- Added `"license": "MIT"` and `"author": "Sebastian Spicker"` to `package.json`

### GH-2: Issue templates (ADDED)
**Files:** `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`
- Bug report: browser/OS/camera context fields + console errors prompt
- Feature request: includes evidence and safety considerations fields (appropriate for this project's domain)

### GH-3: PR template (ADDED)
**File:** `.github/pull_request_template.md`
- Minimal: summary, motivation, safety/accessibility checklist (no strobe, no loud transients, Reduced Motion still works), test plan

### GH-4: CONTRIBUTING.md (ADDED)
**File:** `CONTRIBUTING.md`
- Setup instructions (clone → npm ci → npm run dev)
- Quality gates (lint, test, verify:contracts)
- Domain-specific guidance: what to contribute, what not to (no diagnostic language, no remote transmission, no strobe)
- Safety issue reporting pointer to docs/SECURITY.md

### GH-5: SECURITY.md — responsible disclosure section (ADDED)
**File:** `docs/SECURITY.md`
- GitHub already recognizes SECURITY.md in the `docs/` directory
- Added "Reporting a vulnerability" section at the top: email address, 7-day SLA, credit policy, and scope framing (local-only app, limited attack surface)
- Existing CSP/permissions/checklist content preserved

### GH-6: .gitignore audit (UPDATED)
**File:** `.gitignore`
- Already comprehensive for secrets/credentials (from Loop 1 hardening) ✓
- Added: `coverage/` (vitest coverage output), `.vite/` (Vite build cache)
- Added: `.claude/ralph-loop.local.md` (local session state, not shareable)
- Added: OS/editor artifacts: `Thumbs.db`, `ehthumbs.db`, `.idea/`, `*.sw?`
- No sensitive data or large binaries found in tracked files

### GH-7: CI review (REVIEWED + UPDATED)
**File:** `.github/workflows/ci.yml`
- Existing CI is well-hardened: SHA-pinned actions, `permissions: {}` workflow-level, `persist-credentials: false`, concurrency cancel ✓
- Node.js 20, `npm ci --ignore-scripts && npm rebuild` (supply-chain safe) ✓
- Typecheck, unit tests, contract verification, debug inspect, Playwright RC gate ✓
- Added: `npm audit --audit-level=high` (dependency security scan, Node.js equivalent of pip-audit; `--audit-level=high` avoids false-fails on the known unfixable moderate esbuild/Vite finding)
- Note: Python-specific scope items (ruff, mypy, pytest, pip-audit) are not applicable — this is a TypeScript project

### GH-8: Developer experience / README quickstart audit (REVIEWED + UPDATED)
**File:** `README.md`
- Quick Start (2 commands: `npm install` + `npm run dev`) is clear and minimal ✓
- Quality Gates section documents lint/test/verify/e2e commands ✓
- No Makefile needed — `package.json` scripts cover all common operations ✓
- Pre-commit hooks: not configured, but documented via CONTRIBUTING.md ("at least documented" criterion met) ✓
- Added "Contributing" section linking to CONTRIBUTING.md
- README covers: what the project does, install, run, quality gates, architecture, screenshots, docs ✓

## Remaining Scope — GitHub

*(none — all items addressed)*

---

# Final Opus Review (Loop 5)

## Completed

### R-1: Full review of all 87 modified files (REVIEWED)
**Scope:** Architectural sanity, Sonnet blind spots, consistency, logic/edge cases, writing/tone, ship-readiness

**Fixes applied:**
- `README.md`: Removed `**not**` (emphatic bold negation missed by Loop 3)
- `src/composer/composeCore.ts`: Replaced remaining `Math.max(0, Math.min(1, ...))` with `clamp01(...)` (Loop 1 miss)
- `src/composer/composeBlend.ts`: Removed dead `MotifDef` re-export with "backward compatibility" comment (unnecessary compat shim)
- `CONTRIBUTING.md`: Fixed placeholder `your-username` in clone URL → actual GitHub remote `sebastianspicker`

**Verified correct (no issues found):**
- Architecture: clean module boundaries (composer → conditions, UI → engine, no circular imports)
- `safeDisconnect` helper, `QUAD_VERTEX_SHADER` dedup, `scaleNumericParams` extraction — all justified, clean
- `stableUniqSorted` dedup removal in composeCore.ts — verified correct by tracing all push/dedup sites
- `presetShare.ts` base64 encoding — TextEncoder/TextDecoder migration correct
- Security headers consistent across vite.config.ts, public/_headers, and index.html meta CSP
- CI: SHA-pinned actions, least-privilege, persist-credentials:false, npm audit exits 0, all steps would pass
- GitHub templates: minimal, domain-appropriate (safety checklist in PR template)
- No AI slop words in any modified file (all grep matches were author surnames in citations)
- No remaining mid-sentence bold/italic emphasis in project docs (only definition terms, callout labels, table data remain — all acceptable)
- All bold patterns audited: every remaining `**term**` is either a definition term (`- **term**:`), a callout label (`> **Important:**`), a table cell, or a heading
- 45/45 tests pass, typecheck clean, build succeeds

## Remaining Scope — Final Review

*(none — review complete)*
