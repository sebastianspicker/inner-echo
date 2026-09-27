# Inner Echo — design brief

Branch: `design/plates-and-captions` · Written 2026-09-27

## 1. Product summary

Inner Echo is a local browser tool that lays a gentle audiovisual metaphor over the viewer's own
camera feed, so that an invisible inner state (focus tightening, colour draining, a steady pulse) has
something to point at in a conversation. It composes an "experience" from thirteen documented
dimensions (Hyperarousal, Derealization, Time Dilation, …), from eight curated collections, or from a
weighted blend of collections, then renders it with WebGL over the camera. Optional synthesized sound
and optional microphone coupling are separate. Safe Mode, Reduced Motion, a global intensity and Stop
Everything bound everything. Every mapping is backed by a bundled evidence corpus that states its
confidence and its limits. There is no backend, account, recording or upload.

It ships two entries: the live app and a device-free mock at `/demo/` that uses the same vocabulary
with deterministic fake state.

**Moment of value:** the first seconds after "Start camera", when the viewer sees their own face
changed by a named, bounded metaphor and can say "yes, a bit like that" or "no, it is more like…".
The value is the *conversation* the image unlocks, not the image itself.

## 2. Audience

| | Primary: facilitator | Secondary: explorer | Tertiary: reviewer |
| --- | --- | --- | --- |
| Who | Therapist, counsellor, psycho-educator or lecturer using the tool with a client or class | An adult exploring their own or a friend's experience | Researcher or designer auditing how evidence maps to audiovisual behaviour |
| Expertise | Clinical/educational literacy; reads papers; low patience for tech ceremony | Mixed; may be in a fragile moment | High; reads the evidence drawer first |
| Goal | Get a calm, credible image on screen quickly, adjust it live while talking | Find words for something hard to describe | Check claims, limits, sources |
| Anxieties | Looking unprofessional; a flashy or alarming effect upsetting a client; privacy | Being diagnosed or judged; being recorded | Overclaiming; decorative pseudo-science |
| Distrusts | "Simulator" gimmicks, wellness pastel, biometric dashboards, dark-pattern consent | Clinical coldness; gamification | Unlabelled confidence, charts without data |
| Signals quality | Restraint, honest labelling, printed-matter seriousness (journals, good textbooks), controls that behave exactly as labelled | Warmth, calm, no surprises | Citations, precise wording, visible limits |

The primary user is the facilitator: a design that works for someone showing it to a vulnerable
person on a laptop or projector also works for the explorer, and the reviewer mostly lives in the
evidence drawer.

## 3. Key journeys

1. **First visit:** Welcome → read the three commitments (local, you control, interpretation) →
   optionally read the evidence method → Continue to setup. No permission prompt.
2. **Primary: compose and look.** Setup → choose dimensions or a curated collection → adjust
   intensity/Safe Mode/Reduced Motion → Start camera → watch the plate → adjust intensity and profile
   controls live → Stop Everything.
3. **Add sound:** Sound & microphone → Enable audio (in the click) → optionally enable microphone →
   adjust volume/sensitivity/gate/input mode.
4. **Evidence:** from any evidence link → dialog with topics, sanitized Markdown, and a safety summary.
5. **Save and share:** name → Save new / Update / Load / Delete / Undo; copy configuration or a
   `#preset=` link that never activates media.
6. **Failure paths:** permission denied, device missing, stream interrupted, renderer fallback,
   catalog or profile load error — each visible, with a recovery action.

## 4. Brand character

| Trait | …not tipping into |
| --- | --- |
| **Candid** — says exactly what is running and what an image is not | confessional, over-disclaimed, legalistic |
| **Unhurried** — quiet pacing, generous space, nothing blinks | sleepy, vague, spa-like |
| **Scholarly** — sources, captions, careful vocabulary | academic, cold, dense |
| **Humane** — warm materials, plain verbs, the person is never the subject of measurement | sentimental, therapeutic-kitsch |
| **Exact** — alignments, numerals and states are precise | technical, instrument-like, "lab dashboard" |

## 5. Market observations

Closest neighbours, from category knowledge (no live competitor review was run from this
environment; the observations are general):

- **Empathy "simulators"** (VR/AR schizophrenia, dyslexia, depression simulators; museum
  installations): dark, glitchy, dramatic, often claim to show "what it is like". Inner Echo must
  look like the opposite of that claim.
