import { expect, test } from "bun:test";
import {
  calculateColorHistogramSimilarity,
  calculateStructuralEdgeSimilarity,
  calculateVisualParity,
} from "../src/edge-detection.ts";
import type { RawRgbaImage } from "../src/pixel-diff.ts";

function createPatternImage(width: number, height: number, patternType: "stripes" | "solid" | "shifted"): RawRgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (patternType === "solid") {
        data[idx] = 100;
        data[idx + 1] = 100;
        data[idx + 2] = 100;
        data[idx + 3] = 255;
      } else if (patternType === "stripes") {
        const val = (x % 4 < 2) ? 255 : 0;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      } else if (patternType === "shifted") {
        const val = ((x + 1) % 4 < 2) ? 255 : 0;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
  }
  return { width, height, data };
}

test("calculateStructuralEdgeSimilarity computes 100% score for identical edge patterns", () => {
  const img1 = createPatternImage(20, 20, "stripes");
  const img2 = createPatternImage(20, 20, "stripes");

  const result = calculateStructuralEdgeSimilarity(img1, img2);
  expect(result.edgeMse).toBe(0);
  expect(result.edgeScore).toBe(100);
});

test("calculateColorHistogramSimilarity detects identical color distributions", () => {
  const img1 = createPatternImage(20, 20, "stripes");
  const img2 = createPatternImage(20, 20, "shifted");

  // Same amount of black & white pixels, so color histogram similarity should be very high
  const result = calculateColorHistogramSimilarity(img1, img2);
  expect(result.similarity).toBeGreaterThan(0.95);
  expect(result.colorScore).toBeGreaterThan(95);
});

test("calculateVisualParity evaluates combined structural parity with configurable threshold", () => {
  const ref = createPatternImage(30, 30, "stripes");
  const target = createPatternImage(30, 30, "stripes");

  const parity = calculateVisualParity(ref, target, { threshold: 90.0 });
  expect(parity.status).toBe("pass");
  expect(parity.overallScore).toBe(100);
  expect(parity.structuralEdgeScore).toBe(100);
  expect(parity.rawPixelScore).toBe(100);
  expect(parity.colorHistogramScore).toBe(100);

  // Different pattern
  const solid = createPatternImage(30, 30, "solid");
  const failParity = calculateVisualParity(ref, solid, { threshold: 90.0 });
  expect(failParity.status).toBe("fail");
  expect(failParity.overallScore).toBeLessThan(90.0);
});
