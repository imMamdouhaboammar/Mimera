import { z } from "zod";
import { RectSchema, type RawRgbaImage, type Rect } from "./pixel-diff.ts";

export const MaskReasonSchema = z.enum([
  "timestamp",
  "avatar",
  "dynamic-text",
  "advertisement",
  "animation",
  "user-defined",
]);
export type MaskReason = z.infer<typeof MaskReasonSchema>;

export const MaskRegionSchema = RectSchema.extend({
  id: z.string().min(1),
  reason: MaskReasonSchema.default("user-defined"),
}).strict();
export type MaskRegion = z.infer<typeof MaskRegionSchema>;

export const MaskingResultSchema = z.object({
  schemaVersion: z.literal("1"),
  maskedRegionCount: z.number().int().nonnegative(),
  maskedAreaPixels: z.number().int().nonnegative(),
  regions: z.array(MaskRegionSchema),
}).strict();
export type MaskingResult = z.infer<typeof MaskingResultSchema>;

export function createMaskRegion(
  id: string,
  rect: Rect,
  reason: MaskReason = "user-defined",
): MaskRegion {
  return MaskRegionSchema.parse({
    id,
    ...rect,
    reason,
  });
}

export function applyMasksToRgbaBuffer(
  image: RawRgbaImage,
  regions: MaskRegion[],
  fillColor: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 },
): { image: RawRgbaImage; summary: MaskingResult } {
  const data = new Uint8Array(image.data);
  let totalMaskedPixels = 0;

  for (const region of regions) {
    const minX = Math.max(0, Math.min(image.width, region.x));
    const maxX = Math.max(0, Math.min(image.width, region.x + region.width));
    const minY = Math.max(0, Math.min(image.height, region.y));
    const maxY = Math.max(0, Math.min(image.height, region.y + region.height));

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const idx = (y * image.width + x) * 4;
        data[idx] = fillColor.r;
        data[idx + 1] = fillColor.g;
        data[idx + 2] = fillColor.b;
        data[idx + 3] = fillColor.a;
        totalMaskedPixels += 1;
      }
    }
  }

  const summary = MaskingResultSchema.parse({
    schemaVersion: "1",
    maskedRegionCount: regions.length,
    maskedAreaPixels: totalMaskedPixels,
    regions,
  });

  return {
    image: {
      width: image.width,
      height: image.height,
      data,
    },
    summary,
  };
}
