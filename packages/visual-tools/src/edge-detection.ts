import { z } from "zod";
import type { RawRgbaImage, Rect } from "./pixel-diff.ts";
import { compareRgbaBuffers } from "./pixel-diff.ts";

export const EdgeSimilarityResultSchema = z.object({
  edgeMse: z.number().min(0),
  edgeScore: z.number().min(0).max(100),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
}).strict();
export type EdgeSimilarityResult = z.infer<typeof EdgeSimilarityResultSchema>;

export const ColorHistogramResultSchema = z.object({
  similarity: z.number().min(0).max(1),
  colorScore: z.number().min(0).max(100),
}).strict();
export type ColorHistogramResult = z.infer<typeof ColorHistogramResultSchema>;

export const VisualParityResultSchema = z.object({
  schemaVersion: z.literal("1"),
  overallScore: z.number().min(0).max(100),
  structuralEdgeScore: z.number().min(0).max(100),
  rawPixelScore: z.number().min(0).max(100),
  colorHistogramScore: z.number().min(0).max(100),
  edgeMse: z.number().min(0),
  status: z.enum(["pass", "fail"]),
  threshold: z.number().min(0).max(100),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
}).strict();
export type VisualParityResult = z.infer<typeof VisualParityResultSchema>;

export interface EdgeOptions {
  ignoredRegions?: Rect[] | undefined;
  multiplier?: number | undefined; // Default 1.5 as in vision_inspector.py
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isPixelIgnored(x: number, y: number, regions?: Rect[]): boolean {
  if (!regions || regions.length === 0) return false;
  for (const r of regions) {
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
      return true;
    }
  }
  return false;
}

/**
 * Computes gradient magnitudes using 3x3 Sobel filters.
 */
function computeSobelMagnitudes(image: RawRgbaImage, targetWidth: number, targetHeight: number): Float32Array {
  const magnitudes = new Float32Array(targetWidth * targetHeight);
  const { width, height, data } = image;

  // Pre-calculate grayscale luminance map
  const gray = new Float32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      if (x < width && y < height) {
        const idx = (y * width + x) * 4;
        gray[y * targetWidth + x] = getLuminance(data[idx]!, data[idx + 1]!, data[idx + 2]!);
      } else {
        gray[y * targetWidth + x] = 0;
      }
    }
  }

  // Apply Sobel kernels (excluding boundary 1px)
  for (let y = 1; y < targetHeight - 1; y++) {
    for (let x = 1; x < targetWidth - 1; x++) {
      const top = (y - 1) * targetWidth;
      const mid = y * targetWidth;
      const bot = (y + 1) * targetWidth;

      const p00 = gray[top + x - 1]!;
      const p01 = gray[top + x]!;
      const p02 = gray[top + x + 1]!;
      const p10 = gray[mid + x - 1]!;
      const p12 = gray[mid + x + 1]!;
      const p20 = gray[bot + x - 1]!;
      const p21 = gray[bot + x]!;
      const p22 = gray[bot + x + 1]!;

      // Horizontal gradient Gx
      // -1  0  1
      // -2  0  2
      // -1  0  1
      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;

      // Vertical gradient Gy
      // -1 -2 -1
      //  0  0  0
      //  1  2  1
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

      magnitudes[y * targetWidth + x] = Math.hypot(gx, gy);
    }
  }

  return magnitudes;
}

export function calculateStructuralEdgeSimilarity(
  reference: RawRgbaImage,
  target: RawRgbaImage,
  options: EdgeOptions = {},
): EdgeSimilarityResult {
  const width = Math.min(reference.width, target.width);
  const height = Math.min(reference.height, target.height);
  const totalPixels = width * height;

  if (totalPixels === 0) {
    return {
      edgeMse: 0,
      edgeScore: 100,
      dimensions: { width: Math.max(1, width), height: Math.max(1, height) },
    };
  }

  const refEdges = computeSobelMagnitudes(reference, width, height);
  const tgtEdges = computeSobelMagnitudes(target, width, height);

  let sumDiffSq = 0;
  let evaluatedPixels = 0;
  const multiplier = options.multiplier ?? 1.5;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (isPixelIgnored(x, y, options.ignoredRegions)) {
        continue;
      }
      const idx = y * width + x;
      const diff = refEdges[idx]! - tgtEdges[idx]!;
      sumDiffSq += diff * diff;
      evaluatedPixels++;
    }
  }

  const edgeMse = evaluatedPixels > 0 ? sumDiffSq / evaluatedPixels : 0;
  const edgeScore = Math.max(0, Math.min(100, 100.0 - (Math.sqrt(edgeMse) / 255.0) * 100.0 * multiplier));

  return EdgeSimilarityResultSchema.parse({
    edgeMse: Math.round(edgeMse * 100) / 100,
    edgeScore: Math.round(edgeScore * 100) / 100,
    dimensions: { width, height },
  });
}

