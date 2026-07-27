import { z } from "zod";

export const AgentIdSchema = z.enum([
  "workflow-orchestrator",
  "context-curator",
  "recovery-agent",
  "project-cartographer",
  "reference-scout",
  "dom-forensics",
  "responsive-analyst",
  "interaction-archaeologist",
  "asset-investigator",
  "design-dna-extractor",
  "brand-interpreter",
  "component-architect",
  "motion-analyst",
  "component-builder",
  "responsive-builder",
  "interaction-builder",
  "test-builder",
  "page-integrator",
  "visual-reviewer",
  "responsive-reviewer",
  "interaction-reviewer",
  "accessibility-reviewer",
  "code-architecture-reviewer",
  "performance-reviewer",
  "taste-director",
  "adversarial-reviewer",
  "regression-guardian",
]);
export type AgentId = z.infer<typeof AgentIdSchema>;

export const AgentGroupSchema = z.enum([
  "orchestration",
  "discovery",
  "design",
  "implementation",
  "review",
]);
export type AgentGroup = z.infer<typeof AgentGroupSchema>;

export const ModelClassSchema = z.enum([
  "coordinator",
  "fast-text",
  "code",
  "vision",
  "vision-reasoning",
  "verifier",
]);
export type ModelClass = z.infer<typeof ModelClassSchema>;

export const ToolProfileSchema = z.enum([
  "orchestration-control",
  "evidence-read",
  "project-inspection",
  "browser-observe",
  "design-analysis",
  "scoped-builder",
  "visual-review",
  "code-review",
  "verification",
]);
export type ToolProfile = z.infer<typeof ToolProfileSchema>;

export const AgentConcurrencySchema = z.enum([
  "serial",
  "parallel-readonly",
  "exclusive-write",
  "review-fanout",
]);
export type AgentConcurrency = z.infer<typeof AgentConcurrencySchema>;

export const AgentDescriptorSchema = z
  .object({
    id: AgentIdSchema,
    name: z.string().min(1),
    group: AgentGroupSchema,
    purpose: z.string().min(1),
    modelClass: ModelClassSchema,
    toolProfile: ToolProfileSchema,
    writesProject: z.boolean(),
    contextInputs: z.array(z.string().min(1)).min(1),
    outputArtifact: z.string().min(1),
    concurrency: AgentConcurrencySchema,
    requiredHooks: z.array(z.string().min(1)),
    maxTurns: z.number().int().positive().max(200),
    canDelegate: z.boolean(),
  })
  .strict();
export type AgentDescriptor = z.infer<typeof AgentDescriptorSchema>;

export const ToolGrantSchema = z
  .object({
    profile: ToolProfileSchema,
    targetFiles: z.array(z.string()),
    allowedCommands: z.array(z.string()),
    allowedOrigins: z.array(z.string().url()).optional(),
  })
  .strict();
export type ToolGrant = z.infer<typeof ToolGrantSchema>;

export const ContextPacketSchema = z
  .object({
    schemaVersion: z.literal("1"),
    id: z.string().min(1),
    sessionId: z.string().min(1),
    pageId: z.string().min(1).optional(),
    componentId: z.string().min(1).optional(),
    agentId: AgentIdSchema,
    assignment: z.string().min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    artifactRefs: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string().min(1)).min(1),
    toolGrant: ToolGrantSchema,
    issuedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export type ContextPacket = z.infer<typeof ContextPacketSchema>;

export const AgentFindingSchema = z
  .object({
    id: z.string().min(1),
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    title: z.string().min(1),
    detail: z.string().min(1),
    evidenceRefs: z.array(z.string().min(1)),
  })
  .strict();
export type AgentFinding = z.infer<typeof AgentFindingSchema>;

export const AgentResultSchema = z
  .object({
    schemaVersion: z.literal("1"),
    agentId: AgentIdSchema,
    contextPacketId: z.string().min(1),
    status: z.enum(["completed", "blocked", "failed"]),
    summary: z.string().min(1),
    outputArtifacts: z.array(z.string().min(1)),
    findings: z.array(AgentFindingSchema),
    requestedApprovalKinds: z.array(z.string().min(1)),
    completedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AgentResult = z.infer<typeof AgentResultSchema>;
