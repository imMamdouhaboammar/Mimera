---
name: visual-verification
description: Automated Playwright computer-vision inspection and verification skill for Mimera. Captures side-by-side screenshots between reference URL and local build, calculates structural edge similarity (Sobel MSE), color histogram correlation, and pixel diffs, generates heatmap overlays, and enforces the strict +90% parity gate.
---

# Visual Verification Skill

This skill governs the automated computer-vision inspection phase of the Mimera reference engineering loop.

## Core Mandates

1. **Side-by-Side Dual Viewport Capture**:
   - Capture reference URL and target URL under identical coordinates:
     - Desktop: `1440 x 900`
     - Mobile: `390 x 844`
   - Capture increments: `0px` (Hero/Navbar), `700px`, `1400px`, `2100px`, `2800px`, `3500px`, `4200px`.
2. **Dynamic Noise Normalization**:
   - Before capturing, execute DOM opacity normalization to prevent false positives from asynchronous video frames or canvas animations:
     ```javascript
     document.querySelectorAll('iframe, video, canvas').forEach(el => el.style.opacity = '0.3');
     ```
3. **Triple-Metric Parity Scoring**:
   - **Structural Edge Score (65% weight)**: Sobel gradient filtering and edge MSE calculation.
   - **Pixel Match Score (25% weight)**: Raw RGBA pixel difference matching.
   - **Color Histogram Score (10% weight)**: 48-bin RGB color distribution correlation.
4. **Veto Gates**:
   - Max element displacement > 50px = AUTOMATIC VETO (`LAYOUT_DISPLACEMENT_EXCEEDED`).
   - Missing critical element = AUTOMATIC VETO (`CRITICAL_ELEMENT_MISSING`).
   - Overall score < 90.0% = FAILED BUILD (`NEEDS_REVISION`).

## CLI Execution

```bash
# Execute full multi-viewport audit
bun mimera simulate --reference <reference-url> --target <target-url> --threshold 90

# Or execute with custom output directory
bun mimera simulate --reference <reference-url> --target http://localhost:5173/ --output .mimera/visual-audit --threshold 90
```

## Refinement Action Plan When Score < 90%

1. **Check Font Sizes & Line Heights**:
   - Inspect the live DOM computed style:
     ```javascript
     const s = window.getComputedStyle(element);
     console.log(s.fontSize, s.lineHeight, s.fontWeight);
     ```
   - Update CSS with exact extracted values.
2. **Check Margin & Padding**:
   - Check element bounding boxes using MCP tool `visual.measure_geometry`.
   - Correct padding/margin in CSS tokens.
3. **Check Background Marquees & Watermarks**:
   - Ensure semi-transparent background text or infinite keyframe marquees are present.
4. **Re-run Audit**:
   - Re-run `bun mimera simulate` until overall score >= 90.0%.
