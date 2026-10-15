import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generateStorefrontHtml,
  generateTokensCss,
  generateStoreAppJs,
  validateStorefrontInvariants,
  generateStorefrontBundle,
  ReaBridgeService,
} from "../src/index.ts";

test("SkyTheme generates semantic luxury storefront HTML with proper modal accessibility", () => {
  const html = generateStorefrontHtml("VOGUE PARIS", "scheme-1");
  expect(html).toContain("VOGUE PARIS");
  expect(html).toContain('<header');
  expect(html).toContain('<nav');
  expect(html).toContain('<bag-drawer id="cartDrawer" role="dialog" aria-modal="true"');
  expect(html).toContain('<lookbook-carousel');
  expect(html).toContain('data-hotspot="true"');
  expect(html).toContain('The Lookbook Gallery');
});

test("SkyTheme generates design tokens and components CSS", () => {
  const tokens = generateTokensCss();
  expect(tokens).toContain("--colorBackground");
  expect(tokens).toContain("--buttonRadius: 40px;");
  expect(tokens).toContain("--fontFamilyHeading");
});

test("SkyTheme storeAppJs enforces touch scroll gating and focus trap", () => {
  const js = generateStoreAppJs();
  expect(js).toContain("pointer: coarse");
  expect(js).toContain("prefers-reduced-motion: reduce");
  expect(js).toContain("disconnectedCallback");
  expect(js).toContain("onKeys");
  expect(js).toContain("Escape");
});

test("validateStorefrontInvariants validates all 4 core invariants and catches violations", () => {
  const html = generateStorefrontHtml("TEST BRAND");
  const js = generateStoreAppJs();
  
  const validResult = validateStorefrontInvariants({ html, js });
  expect(validResult.passed).toBe(true);
  expect(validResult.failedChecks).toBe(0);

  // Invariant 2 violation: missing role="dialog" or aria-modal="true"
  const brokenHtml = html.replace('role="dialog" aria-modal="true"', '');
  const invalidResult = validateStorefrontInvariants({ html: brokenHtml, js });
  expect(invalidResult.passed).toBe(false);
  expect(invalidResult.failedChecks).toBeGreaterThanOrEqual(1);
});

test("generateStorefrontBundle writes complete standalone bundle to disk", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "skytheme-test-"));
  try {
    const bundle = generateStorefrontBundle({
      storeName: "ATELIER NOIR",
      outDir: tempDir,
    });
    expect(bundle.html).toContain("ATELIER NOIR");
    expect(bundle.tokensCss).toContain(":root");
    expect(bundle.appJs).toContain("customElements.define('bag-drawer'");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("ReaBridgeService generates verifiable REA evidence attribution headers and digests", () => {
  const rea = new ReaBridgeService();
  const digest = rea.createEvidenceDigest("const x = 42;");
  expect(digest).toMatch(/^[a-f0-9]{64}$/);

  const header = rea.generateAttributionHeader({
    featureName: "LookbookDualTrackPhysics",
    sourceTarget: "https://luxury-fashion.example.com",
    evidenceDigest: `sha256:${digest}`,
    binaryLocation: "bundle.min.js#L142-L198",
    notes: ["Decompiled from Three.js scene graph", "Clean-room TypeScript reconstruction"],
  });

  expect(header).toContain("Feature Reconstruction: LookbookDualTrackPhysics");
  expect(header).toContain("Reverse-Engineered from: https://luxury-fashion.example.com");
  expect(header).toContain("Binary Location: bundle.min.js#L142-L198");
  expect(header).toContain("Clean-room TypeScript reconstruction");
});