- **Mental-health and wellness apps** (meditation, mood tracking, CBT companions): pastel gradients,
  rounded cards, blob illustrations, friendly sans. Signals "consumer wellness", which PRODUCT.md
  explicitly rejects ("wellness wizard").
- **Clinical/assessment tools** (questionnaires, EHR-adjacent): blue-white, forms, scores. Signals
  diagnosis, which the product must never imply.
- **Camera toys / creative-coding tools** (lens apps, TouchDesigner-style UIs, VJ tools): black
  canvases, neon, parameter walls. Signals spectacle and expertise.

Conventions to **honour** (users depend on them): the camera preview as the largest object once live;
a persistent, red-family stop action; toggles that look like switches; native form controls for
selects; a single primary action per state.

Conventions to **break**: dark-mode-by-default "techy" atmosphere; cards and tinted icon tiles; tag
chips for evidence; anything that suggests a readout of the person.

## 6. Current state

- **Stack:** React 19 + Vite 8, plain CSS files per feature (BEM-ish `ie-*`, `composer__*`,
  `evidence-*`), a tiny token set in `src/index.css`, no component library. Strict CSP:
  `style-src 'self'` (no inline `style` attributes) and `default-src 'self'` (fonts must be
  self-hosted). The demo is a separate vanilla-TS page with its own CSS.
- **Brand assets:** an "aperture" mark of three nested arcs and a dot (`assets/brand/`), in mint
  `#8BD8CE`; a Georgia display + system-sans pairing; a dark teal ground.
- **Keep:** the aperture mark (evolved in colour, not form); the product voice (already candid and
  specific); the serif-display instinct; the headline "Notice what shifts."; all copy that tests or
  docs rely on for state (Start camera, Stop Everything, Enable audio, `Audio: on`, …).
- **Weaknesses:**
  - Generic dark-teal + mint "calm app" palette; Georgia and the system sans read as unauthored.
  - Two typographic systems: the evidence dialog switches to an all-caps, letter-spaced mono
    grotesk that belongs to a different product.
  - Setup has no clear reading order; a hidden `CompositionMap` ships as dead UI (`display: none`).
  - Evidence strength badges are colour-coded and then all overridden to the same grey.
  - The idle preview is a dashed-icon placeholder that says little; the live preview's only label is
    a small chip.
  - Buttons, panels and callouts are uniform 8px-radius boxes; the right panel is a card.
  - The demo shares nothing visual with the app beyond the mark (◈ glyph icons, "status strip").
- **Constraints (load-bearing):** every label and ID the workspace tests query; the lazy boundaries
  `bundle:verify` checks; Safe Mode/Reduced Motion semantics; CSP; the `/demo/` closure (no imports
  outside `src/demo`/`src/shared`, no media or network); the Pages base path; storage keys and the
  `#preset=` grammar; 44px primary targets; keyboard and status semantics.

## 7. Assumptions log

| # | Assumption | Evidence | Confidence |
| --- | --- | --- | --- |
| A1 | The facilitator (therapist/educator) is the primary audience | PRODUCT.md audience order; "conversation prompts", "facilitated educational discussion"; copy is written to be read aloud | Medium |
| A2 | Sessions happen on laptops and projectors in daylight rooms as often as at night | Educational/therapy use; "technical demonstration" | Low |
| A3 | A light, paper-toned default is more trustworthy for this audience than the current dark UI | Wellness/simulator/VJ categories are dark or pastel; journals and textbooks are the audience's quality reference | Medium |
| A4 | Users with dark system settings (or night sessions) still need a dark theme | A2 is low-confidence; screen glare with a vulnerable person matters | High → ship both, follow `prefers-color-scheme` |
| A5 | No web font may be loaded from a CDN | CSP `default-src 'self'`, `style-src 'self'` in `tools/shared/csp.mjs` | High |
| A6 | Test-visible copy must be preserved verbatim | `tests/app/workspace-workflows.test.ts` queries button text and status strings | High |
| A7 | Reviewers need the evidence drawer to be comfortable for long reading | The drawer renders full research notes | High |
| A8 | Mobile is used mostly for the explorer journey, not facilitation | Facilitation implies a shared larger screen | Low → mobile is still designed as its own layout |
| A9 | Inner Echo must not look like a sibling of the owner's other local product, "Otherlight" | Found running on this machine during review: warm paper `#F3EFE6`, STIX Two + Atkinson Hyperlegible Next/Mono, black buttons, mono "PLATE 1" labels | High → direction revised (see "Revision after first render") |

