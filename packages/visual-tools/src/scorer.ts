import { z } from "zod";
import type { GeometryComparison } from "./geometry.ts";
import type { PixelDiffResult } from "./pixel-diff.ts";

export const VisualVetoCodeSchema = z.enum([
  "LAYOUT_DISPLACEMENT_EXCEEDED",
  "CRITICAL_ELEMENT_MISSING",
  "CONTRAST_VIOLATION",
  "UNACCEPTABLE_PIXEL_DRIFT",
  "BRAND_MAPPING_FAILURE",
]);
export type VisualVetoCode = z.infer<typeof VisualVetoCodeSchema>;

export const VisualVetoSchema = z.object({
  code: VisualVetoCodeSchema,
  message: z.string().min(1),
  severity: z.literal("critical"),
}).strict();
export type VisualVeto = z.infer<typeof VisualVetoSchema>;

export const VisualSubScoresSchema = z.object({
  structuralAlignment: z.number().min(0).max(100),
  spacingBoxModel: z.number().min(0).max(100),
  typographyHierarchy: z.number().min(0).max(100),
  styleAndColorHarmony: z.number().min(0).max(100),
}).strict();
export type VisualSubScores = z.infer<typeof VisualSubScoresSchema>;

export const VisualSimulationScoreSchema = z.object({
  schemaVersion: z.literal("1"),
  overallScore: z.number().min(0).max(100),
  subScores: VisualSubScoresSchema,
  vetoes: z.array(VisualVetoSchema),
  status: z.enum(["pass", "fail", "vetoed"]),
  evaluatedAt: z.string().datetime({ offset: true }),
}).strict();
export type VisualSimulationScore = z.infer<typeof VisualSimulationScoreSchema>;

export interface ScoreVisualSimulationInput {
  pixelDiff?: PixelDiffResult;
  geometryComparisons?: GeometryComparison[];
  criticalElementsPresent?: boolean;
  contrastPass?: boolean;
  brandMappingApplied?: boolean;
  now?: string;
}

export function scoreVisualSimulation(
  input: ScoreVisualSimulationInput = {},
): VisualSimulationScore {
  const vetoes: VisualVeto[] = [];

  // 1. Evaluate Pixel & Pixel Drift
  const pixelMatch = input.pixelDiff?.matchPercentage ?? 100;
  const mismatchRatio = input.pixelDiff?.mismatchRatio ?? 0;

  if (mismatchRatio > 0.25) {
    vetoes.push({
      code: "UNACCEPTABLE_PIXEL_DRIFT",
      message: `Pixel drift mismatch ratio of ${(mismatchRatio * 100).toFixed(1)}% exceeds maximum allowable 25% threshold`,
      severity: "critical",
    });
  }

  // 2. Evaluate Geometry & Layout Displacement
  let avgGeometryScore = 100;
  let maxDisplacement = 0;

  if (input.geometryComparisons && input.geometryComparisons.length > 0) {
    let totalGeom = 0;
    for (const comp of input.geometryComparisons) {
      totalGeom += comp.geometryScore;
      if (comp.delta.centerDistance > maxDisplacement) {
        maxDisplacement = comp.delta.centerDistance;
      }
    }
    avgGeometryScore = totalGeom / input.geometryComparisons.length;
  }

  if (maxDisplacement > 50) {
    vetoes.push({
      code: "LAYOUT_DISPLACEMENT_EXCEEDED",
      message: `Max spatial element displacement of ${maxDisplacement.toFixed(1)}px exceeds allowable 50px boundary`,
      severity: "critical",
    });
  }

  // 3. Evaluate Critical Requirements
  if (input.criticalElementsPresent === false) {
    vetoes.push({
      code: "CRITICAL_ELEMENT_MISSING",
      message: "One or more critical layout elements are missing in the simulated component",
      severity: "critical",
    });
  }

  if (input.contrastPass === false) {
    vetoes.push({
      code: "CONTRAST_VIOLATION",
      message: "Component accessibility contrast ratio failed WCAG minimum standards",
      severity: "critical",
    });
  }

  // Compute Sub-Scores
  const structuralAlignment = Math.max(0, Math.min(100, avgGeometryScore));
  const spacingBoxModel = Math.max(0, Math.min(100, pixelMatch * 0.4 + avgGeometryScore * 0.6));
  const typographyHierarchy = Math.max(0, Math.min(100, pixelMatch * 0.7 + (input.contrastPass === false ? 20 : 30)));
  const styleAndColorHarmony = Math.max(
    0,
    Math.min(100, input.brandMappingApplied ? Math.max(85, pixelMatch) : pixelMatch),
  );

  const subScores: VisualSubScores = {
    structuralAlignment: Math.round(structuralAlignment * 100) / 100,
    spacingBoxModel: Math.round(spacingBoxModel * 100) / 100,
    typographyHierarchy: Math.round(typographyHierarchy * 100) / 100,
    styleAndColorHarmony: Math.round(styleAndColorHarmony * 100) / 100,
  };

  // Weighted Overall Score: 35% Alignment, 25% Spacing, 20% Typography, 20% Style/Brand
  const overallScore = Math.round(
    (subScores.structuralAlignment * 0.35 +
      subScores.spacingBoxModel * 0.25 +
      subScores.typographyHierarchy * 0.2 +
      subScores.styleAndColorHarmony * 0.2) *
      100,
  ) / 100;

  const status =
    vetoes.length > 0
      ? "vetoed"
      : overallScore >= 80
      ? "pass"
      : "fail";

  return VisualSimulationScoreSchema.parse({
    schemaVersion: "1",
    overallScore,
    subScores,
    vetoes,
    status,
    evaluatedAt: input.now ?? new Date().toISOString(),
  });
}
