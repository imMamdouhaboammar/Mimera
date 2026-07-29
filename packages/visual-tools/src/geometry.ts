import { z } from "zod";
import { RectSchema, type Rect } from "./pixel-diff.ts";

export const BoxSpacingSchema = z.object({
  top: z.number().nonnegative().default(0),
  right: z.number().nonnegative().default(0),
  bottom: z.number().nonnegative().default(0),
  left: z.number().nonnegative().default(0),
}).strict();
export type BoxSpacing = z.infer<typeof BoxSpacingSchema>;

export const ElementGeometrySchema = z.object({
  schemaVersion: z.literal("1"),
  selector: z.string().min(1),
  bounds: RectSchema,
  padding: BoxSpacingSchema,
  margin: BoxSpacingSchema,
  area: z.number().nonnegative(),
  aspectRatio: z.number().positive(),
  center: z.object({
    x: z.number(),
    y: z.number(),
  }).strict(),
}).strict();
export type ElementGeometry = z.infer<typeof ElementGeometrySchema>;

export const GeometryComparisonSchema = z.object({
  schemaVersion: z.literal("1"),
  selector: z.string().min(1),
  reference: ElementGeometrySchema,
  target: ElementGeometrySchema,
  delta: z.object({
    dx: z.number(),
    dy: z.number(),
    dWidth: z.number(),
    dHeight: z.number(),
    centerDistance: z.number().nonnegative(),
    areaRatio: z.number().nonnegative(),
  }).strict(),
  geometryScore: z.number().min(0).max(100),
  isAligned: z.boolean(),
}).strict();
export type GeometryComparison = z.infer<typeof GeometryComparisonSchema>;

export interface MeasureGeometryInput {
  selector: string;
  bounds: Rect;
  padding?: { top?: number | undefined; right?: number | undefined; bottom?: number | undefined; left?: number | undefined };
  margin?: { top?: number | undefined; right?: number | undefined; bottom?: number | undefined; left?: number | undefined };
}

export function measureGeometry(input: MeasureGeometryInput): ElementGeometry {
  const bounds = RectSchema.parse(input.bounds);
  const padding = BoxSpacingSchema.parse(input.padding ?? {});
  const margin = BoxSpacingSchema.parse(input.margin ?? {});
  const area = bounds.width * bounds.height;
  const aspectRatio = bounds.width / bounds.height;
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };

  return ElementGeometrySchema.parse({
    schemaVersion: "1",
    selector: input.selector,
    bounds,
    padding,
    margin,
    area,
    aspectRatio: Math.round(aspectRatio * 1000) / 1000,
    center,
  });
}

export function compareElementGeometry(
  referenceInput: MeasureGeometryInput,
  targetInput: MeasureGeometryInput,
): GeometryComparison {
  const reference = measureGeometry(referenceInput);
  const target = measureGeometry(targetInput);

  const dx = target.bounds.x - reference.bounds.x;
  const dy = target.bounds.y - reference.bounds.y;
  const dWidth = target.bounds.width - reference.bounds.width;
  const dHeight = target.bounds.height - reference.bounds.height;

  const centerDistance = Math.sqrt(
    Math.pow(target.center.x - reference.center.x, 2) +
      Math.pow(target.center.y - reference.center.y, 2),
  );

  const areaRatio = reference.area > 0 ? target.area / reference.area : 1;

  // Compute a normalized geometry score (0-100)
  const posError = Math.min(100, (centerDistance / Math.max(100, reference.bounds.width)) * 100);
  const sizeError = Math.min(
    100,
    (Math.abs(dWidth) / reference.bounds.width + Math.abs(dHeight) / reference.bounds.height) * 50,
  );
  const geometryScore = Math.max(0, Math.min(100, 100 - (posError * 0.5 + sizeError * 0.5)));

  const isAligned = Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && Math.abs(dWidth) <= 5 && Math.abs(dHeight) <= 5;

  return GeometryComparisonSchema.parse({
    schemaVersion: "1",
    selector: reference.selector,
    reference,
    target,
    delta: {
      dx,
      dy,
      dWidth,
      dHeight,
      centerDistance: Math.round(centerDistance * 100) / 100,
      areaRatio: Math.round(areaRatio * 1000) / 1000,
    },
    geometryScore: Math.round(geometryScore * 100) / 100,
    isAligned,
  });
}
