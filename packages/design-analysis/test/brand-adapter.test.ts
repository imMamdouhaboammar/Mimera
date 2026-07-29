import { expect, test } from "bun:test";
import { BrandAdapter } from "../src/index.ts";
import type { DesignDna } from "@mimera/design-dna";

const sampleDna: DesignDna = {
  schemaVersion: "1",
  generatedAt: "2026-07-29T10:00:00.000Z",
  viewportIds: ["desktop", "mobile"],
  palette: [
    { value: "#0066ff", count: 12, roles: ["foreground"], evidenceIds: ["ev-1"] },
    { value: "#ffffff", count: 5, roles: ["background"], evidenceIds: ["ev-2"] },
  ],
  typography: [
    {
      fontFamily: "Inter",
      fontSizePx: 16,
      fontWeight: "400",
      lineHeightPx: 24,
      count: 10,
      evidenceIds: ["ev-1"],
    },
  ],
  spacingScale: [{ valuePx: 8, count: 5 }],
  radiusScale: [{ valuePx: 4, count: 3 }],
  layout: {
    displayCounts: { flex: 4 },
    positionCounts: { relative: 5 },
    stickyNodePaths: [],
  },
  responsiveRules: [
    {
      type: "navigation-collapses-to-menu",
      identity: "nav#main",
      confidence: 0.9,
      rationale: "Collapsed on mobile viewport",
      evidenceIds: ["ev-1"],
    },
  ],
  signature: {
    rhythmUnitPx: 8,
    cornerLanguage: "soft",
    density: "balanced",
  },
  confidence: {
    overall: 0.95,
    viewportCoverage: 2,
    observedNodeCount: 42,
  },
};

test("BrandAdapter maps reference tokens to target brand guidelines", () => {
  const adapter = new BrandAdapter();
  const result = adapter.adapt({
    dna: sampleDna,
    targetBrandTokens: {
      foreground: "var(--brand-primary)",
      "#0066ff": "var(--brand-primary)",
    },
    preserveExistingIdentity: true,
  });

  expect(result.brandMapping.preserveExistingIdentity).toBe(true);
  expect(result.brandMapping.tokenMappings["foreground"]).toBe("var(--brand-primary)");
  expect(result.adaptedPalette[0]?.value).toBe("var(--brand-primary)");
  expect(result.brandMapping.notes.length).toBeGreaterThan(0);
});
