import { z } from "zod";

export const RectSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();
export type Rect = z.infer<typeof RectSchema>;

export const PixelDiffOptionsSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.1),
  includeBoundingBox: z.boolean().default(true),
  ignoredRegions: z.array(RectSchema).optional(),
}).strict();
export type PixelDiffOptions = z.infer<typeof PixelDiffOptionsSchema>;

export const PixelDiffResultSchema = z.object({
  schemaVersion: z.literal("1"),
  totalPixels: z.number().int().nonnegative(),
  mismatchedPixels: z.number().int().nonnegative(),
  mismatchRatio: z.number().min(0).max(1),
  matchPercentage: z.number().min(0).max(100),
  diffBoundingBox: RectSchema.nullable(),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).strict(),
}).strict();
export type PixelDiffResult = z.infer<typeof PixelDiffResultSchema>;

export interface RawRgbaImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

function isPixelInRegions(x: number, y: number, regions: Rect[]): boolean {
  for (const region of regions) {
    if (
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    ) {
      return true;
    }
  }
  return false;
}

export function compareRgbaBuffers(
  reference: RawRgbaImage,
  target: RawRgbaImage,
  rawOptions: Partial<PixelDiffOptions> = {},
): PixelDiffResult {
  const options = PixelDiffOptionsSchema.parse(rawOptions);
  const width = Math.min(reference.width, target.width);
  const height = Math.min(reference.height, target.height);
  const totalPixels = width * height;

  if (totalPixels === 0) {
    return PixelDiffResultSchema.parse({
      schemaVersion: "1",
      totalPixels: 0,
      mismatchedPixels: 0,
      mismatchRatio: 0,
      matchPercentage: 100,
      diffBoundingBox: null,
      dimensions: { width: Math.max(1, width), height: Math.max(1, height) },
    });
  }

  const thresholdDistance = options.threshold * 255 * 4;
  const ignored = options.ignoredRegions ?? [];

  let mismatchedPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (ignored.length > 0 && isPixelInRegions(x, y, ignored)) {
        continue;
      }

      const idx = (y * width + x) * 4;
      const refR = reference.data[idx] ?? 0;
      const refG = reference.data[idx + 1] ?? 0;
      const refB = reference.data[idx + 2] ?? 0;
      const refA = reference.data[idx + 3] ?? 255;

      const tgtIdx = (y * target.width + x) * 4;
      const tgtR = target.data[tgtIdx] ?? 0;
      const tgtG = target.data[tgtIdx + 1] ?? 0;
      const tgtB = target.data[tgtIdx + 2] ?? 0;
      const tgtA = target.data[tgtIdx + 3] ?? 255;

      const diff =
        Math.abs(refR - tgtR) +
        Math.abs(refG - tgtG) +
        Math.abs(refB - tgtB) +
        Math.abs(refA - tgtA);

      if (diff > thresholdDistance) {
        mismatchedPixels += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const mismatchRatio = totalPixels > 0 ? mismatchedPixels / totalPixels : 0;
  const matchPercentage = Math.max(0, Math.min(100, (1 - mismatchRatio) * 100));

  const diffBoundingBox =
    mismatchedPixels > 0 && maxX >= minX && maxY >= minY
      ? {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        }
      : null;

  return PixelDiffResultSchema.parse({
    schemaVersion: "1",
    totalPixels,
    mismatchedPixels,
    mismatchRatio: Math.round(mismatchRatio * 10000) / 10000,
    matchPercentage: Math.round(matchPercentage * 100) / 100,
    diffBoundingBox,
    dimensions: { width, height },
  });
}
