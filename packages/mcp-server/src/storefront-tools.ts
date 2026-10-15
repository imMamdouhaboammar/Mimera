import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  generateStorefrontBundle,
  validateStorefrontInvariants,
  ReaBridgeService,
  SkyThemeSchemeSchema,
} from "@mimera/skytheme-storefront";
import { readFile } from "node:fs/promises";
import { z } from "zod";

export const STOREFRONT_GENERATE_LUXURY_TOOL = "storefront.generate_luxury" as const;
export const STOREFRONT_VALIDATE_INVARIANTS_TOOL = "storefront.validate_invariants" as const;
export const REA_INSPECT_BUNDLE_TOOL = "rea.inspect_bundle" as const;

export function registerStorefrontTools(server: McpServer): void {
  // 1. storefront.generate_luxury
  server.tool(
    STOREFRONT_GENERATE_LUXURY_TOOL,
    "Generates an ultra-luxury fashion e-commerce storefront with Lenis momentum scroll, 3D lookbook, and cart drawer",
    {
      storeName: z.string().default("AURA LUXE"),
      schemeClass: SkyThemeSchemeSchema.default("scheme-1"),
      outDir: z.string().default("./storefront-dist"),
    },
    async ({ storeName, schemeClass, outDir }) => {
      const bundle = generateStorefrontBundle({
        storeName,
        schemeClass,
        outDir,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "GENERATED",
              storeName,
              schemeClass,
              outDir: bundle.outDir,
              files: [
                "index.html",
                "css/theme-tokens.css",
                "css/theme-components.css",
                "js/store-app.js",
              ],
            }),
          },
        ],
      };
    },
  );

  // 2. storefront.validate_invariants
  server.tool(
    STOREFRONT_VALIDATE_INVARIANTS_TOOL,
    "Validates storefront against the 4 non-negotiable Agent Kernel invariants (touch scroll gating, aria-modal dialogs, RAF epsilon loop cancellation, Mermaid markdown)",
    {
      htmlContent: z.string().optional(),
      htmlPath: z.string().optional(),
      jsContent: z.string().optional(),
      markdownDoc: z.string().optional(),
    },
    async ({ htmlContent, htmlPath, jsContent, markdownDoc }) => {
      let html = htmlContent ?? "";
      if (!html && htmlPath) {
        html = await readFile(htmlPath, "utf8");
      }

      if (!html) {
        throw new Error("Either htmlContent or htmlPath must be provided");
      }

      const result = validateStorefrontInvariants({
        html,
        js: jsContent,
        markdownDoc,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );

  // 3. rea.inspect_bundle
  server.tool(
    REA_INSPECT_BUNDLE_TOOL,
    "Bridges REA reverse-engineering for web bundles and generates cryptographic evidence attribution ledgers",
    {
      featureName: z.string().default("ReconstructedFeature"),
      sourceTarget: z.string(),
      sourceContent: z.string().optional(),
      sourceFilePath: z.string().optional(),
      binaryLocation: z.string().optional(),
      notes: z.array(z.string()).optional(),
    },
    async ({ featureName, sourceTarget, sourceContent, sourceFilePath, binaryLocation, notes }) => {
      const rea = new ReaBridgeService();
      let content = sourceContent ?? "";
      if (!content && sourceFilePath) {
        content = await readFile(sourceFilePath, "utf8");
      }
      if (!content) {
        content = sourceTarget;
      }

      const digest = rea.createEvidenceDigest(content);
      const attributionHeader = rea.generateAttributionHeader({
        featureName,
        sourceTarget,
        evidenceDigest: `sha256:${digest}`,
        binaryLocation,
        notes,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              featureName,
              sourceTarget,
              evidenceDigest: `sha256:${digest}`,
              attributionHeader,
            }),
          },
        ],
      };
    },
  );
}
