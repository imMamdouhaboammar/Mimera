import { describe, expect, test } from "bun:test";
import type { HookContext } from "@mimera/contracts";
import { HookRunner, createCommandPolicyHook } from "../src/index.ts";

function context(command: string, args: string[], allowedCommands: string[]): HookContext {
  return {
    sessionId: "session-1",
    agentId: "component-builder",
    host: "codex",
    phase: "pre-tool-call",
    operation: "runtime.spawn",
    input: { command, args, cwd: "/tmp/target" },
    trustedScope: {
      targetRoot: "/tmp/target",
      targetFiles: [],
      allowedOrigins: [],
      allowedCommands,
      grantedPackPermissions: ["shell:declared-commands"],
      policyVersion: "1",
    },
    correlationId: crypto.randomUUID(),
  };
}

describe("command policy hook", () => {
  test("allows declared command prefixes", async () => {
    const result = await new HookRunner({ hooks: [createCommandPolicyHook()] }).run(
      context("bun", ["test", "packages/hooks/test"], ["bun test"]),
    );
    expect(result.decision.kind).toBe("allow");
  });

  test("denies destructive commands even if declared", async () => {
    const result = await new HookRunner({ hooks: [createCommandPolicyHook()] }).run(
      context("rm", ["-rf", "/tmp/target"], ["rm -rf"]),
    );
    expect(result.decision.kind).toBe("deny");
    expect(result.decision.reasonCode).toBe("COMMAND_DESTRUCTIVE");
  });

  test("asks before dependency changes", async () => {
    const result = await new HookRunner({ hooks: [createCommandPolicyHook()] }).run(
      context("bun", ["add", "playwright"], ["bun add"]),
    );
    expect(result.decision.kind).toBe("ask");
    expect(result.decision.requiredApproval?.kind).toBe("dependency-change");
  });

  test("denies undeclared commands", async () => {
    const result = await new HookRunner({ hooks: [createCommandPolicyHook()] }).run(
      context("curl", ["https://example.com"], ["bun test"]),
    );
    expect(result.decision.kind).toBe("deny");
    expect(result.decision.reasonCode).toBe("COMMAND_NOT_ALLOWED");
  });
});
