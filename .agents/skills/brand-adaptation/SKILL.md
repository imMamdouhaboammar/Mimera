---
name: brand-adaptation
description: Governs the systematic adaptation and re-theming of a reference design's extracted DNA to match a target brand's identity, colors, typography, and assets while strictly preserving layout geometry, responsive flow, and interaction physics.
---

# Brand Adaptation Skill

This skill governs transforming an extracted reference design into a custom-branded implementation. It ensures structural geometry and interaction fidelity are preserved while applying your custom brand tokens.

## Core Principles

1. **Structural Edge Invariance**:
   - Sobel edge detection in `@mimera/visual-tools` measures structural boundaries, spatial alignments, and geometry independently of hue/saturation.
   - You can adapt brand colors while still running `bun mimera simulate` to verify structural edge fidelity (aiming for >= 90% structural edge parity).
2. **Deterministic Token Mapping**:
   - Define a 1-to-1 mapping from reference tokens to target brand tokens.
   - Maintain contrast ratios and luminance hierarchy:
     - Reference Dark Background -> Target Brand Dark Background
     - Reference Primary Accent -> Target Brand Accent
     - Reference Muted Surface -> Target Brand Surface
3. **Typography Substitution with Metric Compensation**:
   - When substituting the reference font with your brand font, compensate for differing x-heights and ascender/descender metrics by fine-tuning `line-height` and `letter-spacing`.
4. **Asset & Copy Adaptation**:
   - Replace reference SVGs and brand logos with target SVG assets.
   - Maintain the identical bounding box dimensions and `aspect-ratio` to prevent layout shift.
   - Ensure placeholder copy adheres to similar character lengths as the reference to prevent line wrapping anomalies.

## Workflow

```
[Extracted Reference DNA]
          │
          ▼
┌───────────────────────────┐
│ Brand Token Transformation│
│ - Color palette remap     │
│ - Font family remap       │
│ - Logo / asset swap       │
└───────────────────────────┘
          │
          ▼
┌───────────────────────────┐
│ Geometry Preservation     │
│ - Keep padding & margins  │
│ - Keep flex/grid layout   │
│ - Keep keyframe physics   │
└───────────────────────────┘
          │
          ▼
┌───────────────────────────┐
│ Structural Verification   │
│ - Edge MSE >= 90%         │
│ - Box alignment <= 2px dev│
└───────────────────────────┘
```

## Token Remapping Example

```typescript
export const brandMapping = {
  colors: {
    // Reference token -> Brand token
    "rgba(10, 10, 12, 1)": "var(--brand-dark-bg)",
    "rgba(99, 102, 241, 1)": "var(--brand-primary-indigo)",
    "rgba(255, 255, 255, 0.7)": "var(--brand-text-secondary)",
  },
  typography: {
    displayFont: "'Cabinet Grotesk', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
  },
  assets: {
    logo: "/assets/brand-logo.svg",
  }
};
```
