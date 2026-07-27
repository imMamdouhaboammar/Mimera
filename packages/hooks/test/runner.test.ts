import { describe, expect, test } from "bun:test";
import type { HookContext } from "@mimera/contracts";
import {
  HookRunner,
  InMemoryAuditSink,
  defineHook,
  type HookLayer,
} from "../src/index.ts";

const context: HookContext = {
  sessionId: "session-1",
  host: "codex",
  phase: "pre-tool-call",
  operation: "project.write-patch",
  input: { path: "src/app.ts" },
  trustedScope: {
    targetRoot: "/tmp/target",
    targetFiles: ["src/app.ts"],
    allowedOrigins: ["https://example.com"],
    allowedCommands: ["bun test"],
    grantedPackPermissions: [],
    policyVersion: "1",
  },
  correlationId: "correlation-1",
};

const layerPriority: Record<HookLayer, number> = {
  "platform-safety": 0,
  "organization-policy": 1,
  "project-policy": 2,
  "pack-policy": 3,
  "operation-policy": 4,
};

describe("HookRunner", () => {
  test("executes hooks in deterministic layer and priority order", async () => {
    const calls: string[] = [];
    const hooks = Object.entries(layerPriority).reverse().map(([layer, priority]) =>
      defineHook({
        id: layer,
        phases: ["pre-tool-call"],
        layer: layer as HookLayer,
        priority,
        run: () => {
          calls.push(layer);
          return { kind: "allow", reasonCode: "OK", message: "Allowed" };
        },
      }),
    );

    const runner = new HookRunner({ hooks, auditSink: new InMemoryAuditSink() });
    const result = await runner.run(context);

    expect(result.decision.kind).toBe("allow");
    expect(calls).toEqual([
      "platform-safety",
      "organization-policy",
      "project-policy",
      "pack-policy",
      "operation-policy",
    ]);
  });

  test("stops at the first deny and writes an audit event", async () => {
    const calls: string[] = [];
    const audit = new InMemoryAuditSink();
    const runner = new HookRunner({
      auditSink: audit,
      hooks: [
        defineHook({
          id: "deny-first",
          phases: ["pre-tool-call"],
          layer: "platform-safety",
          priority: 0,
          run: () => {
            calls.push("deny");
            return { kind: "deny", reasonCode: "BLOCKED", message: "Blocked" };
          },
        }),
        defineHook({
          id: "never-run",
          phases: ["pre-tool-call"],
          layer: "project-policy",
          priority: 0,
          run: () => {
            calls.push("late");
            return { kind: "allow", reasonCode: "OK", message: "Allowed" };
          },
        }),
      ],
    });

    const result = await runner.run(context);
    expect(result.decision.kind).toBe("deny");
    expect(calls).toEqual(["deny"]);
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]?.hookId).toBe("deny-first");
  });
});

test("audit digests serialize shared references like equivalent duplicated values", async () => {
  const sharedValue = { token: "same" };
  const sharedInput = { left: sharedValue, right: sharedValue };
  const duplicatedInput = { left: { token: "same" }, right: { token: "same" } };
  const hook = defineHook({
    id: "digest-probe",
    phases: ["pre-tool-call"],
    layer: "platform-safety",
    priority: 0,
    run: () => ({ kind: "allow", reasonCode: "OK", message: "Allowed" }),
  });
  const sharedAudit = new InMemoryAuditSink();
  const duplicatedAudit = new InMemoryAuditSink();

  await new HookRunner({ hooks: [hook], auditSink: sharedAudit }).run({ ...context, input: sharedInput });
  await new HookRunner({ hooks: [hook], auditSink: duplicatedAudit }).run({ ...context, input: duplicatedInput });

  expect(sharedAudit.events[0]?.inputDigest).toBe(duplicatedAudit.events[0]?.inputDigest);
});
