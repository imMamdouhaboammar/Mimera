import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStorefrontTools } from "../src/storefront-tools.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("registerStorefrontTools registers storefront and REA MCP tools", async () => {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });
  registerStorefrontTools(server);

  // Verify tools can be invoked
  const tempDir = await mkdtemp(join(tmpdir(), "mcp-storefront-test-"));
  try {
    const generateHandler = (server as any)._registeredTools["storefront.generate_luxury"];
    expect(generateHandler).toBeDefined();

    const generateResult = await generateHandler.handler({
      storeName: "MAISON HAUTE",
      schemeClass: "scheme-2",
      outDir: tempDir,
    });
    expect(generateResult.content[0].text).toContain("GENERATED");
    expect(generateResult.content[0].text).toContain("MAISON HAUTE");

    const validateHandler = (server as any)._registeredTools["storefront.validate_invariants"];
    expect(validateHandler).toBeDefined();

    const validHtml = `<header><nav></nav></header><bag-drawer role="dialog" aria-modal="true"></bag-drawer><lookbook-carousel data-hotspot="true"></lookbook-carousel>`;
    const validateResult = await validateHandler.handler({
      htmlContent: validHtml,
      jsContent: "pointer: coarse; prefers-reduced-motion: reduce; disconnectedCallback; onKeys; Escape;",
    });
    const parsedValidation = JSON.parse(validateResult.content[0].text);
    expect(parsedValidation.passed).toBe(true);

    const reaHandler = (server as any)._registeredTools["rea.inspect_bundle"];
    expect(reaHandler).toBeDefined();

    const reaResult = await reaHandler.handler({
      featureName: "PhysicsScroller",
      sourceTarget: "https://luxury.store/bundle.js",
      sourceContent: "function lerp(a, b, t) { return a + (b - a) * t; }",
      binaryLocation: "bundle.js#L50",
    });
    const parsedRea = JSON.parse(reaResult.content[0].text);
    expect(parsedRea.evidenceDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(parsedRea.attributionHeader).toContain("Feature Reconstruction: PhysicsScroller");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
