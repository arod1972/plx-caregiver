# UI/UX Polish Pass Specification

**Version:** 1.0
**Date:** 2026-10-29
**Related:** SPEC.md Section 8 (Premier UI/UX Guidelines)
**Purpose:** Living guidance for the next visual polish pass. Elevate the app from functional scaffold to sleek, modern, professional, and pleasant. Eliminate AI-slop aesthetic. Include intentional metallic highlights as a refined accent.

## Aesthetic Target
Calm, trustworthy, warm-professional, modern, and pleasant. Refined restraint with intentional craft. Not cold clinical, not playful consumer, and not generic AI-generated. Think a carefully designed family tool that feels premium through typography, spacing, and subtle material details — not flashy effects.

## Key Problems Observed in Current Preview
- Generic empty-state language and bordered card treatment.
- Flat, heavy primary button without refined weight or radius.
- Loose but not purposeful hierarchy and spacing.
- Overall composition feels template-like rather than intentional.
- Missing subtle material or highlight details that signal polish.

## Required Refinements

### 1. Typography & Hierarchy
- Clear type scale with stronger weight contrast (title vs. body vs. caption).
- Slightly tighter tracking on small caps headers and titles where appropriate.
- Quieter secondary text (date, subtitle) using muted warm gray.
- Parent mode large text must still feel elegant, not oversized defaults.
- Consistent line-height and optical sizing.

### 2. Spacing & Composition
- Strict 8pt grid with deliberate vertical rhythm.
- Generous side margins (24pt) and increased breathing room around key actions.
- Left-aligned content with purposeful section spacing.
- Avoid stacked, even gaps; create clear visual groups.

### 3. Components
- **Primary button:** Softer corner radius (12–16pt), reduced height or padding, less visual dominance while remaining tappable. Label treatment refined.
- **Cards / empty states:** Softer borders or very subtle elevation. More internal padding. Remove or quiet generic bordered empty-state cards.
- **Empty states:** Shorter, more human copy. Minimal line icon or subtle custom element instead of text-only boxes. Example direction: “Nothing scheduled” / “Appointments and visits will appear here.”
- **Tabs:** Quieter treatment (icon weight, label size, or active indicator).

### 4. Color & Material Details
- Warm neutrals + restrained sage accent.
- **Intentional metallic highlights:** Subtle metallic sheen or highlight on select elements (e.g., thin metallic edge or soft gradient on primary button, icon accents, or card top edge). Use sparingly for polish — not chrome overload or glassmorphism. Support light and dark modes. Avoid pure black/white and AI gradients.
- Soft shadows only where they add depth without clutter.

### 5. Motion
- Subtle, purposeful transitions only. No bouncy or excessive animation.

## Anti-Slop Guardrails (Still Mandatory)
- No default Expo styling without heavy customization.
- No purple/blue AI gradients, floating orbs, sparkles, stock AI senior illustrations, emoji overload, mismatched radii, or cluttered density.
- Every element must use design-system tokens.
- Screens must pass: “Does this look like a polished product a family would trust with sensitive caregiving information?”

## Acceptance Criteria for the Polish Pass
- Calendar, Tasks, Meds, Updates, and Profile screens updated with the refinements above.
- Metallic highlights applied intentionally and sparingly.
- Empty states rewritten and restyled.
- Light + dark mode screenshots included in the PR.
- Parent mode (Extra large text) still feels refined.
- No new features; visual and copy polish only.

## Build Agent Instructions
1. Read this document and SPEC.md Section 8.
2. Implement the polish pass as a focused PR.
3. Include before/after or updated screenshots (light and dark).
4. Update SPEC.md tracker if a new task ID is added, or reference this file in the PR.
5. Do not expand scope into new features or architecture changes.

## Status

**Done.** Merged in https://github.com/arod1972/plx-caregiver/pull/14 on 2026-10-29. Calendar, Tasks, Meds, Updates, and Profile include the refinements above. Light, dark, and parent-mode screenshots are in `screenshots/ui-pass/`. The header remains the placeholder. No further visual pass is queued in this document.

---

**Note:** Naming exercise (app name research to avoid crowded-field duplicates) will follow after this polish pass is defined. Current header “PRIMALUX CARE” is a placeholder tied to the company brand.