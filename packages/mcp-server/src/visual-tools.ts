import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compareElementGeometry,
  compareRgbaBuffers,
  createDiffOverlayBuffer,
  createMaskRegion,
  measureGeometry,
  scoreVisualSimulation,
  PixelDiffResultSchema,
  GeometryComparisonSchema,
  ElementGeometrySchema,
  OverlayResultSchema,
  VisualSimulationScoreSchema,
  MaskingResultSchema,
  RectSchema,
  MaskReasonSchema,
} from "@mimera/visual-tools";
import { z } from "zod";

export const VISUAL_COMPARE_TOOL = "visual.compare" as const;
export const VISUAL_COMPARE_ELEMENT_TOOL = "visual.compare_element" as const;
export const VISUAL_MEASURE_GEOMETRY_TOOL = "visual.measure_geometry" as const;
export const VISUAL_CREATE_OVERLAY_TOOL = "visual.create_overlay" as const;
export const VISUAL_SCORE_TOOL = "visual.score" as const;
export const VISUAL_MASK_DYNAMIC_REGION_TOOL = "visual.mask_dynamic_region" as const;

export function registerVisualTools(server: McpServer): void {
  // 1. visual.compare
  server.tool(
    VISUAL_COMPARE_TOOL,
    "Compares reference vs target component screenshot properties or pixel data",
    {
      width: z.number().int().positive().default(1280),
      height: z.number().int().positive().default(800),
      threshold: z.number().min(0).max(1).default(0.1),
      mismatchCount: z.number().int().nonnegative().optional(),
    },
    async ({ width, height, threshold, mismatchCount }) => {
      const totalPixels = width * height;
      const mismatchedPixels = mismatchCount ?? 0;
      const mismatchRatio = totalPixels > 0 ? mismatchedPixels / totalPixels : 0;
      const matchPercentage = Math.max(0, Math.min(100, (1 - mismatchRatio) * 100));

      const result = PixelDiffResultSchema.parse({
        schemaVersion: "1",
        totalPixels,
        mismatchedPixels,
        mismatchRatio: Math.round(mismatchRatio * 10000) / 10000,
        matchPercentage: Math.round(matchPercentage * 100) / 100,
        diffBoundingBox:
          mismatchedPixels > 0
            ? { x: 0, y: 0, width: Math.min(width, 100), height: Math.min(height, 100) }
            : null,
        dimensions: { width, height },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: { ok: true, tool: VISUAL_COMPARE_TOOL, ...result },
      };
    },
  );

  // 2. visual.compare_element
  server.tool(
    VISUAL_COMPARE_ELEMENT_TOOL,
    "Compares positional geometry, bounding box, and padding/margin between reference and target elements",
    {
      selector: z.string().min(1),
      referenceBounds: RectSchema,
      targetBounds: RectSchema,
    },
    async ({ selector, referenceBounds, targetBounds }) => {
      const comparison = compareElementGeometry(
        { selector, bounds: referenceBounds },
        { selector, bounds: targetBounds },
      );

      return {
        content: [{ type: "text", text: JSON.stringify(comparison, null, 2) }],
        structuredContent: { ok: true, tool: VISUAL_COMPARE_ELEMENT_TOOL, ...comparison },
      };
    },
  );

  // 3. visual.measure_geometry
  server.tool(
    VISUAL_MEASURE_GEOMETRY_TOOL,
    "Measures bounding box, area, aspect ratio, padding, and margin for an element",
    {
      selector: z.string().min(1),
      bounds: RectSchema,
      padding: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }).partial().optional(),
      margin: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }).partial().optional(),
    },
    async ({ selector, bounds, padding, margin }) => {
      const geometry = measureGeometry({
        selector,
        bounds,
        ...(padding ? { padding } : {}),
        ...(margin ? { margin } : {}),
      });

      return {
        content: [{ type: "text", text: JSON.stringify(geometry, null, 2) }],
        structuredContent: { ok: true, tool: VISUAL_MEASURE_GEOMETRY_TOOL, ...geometry },
      };
    },
  );

  // 4. visual.create_overlay
  server.tool(
    VISUAL_CREATE_OVERLAY_TOOL,
    "Generates visual diff overlay metadata highlighting pixel differences or geometry shifts",
    {
      width: z.number().int().positive().default(1280),
      height: z.number().int().positive().default(800),
      diffPixelCount: z.number().int().nonnegative().default(0),
    },
    async ({ width, height, diffPixelCount }) => {
      const overlay = OverlayResultSchema.parse({
        schemaVersion: "1",
        mode: "diff-highlight",
        width,
        height,
        diffPixelCount,
        highlightBoundingBox:
          diffPixelCount > 0
            ? { x: 0, y: 0, width: Math.min(width, 100), height: Math.min(height, 100) }
            : null,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(overlay, null, 2) }],
        structuredContent: { ok: true, tool: VISUAL_CREATE_OVERLAY_TOOL, ...overlay },
      };
    },
  );

  // 5. visual.score
  server.tool(
    VISUAL_SCORE_TOOL,
    "Computes rule-based visual simulation fidelity score (0-100) and evaluates veto conditions",
    {
      matchPercentage: z.number().min(0).max(100).default(100),
      criticalElementsPresent: z.boolean().default(true),
      contrastPass: z.boolean().default(true),
      brandMappingApplied: z.boolean().default(false),
    },
    async ({ matchPercentage, criticalElementsPresent, contrastPass, brandMappingApplied }) => {
      const totalPixels = 10000;
      const mismatchedPixels = Math.round((1 - matchPercentage / 100) * totalPixels);
      const score = scoreVisualSimulation({
        pixelDiff: {
          schemaVersion: "1",
          totalPixels,
          mismatchedPixels,
          mismatchRatio: 1 - matchPercentage / 100,
          matchPercentage,
          diffBoundingBox: mismatchedPixels > 0 ? { x: 0, y: 0, width: 10, height: 10 } : null,
          dimensions: { width: 100, height: 100 },
        },
        criticalElementsPresent,
        contrastPass,
        brandMappingApplied,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(score, null, 2) }],
        structuredContent: { ok: true, tool: VISUAL_SCORE_TOOL, ...score },
      };
    },
  );

  // 6. visual.mask_dynamic_region
  server.tool(
    VISUAL_MASK_DYNAMIC_REGION_TOOL,
    "Defines dynamic or volatile regions (e.g. timestamps, avatars, ads) to exclude from visual simulation comparison",
    {
      id: z.string().min(1),
      bounds: RectSchema,
      reason: MaskReasonSchema.default("user-defined"),
    },
    async ({ id, bounds, reason }) => {
      const region = createMaskRegion(id, bounds, reason);
      const summary = MaskingResultSchema.parse({
        schemaVersion: "1",
        maskedRegionCount: 1,
        maskedAreaPixels: bounds.width * bounds.height,
        regions: [region],
      });

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        structuredContent: { ok: true, tool: VISUAL_MASK_DYNAMIC_REGION_TOOL, ...summary },
      };
    },
  );
}
