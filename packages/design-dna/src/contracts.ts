import { z } from "zod";
import type {
  DomSnapshot,
  ViewportProfile,
} from "@mimera/browser-lab";

export interface ViewportDomEvidence {
  evidenceId: string;
  viewport: ViewportProfile;
  dom: DomSnapshot;
}

export const PaletteTokenSchema = z.object({
  value: z.string().min(1),
  count: z.number().int().positive(),
  roles: z.array(z.enum(["foreground", "background"])).min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
});
export type PaletteToken = z.infer<typeof PaletteTokenSchema>;

export const TypographySampleSchema = z.object({
  fontFamily: z.string().min(1),
  fontSizePx: z.number().nonnegative(),
  fontWeight: z.string().min(1),
  lineHeightPx: z.number().nonnegative().nullable(),
  count: z.number().int().positive(),
  evidenceIds: z.array(z.string().min(1)).min(1),
});
export type TypographySample = z.infer<typeof TypographySampleSchema>;

export const ScaleValueSchema = z.object({
  valuePx: z.number().nonnegative(),
  count: z.number().int().positive(),
});
export type ScaleValue = z.infer<typeof ScaleValueSchema>;

export const ResponsiveRuleSchema = z.object({
  type: z.enum([
    "hidden-on-mobile",
    "mobile-only",
    "navigation-collapses-to-menu",
    "becomes-full-width",
  ]),
  identity: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
});
export type ResponsiveRule = z.infer<typeof ResponsiveRuleSchema>;

export const DesignDnaSchema = z.object({
  schemaVersion: z.literal("1"),
  generatedAt: z.string().datetime({ offset: true }),
  viewportIds: z.array(z.string().min(1)).min(1),
  palette: z.array(PaletteTokenSchema),
  typography: z.array(TypographySampleSchema),
  spacingScale: z.array(ScaleValueSchema),
  radiusScale: z.array(ScaleValueSchema),
  layout: z.object({
    displayCounts: z.record(z.string(), z.number().int().nonnegative()),
    positionCounts: z.record(z.string(), z.number().int().nonnegative()),
    stickyNodePaths: z.array(z.string()),
  }),
  responsiveRules: z.array(ResponsiveRuleSchema),
  signature: z.object({
    rhythmUnitPx: z.number().positive().nullable(),
    cornerLanguage: z.enum(["square", "subtle", "soft", "rounded", "pill"]),
    density: z.enum(["sparse", "balanced", "dense"]),
  }),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    viewportCoverage: z.number().int().positive(),
    observedNodeCount: z.number().int().nonnegative(),
  }),
});
export type DesignDna = z.infer<typeof DesignDnaSchema>;

export const PageComponentHypothesisSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["navbar", "header", "main", "section", "footer", "navigation", "component"]),
  domPath: z.string().min(1),
  boundaries: z.object({
    yStart: z.number(),
    yEnd: z.number(),
  }),
  visibilityByViewport: z.record(z.string(), z.boolean()),
  evidenceIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
});
export type PageComponentHypothesis = z.infer<typeof PageComponentHypothesisSchema>;

export const PageDecompositionSchema = z.object({
  schemaVersion: z.literal("1"),
  sourceUrl: z.string().url(),
  generatedAt: z.string().datetime({ offset: true }),
  components: z.array(PageComponentHypothesisSchema),
});
export type PageDecomposition = z.infer<typeof PageDecompositionSchema>;

export interface DesignAnalysisResult {
  dna: DesignDna;
  decomposition: PageDecomposition;
}
