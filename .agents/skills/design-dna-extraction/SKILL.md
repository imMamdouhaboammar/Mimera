---
name: design-dna-extraction
description: Extracts design tokens, color harmony, typography hierarchy, vertical rhythm, and page decomposition hypotheses from multi-viewport reference evidence in Mimera. Formulates tokens into CSS custom properties and component boundary definitions without guessing.
---

# Design DNA Extraction Skill

This skill governs the extraction, synthesis, and codification of visual design tokens and structural component boundaries from captured multi-viewport DOM evidence.

## Core Objectives

1. **Deterministic Token Synthesis**:
   - Aggregate computed style evidence across captured viewports (Desktop `1440px`, Tablet `768px`, Mobile `390px`).
   - Extract raw CSS color values and map them by frequency and semantic role (`background`, `foreground`, `accent`, `border`).
   - Determine baseline vertical rhythm and spacing scales using greatest common divisor (GCD) analysis of padding and margin values.
2. **Typography Hierarchy Modeling**:
   - Detect primary and secondary font families (including self-hosted `@font-face` fonts).
   - Infer font size scales and line height ratios for structural roles:
     - `heroTitle`: 48px - 72px+
     - `sectionTitle`: 28px - 40px
     - `cardTitle`: 20px - 24px
     - `body`: 14px - 16px
     - `caption` / `metadata`: 11px - 13px
3. **Page Decomposition & Component Hypotheses**:
   - Partition the page into distinct component boundaries:
     - Navigation / Header (`navbar`, `header`)
     - Hero Section (`hero-banner`, `hero-visual`)
     - Feature Matrix / Bento Grids
     - Interactive Showcases (Carousels, Video players, Tabs)
     - Testimonial / Proof sections
     - Footer / Legal navigation
   - Assign responsive behavior rules (e.g. `stack-vertically`, `hide-on-mobile`, `wrap-grid`).

## CLI Execution

```bash
# Analyze captured evidence to generate Design DNA and page decomposition
bun mimera analyze
```

## Generated Artifacts

Executing `bun mimera analyze` produces two cryptographic evidence payloads in SQLite:
1. `design-dna`: Contains `palette`, `typography`, `spacingScale`, `rhythmUnit`, and `responsiveRules`.
2. `page-decomposition`: Contains `components` array with bounding boxes, tag hierarchies, and assigned selectors.

## Codification Pattern

Translate extracted Design DNA into clean CSS variables in your target stylesheet (e.g. `src/styles/tokens.css`):

```css
:root {
  /* Extracted Palette */
  --bg-primary: #0a0a0c;
  --bg-surface: #141419;
  --text-primary: #ffffff;
  --text-muted: #8e8ea0;
  --accent-glow: #6366f1;

  /* Extracted Spacing Rhythm */
  --rhythm-unit: 8px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 64px;

  /* Typography */
  --font-display: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```
