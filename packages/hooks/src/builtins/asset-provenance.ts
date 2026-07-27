import type { AssetProvenanceRecord, HookDecision } from "@mimera/contracts";
import { defineHook } from "../registry.ts";

export interface AssetProvenanceHookOptions {
  lookup(assetId: string): Promise<AssetProvenanceRecord | null> | AssetProvenanceRecord | null;
}

export function createAssetProvenanceHook(options: AssetProvenanceHookOptions) {
  return defineHook({
    id: "builtin.asset-provenance",
    phases: ["pre-tool-call"],
    operations: ["project.copy-reference-asset", "project.write-reference-asset"],
    layer: "platform-safety",
    priority: 20,
    async run(context): Promise<HookDecision> {
      const input = context.input as { assetId?: unknown };
      if (typeof input?.assetId !== "string" || input.assetId.trim() === "") {
        return {
          kind: "deny",
          reasonCode: "ASSET_ID_INVALID",
          message: "Reference asset operations require a valid asset id",
        };
      }

      const record = await options.lookup(input.assetId);
      if (!record) {
        return {
          kind: "ask",
          reasonCode: "ASSET_PROVENANCE_MISSING",
          message: "Asset usage requires a provenance decision",
          requiredApproval: {
            kind: "asset-usage",
            scope: input.assetId,
            reason: "No provenance record permits this reference asset",
          },
        };
      }

      if (record.usageDecision === "manual-review-required") {
        return {
          kind: "ask",
          reasonCode: "ASSET_MANUAL_REVIEW_REQUIRED",
          message: "Asset usage requires manual review",
          requiredApproval: {
            kind: "asset-usage",
            scope: record.assetId,
            reason: record.reason,
          },
        };
      }

      if (record.usageDecision === "blocked" || record.usageDecision === "reference-only") {
        return {
          kind: "deny",
          reasonCode: "ASSET_USAGE_BLOCKED",
          message: `Asset ${record.assetId} cannot be copied into the target project`,
          evidenceIds: [record.assetId],
        };
      }

      return {
        kind: "allow",
        reasonCode: "ASSET_USAGE_ALLOWED",
        message: `Asset ${record.assetId} has an approved provenance decision`,
        evidenceIds: [record.assetId],
      };
    },
  });
}
