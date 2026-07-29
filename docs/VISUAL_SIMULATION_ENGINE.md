# Mimera Visual Inspection & Visual Simulation Engine

The **Visual Inspection & Visual Simulation Engine** (`@mimera/visual-tools`) provides deterministic visual inspection, pixel-level diffing, spatial geometry measurement, dynamic region masking, diff overlay generation, and rule-based fidelity scoring for reference-driven interface engineering.

---

## Core Capabilities

### 1. Pixel-Level Diffing (`pixel-diff.ts`)

Calculates pixel-by-pixel color differences between RGBA screenshot buffers or images.

- **Threshold Pacing**: Configurable per-channel RGBA tolerance threshold (default: 0.1).
- **Metrics**: Calculates total pixels, mismatched pixels, mismatch ratio, and match percentage (0-100%).
- **Diff Bounding Box**: Isolates the exact minimum bounding rectangle surrounding all visual mismatches.

```ts
import { compareRgbaBuffers } from "@mimera/visual-tools";

const result = compareRgbaBuffers(referenceImage, targetImage, {
  threshold: 0.1,
  ignoredRegions: [{ x: 0, y: 0, width: 100, height: 40 }],
});

console.log(result.matchPercentage); // e.g. 98.5%
console.log(result.diffBoundingBox); // { x: 10, y: 15, width: 120, height: 45 }
```

---

### 2. Box-Model & Spatial Geometry (`geometry.ts`)

Measures and compares element bounding boxes, center-point alignment, padding, margin, area, and aspect ratio.

- **Positional Deltas**: Calculates horizontal/vertical shifts ($\Delta x$, $\Delta y$) and size deltas ($\Delta \text{width}$, $\Delta \text{height}$).
- **Spatial Center Distance**: Computes Euclidean distance between element centers ($\sqrt{\Delta x^2 + \Delta y^2}$).
- **Alignment Detection**: Flags elements as aligned when spatial drift is within strict tolerances ($\le 2\text{px}$ position, $\le 5\text{px}$ size).

```ts
import { compareElementGeometry } from "@mimera/visual-tools";

const comparison = compareElementGeometry(
  { selector: "header.navbar", bounds: { x: 0, y: 0, width: 1280, height: 64 } },
  { selector: "header.navbar", bounds: { x: 0, y: 0, width: 1280, height: 64 } }
);

console.log(comparison.isAligned); // true
console.log(comparison.geometryScore); // 100
```

---

### 3. Dynamic Region Masking (`masking.ts`)

Excludes dynamic or volatile UI components (e.g. current timestamps, user avatars, animated badges, advertisements) from visual diffing to eliminate false positives.

```ts
import { applyMasksToRgbaBuffer, createMaskRegion } from "@mimera/visual-tools";

const timeMask = createMaskRegion(
  "timestamp-widget",
  { x: 1100, y: 10, width: 150, height: 30 },
  "timestamp"
);

const { image, summary } = applyMasksToRgbaBuffer(rawImage, [timeMask]);
```

---

### 4. Diff Overlay Heatmaps (`overlay.ts`)

Generates visual diff overlay buffers highlighting pixel mismatches in vibrant magenta/red over a desaturated grayscale background.

```ts
import { createDiffOverlayBuffer } from "@mimera/visual-tools";

const { image, metadata } = createDiffOverlayBuffer(refImage, targetImage, "diff-highlight");
console.log(metadata.highlightBoundingBox);
```

---

### 5. Rule-Based Visual Simulation Scoring (`scorer.ts`)

Evaluates total visual fidelity score (0-100) using a weighted composition of sub-scores while enforcing strict **Veto Rules**:

#### Weighted Score Composition
1. **Structural Alignment** (35%): Spatial element placement and center-point geometry.
2. **Spacing & Box-Model** (25%): Padding, margin, and boundary alignment precision.
3. **Typography & Hierarchy** (20%): Font scale, line height, and contrast compliance.
4. **Style & Brand Harmony** (20%): Brand-token-adjusted color mapping and border radii.

#### Veto Rules (Absolute Gate Criteria)
- **`UNACCEPTABLE_PIXEL_DRIFT`**: Triggered when pixel mismatch ratio exceeds 25%.
- **`LAYOUT_DISPLACEMENT_EXCEEDED`**: Triggered when maximum element spatial drift exceeds 50px.
- **`CRITICAL_ELEMENT_MISSING`**: Triggered when a required layout element is absent.
- **`CONTRAST_VIOLATION`**: Triggered when text-to-background contrast ratio fails WCAG AA standards.

```ts
import { scoreVisualSimulation } from "@mimera/visual-tools";

const score = scoreVisualSimulation({
  pixelDiff: pixelDiffResult,
  geometryComparisons: [navGeometry],
  criticalElementsPresent: true,
  contrastPass: true,
  brandMappingApplied: true,
});

console.log(score.status); // "pass" | "fail" | "vetoed"
console.log(score.overallScore); // e.g. 94.2
```

---

## MCP Tool Surface

All 6 Vision capabilities are exposed through Model Context Protocol (MCP) tools in `@mimera/mcp-server`:

- `visual.compare`
- `visual.compare_element`
- `visual.measure_geometry`
- `visual.create_overlay`
- `visual.score`
- `visual.mask_dynamic_region`
