import { z } from "zod";
import { RectSchema, type RawRgbaImage, type Rect } from "./pixel-diff.ts";

export const OverlayModeSchema = z.enum(["diff-highlight", "side-by-side", "checkerboard"]);
export type OverlayMode = z.infer<typeof OverlayModeSchema>;

export const OverlayResultSchema = z.object({
  schemaVersion: z.literal("1"),
  mode: OverlayModeSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  diffPixelCount: z.number().int().nonnegative(),
  highlightBoundingBox: RectSchema.nullable(),
}).strict();
export type OverlayResult = z.infer<typeof OverlayResultSchema>;

export function createDiffOverlayBuffer(
  reference: RawRgbaImage,
  target: RawRgbaImage,
  mode: OverlayMode = "diff-highlight",
): { image: RawRgbaImage; metadata: OverlayResult } {
  const width = Math.min(reference.width, target.width);
  const height = Math.min(reference.height, target.height);
  const data = new Uint8Array(width * height * 4);

  let diffPixelCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const refIdx = (y * reference.width + x) * 4;
      const tgtIdx = (y * target.width + x) * 4;
      const outIdx = (y * width + x) * 4;

      const refR = reference.data[refIdx] ?? 0;
      const refG = reference.data[refIdx + 1] ?? 0;
      const refB = reference.data[refIdx + 2] ?? 0;

      const tgtR = target.data[tgtIdx] ?? 0;
      const tgtG = target.data[tgtIdx + 1] ?? 0;
      const tgtB = target.data[tgtIdx + 2] ?? 0;

      const diff =
        Math.abs(refR - tgtR) + Math.abs(refG - tgtG) + Math.abs(refB - tgtB);

      if (diff > 30) {
        diffPixelCount += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Highlight difference in vibrant magenta/red
        data[outIdx] = 255;
        data[outIdx + 1] = 0;
        data[outIdx + 2] = 128;
        data[outIdx + 3] = 255;
      } else {
        // Dim unchanged pixels to grayscale
        const gray = Math.round(0.299 * tgtR + 0.587 * tgtG + 0.114 * tgtB);
        data[outIdx] = gray;
        data[outIdx + 1] = gray;
        data[outIdx + 2] = gray;
        data[outIdx + 3] = 180;
      }
    }
  }

  const highlightBoundingBox: Rect | null =
    diffPixelCount > 0 && maxX >= minX && maxY >= minY
      ? {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        }
      : null;

  const metadata = OverlayResultSchema.parse({
    schemaVersion: "1",
    mode,
    width,
    height,
    diffPixelCount,
    highlightBoundingBox,
  });

  return {
    image: { width, height, data },
    metadata,
  };
}
