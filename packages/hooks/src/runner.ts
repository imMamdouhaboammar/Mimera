import { createHash } from "node:crypto";
import { HookDecisionSchema, type HookContext, type HookDecision } from "@mimera/contracts";
import { NoopAuditSink } from "./audit-sink.ts";
import type { HookAuditEvent, HookAuditSink, HookRunResult, MimeraHook } from "./contracts.ts";
import { HookRegistry } from "./registry.ts";

const TERMINAL_DECISIONS = new Set<HookDecision["kind"]>(["deny", "ask", "defer"]);

function canonicalize(value: unknown, ancestors: WeakSet<object>): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value)) return "[Circular]";

  ancestors.add(value);
  try {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      return value.map((item) => canonicalize(item, ancestors));
    }
    const normalized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const canonical = canonicalize(item, ancestors);
      if (canonical !== undefined && typeof canonical !== "function" && typeof canonical !== "symbol") {
        normalized[key] = canonical;
      }
    }
    return normalized;
  } finally {
    ancestors.delete(value);
  }
}

function stableDigest(value: unknown): string {
  const json = JSON.stringify(canonicalize(value, new WeakSet<object>()));
  return createHash("sha256").update(json ?? "undefined").digest("hex");
}

function changedFields(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .sort();
}

async function runWithTimeout(hook: MimeraHook, context: HookContext): Promise<HookDecision> {
  const timeoutMs = hook.timeoutMs ?? 3_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(hook.run(context)),
      new Promise<HookDecision>((resolve) => {
        timer = setTimeout(() => {
          resolve({
            kind: "deny",
            reasonCode: "HOOK_TIMEOUT",
            message: `Hook ${hook.id} exceeded ${timeoutMs}ms`,
          });
        }, timeoutMs);
      }),
    ]);
  } catch {
    return {
      kind: "deny",
      reasonCode: "HOOK_CRASH",
      message: `Hook ${hook.id} crashed and the operation was denied`,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface HookRunnerOptions {
  hooks?: readonly MimeraHook[];
  registry?: HookRegistry;
  auditSink?: HookAuditSink;
  now?: () => Date;
}

export class HookRunner {
  readonly #registry: HookRegistry;
  readonly #auditSink: HookAuditSink;
  readonly #now: () => Date;

  constructor(options: HookRunnerOptions = {}) {
    if (options.hooks && options.registry) {
      throw new Error("Provide hooks or registry, not both");
    }
    this.#registry = options.registry ?? new HookRegistry(options.hooks ?? []);
    this.#auditSink = options.auditSink ?? new NoopAuditSink();
    this.#now = options.now ?? (() => new Date());
  }

  async run(initialContext: HookContext): Promise<HookRunResult> {
    let input = initialContext.input;
    const executedHookIds: string[] = [];
    const hooks = this.#registry.resolve(initialContext);

    for (const hook of hooks) {
      const context: HookContext = { ...initialContext, input };
      const started = performance.now();
      const rawDecision = await runWithTimeout(hook, context);
      const decision = HookDecisionSchema.parse(rawDecision);
      const nextInput = decision.kind === "mutate" ? decision.updatedInput : input;
      const auditEvent: HookAuditEvent = {
        id: crypto.randomUUID(),
        timestamp: this.#now().toISOString(),
        correlationId: context.correlationId,
        sessionId: context.sessionId,
        ...(context.componentId ? { componentId: context.componentId } : {}),
        ...(context.agentId ? { agentId: context.agentId } : {}),
        host: context.host,
        phase: context.phase,
        operation: context.operation,
        hookId: hook.id,
        policyVersion: context.trustedScope.policyVersion,
        inputDigest: stableDigest(input),
        decision: decision.kind,
        reasonCode: decision.reasonCode,
        mutatedFields: decision.kind === "mutate" ? changedFields(input, nextInput) : [],
        latencyMs: Math.max(0, performance.now() - started),
        timedOut: decision.reasonCode === "HOOK_TIMEOUT",
      };
      await this.#auditSink.write(auditEvent);
      executedHookIds.push(hook.id);

      if (decision.kind === "mutate") {
        input = nextInput;
        continue;
      }
      if (TERMINAL_DECISIONS.has(decision.kind)) {
        return { decision, input, executedHookIds };
      }
    }

    return {
      decision: { kind: "allow", reasonCode: "HOOK_CHAIN_ALLOWED", message: "All hooks allowed the operation" },
      input,
      executedHookIds,
    };
  }
}