export function calculateColorHistogramSimilarity(
  reference: RawRgbaImage,
  target: RawRgbaImage,
  binsPerChannel = 16,
): ColorHistogramResult {
  const width = Math.min(reference.width, target.width);
  const height = Math.min(reference.height, target.height);
  const totalPixels = width * height;

  if (totalPixels === 0) {
    return { similarity: 1, colorScore: 100 };
  }

  const binSize = 256 / binsPerChannel;
  const totalBins = binsPerChannel * 3; // R, G, B
  const histRef = new Float32Array(totalBins);
  const histTgt = new Float32Array(totalBins);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const refIdx = (y * reference.width + x) * 4;
      const tgtIdx = (y * target.width + x) * 4;

      const rRef = Math.min(binsPerChannel - 1, Math.floor(reference.data[refIdx]! / binSize));
      const gRef = Math.min(binsPerChannel - 1, Math.floor(reference.data[refIdx + 1]! / binSize));
      const bRef = Math.min(binsPerChannel - 1, Math.floor(reference.data[refIdx + 2]! / binSize));

      const rTgt = Math.min(binsPerChannel - 1, Math.floor(target.data[tgtIdx]! / binSize));
      const gTgt = Math.min(binsPerChannel - 1, Math.floor(target.data[tgtIdx + 1]! / binSize));
      const bTgt = Math.min(binsPerChannel - 1, Math.floor(target.data[tgtIdx + 2]! / binSize));

      histRef[rRef]!++;
      histRef[binsPerChannel + gRef]!++;
      histRef[binsPerChannel * 2 + bRef]!++;

      histTgt[rTgt]!++;
      histTgt[binsPerChannel + gTgt]!++;
      histTgt[binsPerChannel * 2 + bTgt]!++;
    }
  }

  // Normalize histograms (sum across 3 channels = totalPixels * 3)
  const normFactor = totalPixels * 3;
  for (let i = 0; i < totalBins; i++) {
    const r = histRef[i] ?? 0;
    const t = histTgt[i] ?? 0;
    histRef[i] = r / normFactor;
    histTgt[i] = t / normFactor;
  }

  // Histogram intersection similarity: sum(min(h1[i], h2[i]))
  let intersection = 0;
  for (let i = 0; i < totalBins; i++) {
    intersection += Math.min(histRef[i]!, histTgt[i]!);
  }

  const similarity = Math.max(0, Math.min(1, intersection));
  const colorScore = Math.round(similarity * 10000) / 100;

  return ColorHistogramResultSchema.parse({
    similarity: Math.round(similarity * 10000) / 10000,
    colorScore,
  });
}

export interface VisualParityOptions {
  threshold?: number | undefined; // Default 90.0
  ignoredRegions?: Rect[] | undefined;
}

export function calculateVisualParity(
  reference: RawRgbaImage,
  target: RawRgbaImage,
  options: VisualParityOptions = {},
): VisualParityResult {
  const threshold = options.threshold ?? 90.0;
  const edgeResult = calculateStructuralEdgeSimilarity(reference, target, {
    ignoredRegions: options.ignoredRegions,
  });
  const colorResult = calculateColorHistogramSimilarity(reference, target);
  const pixelResult = compareRgbaBuffers(reference, target, {
    ignoredRegions: options.ignoredRegions,
  });

  const rawPixelScore = pixelResult.matchPercentage;
  const structuralEdgeScore = edgeResult.edgeScore;
  const colorHistogramScore = colorResult.colorScore;

  // Weighted formulation: 65% Edge geometry, 25% Pixel match, 10% Color palette
  const overallScore =
    Math.round((structuralEdgeScore * 0.65 + rawPixelScore * 0.25 + colorHistogramScore * 0.1) * 100) / 100;

  const status = overallScore >= threshold ? "pass" : "fail";

  return VisualParityResultSchema.parse({
    schemaVersion: "1",
    overallScore,
    structuralEdgeScore,
    rawPixelScore,
    colorHistogramScore,
    edgeMse: edgeResult.edgeMse,
    status,
    threshold,
    dimensions: edgeResult.dimensions,
  });
}
