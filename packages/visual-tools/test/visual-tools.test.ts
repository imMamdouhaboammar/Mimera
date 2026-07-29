import { expect, test } from "bun:test";
import {
  applyMasksToRgbaBuffer,
  compareElementGeometry,
  compareRgbaBuffers,
  createDiffOverlayBuffer,
  createMaskRegion,
  measureGeometry,
  scoreVisualSimulation,
} from "../src/index.ts";

function createSolidRgbaImage(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
}

test("compareRgbaBuffers detects pixel mismatches accurately", () => {
  const ref = createSolidRgbaImage(10, 10, 255, 255, 255);
  const tgt = createSolidRgbaImage(10, 10, 255, 255, 255);

  // Mismatch a 2x2 corner region
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const idx = (y * 10 + x) * 4;
      tgt.data[idx] = 0;
      tgt.data[idx + 1] = 0;
      tgt.data[idx + 2] = 0;
    }
  }

  const result = compareRgbaBuffers(ref, tgt);
  expect(result.totalPixels).toBe(100);
  expect(result.mismatchedPixels).toBe(4);
  expect(result.mismatchRatio).toBe(0.04);
  expect(result.matchPercentage).toBe(96);
  expect(result.diffBoundingBox).toEqual({ x: 0, y: 0, width: 2, height: 2 });
});

test("measureGeometry and compareElementGeometry calculate deltas and spatial alignment", () => {
  const refGeo = measureGeometry({
    selector: "header.navbar",
    bounds: { x: 10, y: 10, width: 200, height: 50 },
    padding: { top: 10, bottom: 10, left: 15, right: 15 },
  });

  expect(refGeo.area).toBe(10000);
  expect(refGeo.aspectRatio).toBe(4);
  expect(refGeo.center).toEqual({ x: 110, y: 35 });

  const comp = compareElementGeometry(
    { selector: "header.navbar", bounds: { x: 10, y: 10, width: 200, height: 50 } },
    { selector: "header.navbar", bounds: { x: 12, y: 12, width: 200, height: 50 } },
  );

  expect(comp.delta.dx).toBe(2);
  expect(comp.delta.dy).toBe(2);
  expect(comp.isAligned).toBe(true);
  expect(comp.geometryScore).toBeGreaterThan(90);
});

test("applyMasksToRgbaBuffer ignores specified dynamic regions", () => {
  const image = createSolidRgbaImage(10, 10, 255, 0, 0);
  const mask = createMaskRegion("date-widget", { x: 0, y: 0, width: 5, height: 5 }, "timestamp");

  const masked = applyMasksToRgbaBuffer(image, [mask]);
  expect(masked.summary.maskedRegionCount).toBe(1);
  expect(masked.summary.maskedAreaPixels).toBe(25);
  // Verify first pixel of masked region is transparent fill
  expect(masked.image.data[0]).toBe(0);
});

test("createDiffOverlayBuffer produces a visual diff heatmap overlay", () => {
  const ref = createSolidRgbaImage(10, 10, 255, 255, 255);
  const tgt = createSolidRgbaImage(10, 10, 0, 0, 0);

  const overlay = createDiffOverlayBuffer(ref, tgt, "diff-highlight");
  expect(overlay.metadata.diffPixelCount).toBe(100);
  expect(overlay.metadata.highlightBoundingBox).toEqual({ x: 0, y: 0, width: 10, height: 10 });
});

test("scoreVisualSimulation enforces rules and veto thresholds", () => {
  const passingScore = scoreVisualSimulation({
    pixelDiff: {
      schemaVersion: "1",
      totalPixels: 10000,
      mismatchedPixels: 200,
      mismatchRatio: 0.02,
      matchPercentage: 98,
      diffBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
      dimensions: { width: 100, height: 100 },
    },
    criticalElementsPresent: true,
    contrastPass: true,
    now: "2026-07-29T12:00:00.000Z",
  });

  expect(passingScore.status).toBe("pass");
  expect(passingScore.overallScore).toBeGreaterThanOrEqual(80);
  expect(passingScore.vetoes).toHaveLength(0);

  const vetoedScore = scoreVisualSimulation({
    pixelDiff: {
      schemaVersion: "1",
      totalPixels: 10000,
      mismatchedPixels: 3000,
      mismatchRatio: 0.3,
      matchPercentage: 70,
      diffBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
      dimensions: { width: 100, height: 100 },
    },
    criticalElementsPresent: false,
    now: "2026-07-29T12:00:00.000Z",
  });

  expect(vetoedScore.status).toBe("vetoed");
  expect(vetoedScore.vetoes.length).toBeGreaterThanOrEqual(2);
  expect(vetoedScore.vetoes.some((v) => v.code === "UNACCEPTABLE_PIXEL_DRIFT")).toBe(true);
  expect(vetoedScore.vetoes.some((v) => v.code === "CRITICAL_ELEMENT_MISSING")).toBe(true);
});
