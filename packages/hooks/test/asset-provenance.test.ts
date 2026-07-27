import { describe, expect, test } from "bun:test";
import type { AssetProvenanceRecord, HookContext } from "@mimera/contracts";
import { HookRunner, createAssetProvenanceHook } from "../src/index.ts";

function context(assetId: string): HookContext {
  return {
    sessionId: "session-1",
    componentId: "navbar",
    agentId: "component-builder",
    host: "codex",
    phase: "pre-tool-call",
    operation: "project.copy-reference-asset",
    input: { assetId },
    trustedScope: {
      targetRoot: "/tmp/target",
      targetFiles: ["public/logo.svg"],
      allowedOrigins: ["https://example.com"],
      allowedCommands: [],
      grantedPackPermissions: ["project:write-scoped"],
      policyVersion: "1",
    },
    correlationId: crypto.randomUUID(),
  };
}

function record(usageDecision: AssetProvenanceRecord["usageDecision"]): AssetProvenanceRecord {
  return {
    assetId: "asset-1",
    sourceUrl: "https://example.com/logo.svg",
    usageDecision,
    reason: "Fixture decision",
  };
}

describe("asset provenance hook", () => {
  test("asks for review when no provenance record exists", async () => {
    const result = await new HookRunner({
      hooks: [createAssetProvenanceHook({ lookup: () => null })],
    }).run(context("asset-1"));

    expect(result.decision.kind).toBe("ask");
    expect(result.decision.requiredApproval?.kind).toBe("asset-usage");
  });

  test("denies assets marked reference-only or blocked", async () => {
    for (const decision of ["reference-only", "blocked"] as const) {
      const result = await new HookRunner({
        hooks: [createAssetProvenanceHook({ lookup: () => record(decision) })],
      }).run(context("asset-1"));
      expect(result.decision.kind).toBe("deny");
    }
  });

  test("allows original or user-owned assets", async () => {
    for (const decision of ["allowed-original", "allowed-user-owned"] as const) {
      const result = await new HookRunner({
        hooks: [createAssetProvenanceHook({ lookup: () => record(decision) })],
      }).run(context("asset-1"));
      expect(result.decision.kind).toBe("allow");
    }
  });
});
