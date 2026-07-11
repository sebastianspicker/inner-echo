---
name: Inner Echo
description: A grounded, client-only media lab for careful audiovisual metaphors.
colors:
  night: "#080A0E"
  surface: "#11171A"
  surface-raised: "#182023"
  text: "#E6E8E9"
  muted: "#9AA4A8"
  border: "#2A3538"
  teal: "#7BC8C0"
  teal-strong: "#4FB3A9"
  danger: "#F0A0A0"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "10px"
  md: "14px"
  lg: "16px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  control-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
---

# Design System: Inner Echo

## Overview

**Creative North Star: "The Grounded Media Lab"**

Inner Echo is a product surface for a public, guided, client-only experience. Its near-black field and muted teal signal concentration and care, while the system font keeps explanations immediate and familiar. The visual system is quiet enough for an educational setting and expressive enough to frame media as a deliberate metaphor rather than a clinical instrument.

Evolve the current dark/teal identity toward opaque, restrained surfaces. Depth should come from tonal separation, spacing, and clear grouping—not decorative transparency, blur, or floating-card effects. The interface rejects wellness-app softness, clinical-dashboard density, AI-SaaS glassmorphism, and developer-console clutter.

- **Key characteristics:** near-black, low-distraction, clear, tactile, and calmly direct.
- **Density:** one primary task per region; advanced controls stay available but visually secondary.
- **Motion:** short state feedback only; sensory media remains bounded by Safe Mode and Reduced Motion.

## Colors

The palette uses near-black opaque layers and one low-chroma teal accent; color communicates action and state, never diagnosis or urgency by default.

### Primary

- **Quiet Teal** (`#7BC8C0`): the single affirmative accent for primary actions, selected controls, and focus reinforcement.
- **Deep Teal** (`#4FB3A9`): active or stronger emphasis only when it improves distinction from Quiet Teal.

### Neutral

- **Night** (`#080A0E`): page background and the visual field behind the experience.
- **Control Surface** (`#11171A`): opaque cards, panels, dialogs, and input backgrounds.
- **Raised Surface** (`#182023`): selected or temporarily elevated opaque surfaces.
- **Readable Text** (`#E6E8E9`), **Muted Text** (`#9AA4A8`), and **Structural Border** (`#2A3538`): reading hierarchy and boundaries.

### Named Rules

**The One Accent Rule.** Teal is reserved for meaningful action, selection, and focus. It should not become a decorative glow, gradient, or background wash.

**The Opaque Surface Rule.** New panels and dialogs use the named opaque surface tokens. Do not introduce `backdrop-filter`, translucent glass cards, or ambient blur as decoration.

## Typography

**Display Font:** `ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif`

**Body Font:** the same system stack.

**Label/Mono Font:** system sans for labels; `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace` only for compact runtime values.

**Character:** familiar and unperformed. Typography must make safety, permission, and explanatory copy easier to understand before it makes the surface feel branded.

### Hierarchy

- **Page title** (600–650, 20–28px, 1.2): the experience name and the few headings that orient a new visitor.
- **Section title** (600–650, 14–18px, 1.3): control groups and explanatory regions.
- **Body** (400, 16px, 1.55): consent, privacy, evidence, and action explanations; keep explanatory paragraphs comfortably readable.
- **Label** (600, 13px, 1.3): controls and concise status names; uppercase tracking is limited to short operational labels.
- **Runtime value** (400, 12px, 1.3): compact technical state only, never the primary instruction.

**The Plain-Language Rule.** Do not use typography, all-caps labels, or technical jargon to create artificial authority. Safety copy is direct sentence case.

## Elevation

Inner Echo is flat by default. Opaque tonal layers and a single 1px structural border separate regions. A small, tight shadow may establish a transient modal or menu boundary, but broad soft shadows, haze, and glow are not part of the resting interface.

**The No-Floating-Chrome Rule.** At rest, controls should read as part of a coherent workspace, not as a stack of detached glass cards.

## Components

### Buttons

- **Shape:** restrained rounding (10–14px), not pills by default; pills are reserved for compact statuses or filters.
- **Primary:** Quiet Teal on Night text, at least 44px high, used for the next intentional action such as beginning after consent.
- **Safety / stop:** opaque surface with a persistent danger-text and border distinction; it remains visible and never relies on hover alone.
- **Focus:** a 2px teal outline with a 3px offset; focus must stay visible against every opaque surface.

### Controls and Fields

- **Style:** opaque Control Surface, 1px Structural Border, 10px radius, and 44px minimum height for critical or touch-operable controls.
- **State:** selected, disabled, error, and busy states must be communicated in text or programmatic state as well as color.
- **Ranges:** retain clear value labels and provide a non-drag interaction where practical.

### Panels and Dialogs

- **Surface:** opaque Control Surface; 14–16px radius; no decorative blur.
- **Content:** safety and consent copy is readable before the primary action, with a clear non-immersive way to leave or defer.
- **Grouping:** use spacing and headings before adding nested cards or visual dividers.

### Navigation and Status

- **Status:** concise, truthful, and secondary to the current task; plain labels beat console-like diagnostics.
- **Evidence:** presented as a quiet explanatory route, not a technical sidebar competing with safety controls.

## Do's and Don'ts

### Do:

- **Do** preserve the near-black/teal identity using opaque `#11171A` and `#182023` surfaces.
- **Do** make complete keyboard workflows, visible focus, and 44px critical targets acceptance criteria for public-alpha work.
- **Do** keep Safe Mode, Reduced Motion, intensity, and Stop Everything directly reachable and accurately labelled.
- **Do** use short, grounded system typography and sentence-case explanations before permission requests.
- **Do** honor `prefers-reduced-motion` and retain in-product sensory safeguards.

### Don't:

- **Don't** make Inner Echo look like a wellness app, a clinical dashboard, an AI-SaaS glassmorphism surface, or a developer console.
- **Don't** introduce translucent floating cards, decorative `backdrop-filter`, broad glow, gradient text, or ambient blur as a default treatment.
- **Don't** turn every card or control into a full pill; reserve pill shapes for compact status or filter patterns.
- **Don't** use visual intensity, animation, or clinical-sounding language to imply a diagnosis, assessment, or treatment.
- **Don't** hide a safety control, reduced-motion alternative, focus state, or permission consequence behind hover-only affordances.
