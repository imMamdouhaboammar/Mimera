import { z } from "zod";

const ISODateTimeSchema = z.string().datetime({ offset: true });
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 digest");
const NonEmptyStringSchema = z.string().trim().min(1);
const AbsolutePathSchema = z.string().refine(
  (value) => value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\"),
  "Expected an absolute path",
);

export const HostKindSchema = z.enum([
  "codex",
  "claude-code",
  "cursor",
  "gemini-cli",
  "generic",
]);
export type HostKind = z.infer<typeof HostKindSchema>;

export const ReferenceModeSchema = z.enum([
  "direction",
  "structure",
  "high-fidelity",
  "audit-only",
]);
export type ReferenceMode = z.infer<typeof ReferenceModeSchema>;

export const SessionStatusSchema = z.enum([
  "CREATED",
  "PREFLIGHT",
  "PROJECT_PROFILED",
  "REFERENCE_AUTHORIZED",
  "REFERENCE_CAPTURED",
  "PAGE_DECOMPOSED",
  "COMPONENT_SPECIFIED",
  "IMPLEMENTING",
  "AUTOMATED_REVIEW",
  "NEEDS_REVISION",
  "BLOCKED",
  "USER_REVIEW",
  "CHANGES_REQUESTED",
  "REJECTED",
  "APPROVED",
  "LOCKED",
  "NEXT_COMPONENT",
  "PAGE_INTEGRATION",
  "FINAL_VERIFICATION",
  "COMPLETE",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const HighFidelityAuthorizationSchema = z.object({
  assertedBy: NonEmptyStringSchema,
  assertion: NonEmptyStringSchema,
  authorizedAt: ISODateTimeSchema,
});
export type HighFidelityAuthorization = z.infer<typeof HighFidelityAuthorizationSchema>;

export const ReferenceSessionSchema = z
  .object({
    id: NonEmptyStringSchema,
    version: z.number().int().positive(),
    targetRoot: AbsolutePathSchema,
    referenceUrls: z.array(z.string().url()).min(1),
    host: HostKindSchema,
    mode: ReferenceModeSchema,
    status: SessionStatusSchema,
    currentPageId: NonEmptyStringSchema.optional(),
    currentComponentId: NonEmptyStringSchema.optional(),
    highFidelityAuthorization: HighFidelityAuthorizationSchema.optional(),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema,
  })
  .superRefine((session, context) => {
    if (session.mode === "high-fidelity" && !session.highFidelityAuthorization) {
      context.addIssue({
        code: "custom",
        path: ["highFidelityAuthorization"],
        message: "High-fidelity mode requires explicit authorization metadata",
      });
    }
  });
export type ReferenceSession = z.infer<typeof ReferenceSessionSchema>;

export const ComponentStatusSchema = z.enum([
  "discovered",
  "specified",
  "implementing",
  "reviewing",
  "changes-requested",
  "approved",
  "locked",
  "blocked",
]);
export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;

export const ComponentBoundarySchema = z.object({
  selectorHints: z.array(NonEmptyStringSchema).default([]),
  startEvidenceId: NonEmptyStringSchema.optional(),
  endEvidenceId: NonEmptyStringSchema.optional(),
});
export type ComponentBoundary = z.infer<typeof ComponentBoundarySchema>;

export const ResponsiveContractSchema = z.object({
  viewports: z.array(z.object({ width: z.number().int().positive(), height: z.number().int().positive() })).min(1),
  rules: z.array(NonEmptyStringSchema).default([]),
});
export type ResponsiveContract = z.infer<typeof ResponsiveContractSchema>;

export const InteractionContractSchema = z.object({
  states: z.array(NonEmptyStringSchema).default([]),
  keyboardRequirements: z.array(NonEmptyStringSchema).default([]),
  pointerRequirements: z.array(NonEmptyStringSchema).default([]),
});
export type InteractionContract = z.infer<typeof InteractionContractSchema>;

export const BrandMappingSchema = z.object({
  tokenMappings: z.record(z.string(), z.string()).default({}),
  preserveExistingIdentity: z.boolean().default(true),
  notes: z.array(NonEmptyStringSchema).default([]),
});
export type BrandMapping = z.infer<typeof BrandMappingSchema>;

export const AcceptanceCriterionSchema = z.object({
  id: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  kind: z.enum(["visual", "responsive", "interaction", "accessibility", "code", "performance"]),
  required: z.boolean().default(true),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

export const ComponentSpecSchema = z.object({
  id: NonEmptyStringSchema,
  pageId: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  boundaries: ComponentBoundarySchema,
  evidenceIds: z.array(NonEmptyStringSchema),
  responsiveContract: ResponsiveContractSchema,
  interactionContract: InteractionContractSchema,
  brandMapping: BrandMappingSchema,
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  targetFiles: z.array(NonEmptyStringSchema).min(1),
  dependencies: z.array(NonEmptyStringSchema).default([]),
  status: ComponentStatusSchema,
});
export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;

export const ReviewerKindSchema = z.enum([
  "visual",
  "responsive",
  "interaction",
  "accessibility",
  "code-architecture",
  "performance",
  "taste-director",
  "adversarial",
]);
export type ReviewerKind = z.infer<typeof ReviewerKindSchema>;

export const ReviewVetoSchema = z.object({
  code: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
  evidenceIds: z.array(NonEmptyStringSchema).default([]),
});
export type ReviewVeto = z.infer<typeof ReviewVetoSchema>;

export const ReviewFindingSchema = z.object({
  code: NonEmptyStringSchema,
  severity: z.enum(["info", "warning", "error"]),
  message: NonEmptyStringSchema,
  evidenceIds: z.array(NonEmptyStringSchema).default([]),
});
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const ReviewResultSchema = z.object({
  reviewer: ReviewerKindSchema,
  componentId: NonEmptyStringSchema,
  status: z.enum(["pass", "fail", "blocked"]),
  score: z.number().min(0).max(100).optional(),
  vetoes: z.array(ReviewVetoSchema),
  findings: z.array(ReviewFindingSchema),
  evidenceIds: z.array(NonEmptyStringSchema),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

export const ApprovalDecisionSchema = z.object({
  componentId: NonEmptyStringSchema,
  decision: z.enum(["approved", "changes-requested", "rejected"]),
  note: NonEmptyStringSchema.optional(),
  approvedEvidenceHash: Sha256Schema.optional(),
  createdAt: ISODateTimeSchema,
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const HookPhaseSchema = z.enum([
  "pre-tool-call",
  "post-tool-call",
  "pre-evidence-ingest",
  "pre-state-transition",
  "pre-agent-dispatch",
  "post-agent-result",
  "pre-user-approval",
]);
export type HookPhase = z.infer<typeof HookPhaseSchema>;

export const HookDecisionKindSchema = z.enum(["allow", "deny", "ask", "defer", "mutate"]);
export type HookDecisionKind = z.infer<typeof HookDecisionKindSchema>;

export const PackPermissionSchema = z.enum([
  "evidence:read",
  "evidence:write",
  "spec:read",
  "spec:write",
  "project:read",
  "project:write-scoped",
  "browser:observe",
  "browser:interact",
  "network:declared-origins",
  "shell:declared-commands",
  "review:emit",
]);
export type PackPermission = z.infer<typeof PackPermissionSchema>;

export const TrustedScopeSchema = z.object({
  targetRoot: AbsolutePathSchema,
  targetFiles: z.array(NonEmptyStringSchema),
  allowedOrigins: z.array(z.string().url()),
  allowedCommands: z.array(NonEmptyStringSchema),
  grantedPackPermissions: z.array(PackPermissionSchema),
  policyVersion: NonEmptyStringSchema,
});
export type TrustedScope = z.infer<typeof TrustedScopeSchema>;

export const ApprovalRequirementSchema = z.object({
  kind: z.enum([
    "write-outside-scope",
    "dependency-change",
    "network-expansion",
    "high-fidelity-authorization",
    "asset-usage",
    "policy-override",
  ]),
  scope: NonEmptyStringSchema,
  reason: NonEmptyStringSchema,
  expiresAt: ISODateTimeSchema.optional(),
});
export type ApprovalRequirement = z.infer<typeof ApprovalRequirementSchema>;

export const HookContextSchema = z.object({
  sessionId: NonEmptyStringSchema,
  componentId: NonEmptyStringSchema.optional(),
  agentId: NonEmptyStringSchema.optional(),
  host: HostKindSchema,
  phase: HookPhaseSchema,
  operation: NonEmptyStringSchema,
  input: z.unknown(),
  trustedScope: TrustedScopeSchema,
  correlationId: NonEmptyStringSchema,
});
export type HookContext = z.infer<typeof HookContextSchema>;

export const HookDecisionSchema = z
  .object({
    kind: HookDecisionKindSchema,
    reasonCode: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
    updatedInput: z.unknown().optional(),
    requiredApproval: ApprovalRequirementSchema.optional(),
    evidenceIds: z.array(NonEmptyStringSchema).optional(),
  })
  .superRefine((decision, context) => {
    if (decision.kind === "ask" && !decision.requiredApproval) {
      context.addIssue({
        code: "custom",
        path: ["requiredApproval"],
        message: "Ask decisions require an approval description",
      });
    }
    if (decision.kind !== "mutate" && decision.updatedInput !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["updatedInput"],
        message: "Only mutate decisions may return updated input",
      });
    }
    if (decision.kind === "mutate" && decision.updatedInput === undefined) {
      context.addIssue({
        code: "custom",
        path: ["updatedInput"],
        message: "Mutate decisions require updated input",
      });
    }
  });
export type HookDecision = z.infer<typeof HookDecisionSchema>;

export const EvidenceTrustSchema = z.enum([
  "trusted-system",
  "trusted-user",
  "untrusted-reference",
]);
export type EvidenceTrust = z.infer<typeof EvidenceTrustSchema>;

export const EvidenceEnvelopeSchema = z.object({
  id: NonEmptyStringSchema,
  payload: z.unknown(),
  trust: EvidenceTrustSchema,
  sourceUrl: z.string().url().optional(),
  capturedAt: ISODateTimeSchema,
  contentHash: Sha256Schema,
});
export type EvidenceEnvelope<T = unknown> = Omit<z.infer<typeof EvidenceEnvelopeSchema>, "payload"> & {
  payload: T;
};

export const AssetUsageDecisionSchema = z.enum([
  "allowed-original",
  "allowed-user-owned",
  "reference-only",
  "manual-review-required",
  "blocked",
]);
export type AssetUsageDecision = z.infer<typeof AssetUsageDecisionSchema>;

export const AssetProvenanceRecordSchema = z.object({
  assetId: NonEmptyStringSchema,
  sourceUrl: z.string().url(),
  discoveredLicense: NonEmptyStringSchema.optional(),
  ownershipAssertion: NonEmptyStringSchema.optional(),
  usageDecision: AssetUsageDecisionSchema,
  reviewer: NonEmptyStringSchema.optional(),
  reason: NonEmptyStringSchema,
});
export type AssetProvenanceRecord = z.infer<typeof AssetProvenanceRecordSchema>;

export const RecipePackKindSchema = z.enum([
  "reference-fixtures",
  "brand-adapter",
  "reviewer-extension",
  "component-pattern",
  "policy-pack",
]);
export type RecipePackKind = z.infer<typeof RecipePackKindSchema>;

export const RecipePackManifestSchema = z
  .object({
    schemaVersion: z.literal("1"),
    id: NonEmptyStringSchema.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: NonEmptyStringSchema,
    version: NonEmptyStringSchema,
    kind: RecipePackKindSchema,
    engineRange: NonEmptyStringSchema,
    entrypoints: z.array(NonEmptyStringSchema).min(1),
    permissions: z.array(PackPermissionSchema),
    integrity: z.object({
      algorithm: z.literal("sha256"),
      digest: Sha256Schema,
    }),
    publisher: z
      .object({
        id: NonEmptyStringSchema,
        signature: NonEmptyStringSchema.optional(),
      })
      .optional(),
  })
  .superRefine((manifest, context) => {
    if (new Set(manifest.permissions).size !== manifest.permissions.length) {
      context.addIssue({
        code: "custom",
        path: ["permissions"],
        message: "Recipe pack permissions must be unique",
      });
    }
  });
export type RecipePackManifest = z.infer<typeof RecipePackManifestSchema>;