---

## Design Direction

### Method

The product's own substance: research notes, an evidence matrix, *figures* that illustrate a
described experience, captions that frame an image as an interpretation, footnotes, and a strict
honesty about limits. Its ritual: two people looking at one screen and talking. Its emotional state:
careful, a little exposed.

### Direction A — "Plates & Captions" (chosen, then revised as "The Mirror and its Caption")

**Concept.** Inner Echo as an illustrated monograph. Each camera rendering is a *plate*; every plate
carries a *caption* that names what it shows and states what it is not ("an interpretation, not a
reproduction"). Evidence is footnoting; comfort controls are the reader's own settings. In
psychology and art-history books, a plate with a caption is exactly how you show an image *about*
something without claiming it *is* the thing. That is Inner Echo's ethical position, made visual.

**Why it fits.** Facilitators and reviewers trust printed-matter seriousness; explorers get warmth
(paper, serif, generous measure) instead of clinical white or techy black. Captions let the interface
be honest in its own voice rather than through warning boxes.

**Typography.** Type carries the personality.
- *Newsreader* (Production Type, OFL): variable optical sizes. Display at light weights with high
  `opsz` for titles; italic for captions and asides. It is a text face built for reading on screen.
- *Atkinson Hyperlegible Next* (Braille Institute, OFL): every control, label and UI sentence. Its
  distinct letterforms were designed for low-vision legibility, which fits a product whose design
  principles put accessibility first, and it is not a default.
- *Atkinson Hyperlegible Mono* (OFL): numerals only — percentages, plate numbers, state readouts —
  so values align and never jitter.
- Scale (px): 12 · 13 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 64 · 88. UI body 16, captions 18
  italic, section titles 28–36, the welcome title up to 88.

**Colour.** Warm paper, one ink, one annotation colour, one stop colour.
- Paper `#F2EEE5`, recessed paper `#E9E3D6`, sheet `#FAF8F3`; ink `#1C1A17`, secondary ink
  `#4E4940`, tertiary `#6A6458`; hairline rules.
- *Verdigris* `#1D5B54`: the only accent — selection, focus, links. It is the old brand mint, taken
  down to an ink that holds 7:1 on paper.
- *Vermilion* `#AE3120`: Stop Everything and errors only.
- *Ochre* `#7F5500`: comfort notes and cautions.
- The plate ground is near-black in both themes, like a photograph on a printed page.
- Night reading (dark): warm charcoal paper `#151412`, ink `#ECE7DC`, verdigris becomes the original
  mint `#86C9BD`.

**Layout.** A book grid, not a dashboard. Desktop setup: a narrow margin column for section numerals,
the choice column at a readable measure, and a sticky plate column. Sections are separated by
hairline rules and numbered like chapters (`01 Choose`, `02 Comfort`, `03 Plate`), never boxed in
cards. Live mode widens the plate column so the image dominates. Mobile is one column with the
numerals moving inline and a pinned stop bar.

**Motion.** Almost none. Disclosures open with a 220 ms opacity shift; the plate "exposes" (fades up
over 400 ms) when the camera starts; switches slide 140 ms. No scroll effects, no hover lifts.
Reduced Motion and the OS preference remove all of it.

**Signature details.**
1. *The caption.* Under the camera plate: a figure number, the composition in words with its
   weights, and the italic line "An interpretation, not a reproduction." It is accurate: it reads the
   real renderer state and the real selection.
2. *Evidence as footnote marks.* Evidence strength is set like a citation grade: a small mono label
   with a three-step tally (`●●● high`, `●●○ medium`, `●○○ low`, `○○○ hypothesis`), always with the
   word, never colour alone.

**Stands apart** from simulators (no drama, no darkness by default), wellness (no pastel, no blobs,
no cards), clinical tools (no blue, no forms-as-scores) and VJ tools (no parameter wall).

**Refuses:** gradients of any kind, glow, shadows as depth, rounded cards, icon tiles, emoji, chips,
all-caps letter-spaced mono labels, and any visual that reads as a measurement of the person.

### Direction B — "Darkroom"

**Concept.** A photographic darkroom: controlled light, a safelight, images that develop slowly
under the viewer's control; a contact sheet of dimensions.
**Type.** A condensed grotesk (e.g. *Schibsted Grotesk*) with *IBM Plex Mono* for exposure-style
numbers. **Colour.** Warm black, amber safelight accent, paper-white prints. **Layout.** Full-bleed
stage, contact-sheet grid of dimensions, a thin exposure-strip control rail. **Motion.** Slow
"develop" fades. **Signature.** Contact-sheet thumbnails with grease-pencil selection marks; an
exposure dial for intensity. **Stands apart** from pastel wellness. **Refuses** glow and neon.

### Direction C — "Consulting Room"

**Concept.** The physical room where facilitated sessions happen: linen, wood, a lamp; one thing at a
time. **Type.** A soft humanist sans (*Figtree*) with a warm serif for quotations. **Colour.** Linen,
clay, sage. **Layout.** A single centred column of large steps (choose → comfort → look), big touch
targets. **Motion.** Gentle step transitions. **Signature.** A "two chairs" layout that places the
plate between prompts for the facilitator and the explorer. **Refuses** density.

### Evaluation

| Criterion | A · Plates & Captions | B · Darkroom | C · Consulting Room |
| --- | --- | --- | --- |
| Grows from the product's substance (evidence, interpretation) | Strong: caption and footnote *are* the ethic | Medium: photographic, but "developing" implies revealing a truth | Weak: about the setting, not the content |
| Avoids category look-alikes | Strong | Medium: close to simulator/VJ darkness | Weak: near wellness apps |
| PRODUCT.md "calm, precise, editorial, not a lab or wizard" | Strong | Medium | Weak: a wizard by construction |
| Robust if A2/A3 are wrong | Good: dark theme ships too | Poor in daylight/projectors | Good |
| Accessibility | Strong (Atkinson, high-contrast inks) | Amber-on-black strains contrast | Strong |
| Implementation fit (plain CSS, existing structure) | Good | Needs layout rework of the stage | Needs flow rework of workflows |

**Choice: A**, revised as below. It is the only direction where the signature details carry the product's most
important message (this is an interpretation, here is the evidence, here are its limits) instead of
decorating around it.

**Trade-offs accepted.** A light default gives up some of the immersive feel a dark room gives the
camera image; the near-black plate ground and the dark theme recover most of it. Book typography
takes more vertical space than a dense control panel; that is intended, since the controls are
meant to recede.

### Revision after first render: "The Mirror and its Caption"

The first render was reviewed next to another product on this machine, Otherlight, which already
owns warm paper, a book serif, Atkinson Hyperlegible Next/Mono, black rectangular buttons and mono
"PLATE" labels. Plates & Captions as first specified would have read as Otherlight's sibling, which
fails the specificity bar. The concept keeps its substance (captions state what the image is not,
evidence is a grade) and changes every surface where the two would overlap:

| Aspect | First specification | Shipped |
| --- | --- | --- |
| Ground | Warm paper `#F2EEE5` | **Mist** `#E8ECE6`: the pale green-grey of breath on glass; night mist `#111514` |
| UI face | Atkinson Hyperlegible Next | **Inclusive Sans** (Olivia King, OFL): accessibility-led, rounder, warmer |
| Numerals | Atkinson Hyperlegible Mono | **Newsreader lining tabular figures**. No mono web font ships; code uses the system mono |
| Shape | Hairlines, 2–3px corners, black primary | **Round, after the aperture mark**: pill buttons, verdigris primary (the brand's colour), ringed serif numerals |
| Stage | "Plate" rectangle with "Plate —" label | **The mirror**: the only arched object on the page (shallow arch, square foot); the caption sits centred under it without a label |
| Section marks | Mono `01 02 03` | **Ringed italic numerals** `1 2 3` with a faint second ring, a small echo of the mark |

Signature details as shipped:
1. *The arched mirror and its caption.* The camera stage is arched like a mirror; beneath it an
   italic caption names the real selection with its weights ("Derealization 50%, Hyperarousal 50%.")
   and a constant second line: "An interpretation, not a reproduction."
2. *Evidence grade.* A three-dot tally plus one word (`●●○ medium`), with the full label
   ("Experience evidence: medium") kept for assistive technology.
3. *Echo numerals.* Ringed serif numerals number the setup (1 Pattern, 2 Comfort, 3 Preview) and the
   welcome's three commitments.

Exceptions to the anti-pattern list, justified: pill buttons are round for a reason here (they
derive from the aperture's arcs and separate "press" from "read", which stays rectilinear); the one
large radius is the mirror, and nothing else is a rounded card; there are no shadows except the
thumb and numeral rings, which are drawn as outlines.

---

## Outcome

**Concept.** Inner Echo is a mirror with a caption. The camera is the one arched, dark object on a
pale mist page; everything around it is quiet printed matter that says what the image shows, what
it is not, and how strong the evidence behind it is.

### Key decisions

| Decision | Why |
| --- | --- |
| Mist ground (`#E8ECE6`) and night mist, following the system theme | Avoids both the category's dark "simulator" look and wellness pastel; the night theme covers dim rooms and low-confidence assumption A2 |
| Newsreader for voice and numerals, Inclusive Sans for controls, no mono web font | Type carries the character; serif numerals read as a book, not an instrument |
| Verdigris as the only accent, vermilion only for Stop Everything and errors | One annotation colour; the stop path can't be confused with anything else |
| Arched mirror + italic caption under the stage | The product's ethic ("an interpretation, not a reproduction") becomes the visual signature, and it reads the real selection |
| Evidence as a tally plus one word | Keeps grades legible at a glance without colour-only coding; full labels stay for assistive tech |
| Live mode leads with the mirror at every width | On phones the mirror used to sit below the whole pattern list |
| One design system in `src/shared/design/` for app and demo | The demo now looks like the product it demonstrates, and the zero-threshold duplication gate stays at zero |

### Functional changes (all minimal)

- **Live-mode DOM order.** The controls panel renders before the choice column while the camera is
  active, so focus order matches the new visual order. Children are keyed so React moves the choice
  column and never remounts the panel that owns the `<video>` and canvases; a workflow test pins
  that the `<video>` element survives.
- **`CompositionMap` removed.** It shipped hidden (`display: none`); `PlateCaption` replaces its
  intent visibly.
- **`strengthBadge` gains a `grade` field.** The label is unchanged; the new `EvidenceGrade`
  component renders the tally and word.
- **Copy.** Workspace title and lede, the comfort heading and lede, the welcome lede and third
  commitment, the composed-profile summary, the filter count ("13 listed"), the demo readouts
  (sentence case), and the HTML titles and descriptions. Every string the tests query is unchanged.
- **Assets.** Self-hosted OFL fonts with licence texts in `public/third-party-licenses/` and a
  "Bundled fonts" section in the notices; the brand mark and favicon recoloured (same geometry);
  README screenshots regenerated.

### Assumptions to revisit

- **A1 (facilitator is primary, medium).** If explorers dominate, the design still holds: nothing
  depends on a second person, and the copy addresses "you".
- **A2/A3 (daylight rooms; light is more trustworthy, low/medium).** Both themes ship and follow the
  OS; if dark proves preferred, only the default changes, not the system.
- **A8 (mobile is secondary, low).** Mobile got its own decisions (stop bar, mirror-first live,
  three-cell tabs), so a mobile-heavy audience is served.
- **A9 (distinct from Otherlight, high).** Judge side by side; the shared ground is only "serif plus
  calm", which the category allows.

### Verification

- `npm run verify` exits 0 under Node 22.23.3 (203 tests, contracts, docs, architecture,
  zero duplication). The shell's default Node 26 fails the jsdom suites because Node 25+ ships its
  own `localStorage` global; this predates the redesign.
- `INNER_ECHO_PAGES_BASE_PATH=/inner-echo/ npm run pages:build && npm run pages:verify` exits 0;
  under the production CSP meta tag both font families load and no CSP violation is logged.
- Rendered review with Playwright at 390, 820 and 1440 px, light and dark, covering welcome, setup,
  curated, dimensions selected, live, sound on, camera denied, evidence (overview and matrix), and
  the demo (welcome, setup, running): 78 captures, no console errors.

### Unresolved and next steps

1. No in-app theme switch; the theme follows the OS. A facilitator presenting on a projector may
   want one. Add it as a stored per-viewer preference with a new storage key and a migration note.
2. Newsreader roman and italic are about 115 KB each even with trimmed axes. Subsetting to the
   characters the UI and corpus use, or preloading only the roman, would cut first-paint cost.
3. Manual screen-reader and real-device passes (iOS Safari, Android Chrome, Windows high contrast)
   are still owed; PRODUCT.md already says conformance is not claimed.
4. The live screenshots use a synthetic camera clip, not a person, on purpose. Real-camera
   screenshots with consent would show the product more truthfully.
5. On phones, the setup intro (title, lede, profile summary, caveats) is long before the list; a
   collapsed "About this interpretation" could shorten it if users skim.
