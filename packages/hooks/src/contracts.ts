import type { HookContext, HookDecision, HookPhase } from "@mimera/contracts";

export type HookLayer =
  | "platform-safety"
  | "organization-policy"
  | "project-policy"
  | "pack-policy"
  | "operation-policy";

export interface MimeraHook {
  id: string;
  phases: readonly HookPhase[];
  layer: HookLayer;
  priority: number;
  timeoutMs?: number;
  operations?: readonly string[];
  run(context: HookContext): Promise<HookDecision> | HookDecision;
}

export interface HookAuditEvent {
  id: string;
  timestamp: string;
  correlationId: string;
  sessionId: string;
  componentId?: string;
  agentId?: string;
  host: HookContext["host"];
  phase: HookContext["phase"];
  operation: string;
  hookId: string;
  policyVersion: string;
  inputDigest: string;
  decision: HookDecision["kind"];
  reasonCode: string;
  mutatedFields: string[];
  latencyMs: number;
  timedOut: boolean;
}

export interface HookAuditSink {
  write(event: HookAuditEvent): Promise<void> | void;
}

export interface HookRunResult {
  decision: HookDecision;
  input: unknown;
  executedHookIds: string[];
}
