import { describe, expect, test } from "bun:test";
import type { HookContext } from "@mimera/contracts";
import { HookRunner, createWriteScopeHook } from "../src/index.ts";

function context(path: string): HookContext {
  return {
    sessionId: "session-1",
    componentId: "navbar",
    agentId: "component-builder",
    host: "codex",
    phase: "pre-tool-call",
    operation: "project.write-patch",
    input: { path },
    trustedScope: {
      targetRoot: "/tmp/mimera-target",
      targetFiles: ["src/navbar.tsx", "src/navbar.css"],
      allowedOrigins: [],
      allowedCommands: [],
      grantedPackPermissions: ["project:write-scoped"],
      policyVersion: "1",
    },
    correlationId: crypto.randomUUID(),
  };
}

describe("write scope hook", () => {
  test("allows declared component files", async () => {
    const result = await new HookRunner({ hooks: [createWriteScopeHook()] }).run(
      context("src/navbar.tsx"),
    );
    expect(result.decision.kind).toBe("allow");
  });

  test("denies traversal outside the target root", async () => {
    const result = await new HookRunner({ hooks: [createWriteScopeHook()] }).run(
      context("../../.ssh/config"),
    );
    expect(result.decision.kind).toBe("deny");
    expect(result.decision.reasonCode).toBe("WRITE_OUTSIDE_TARGET_ROOT");
  });

  test("asks before writing an undeclared project file", async () => {
    const result = await new HookRunner({ hooks: [createWriteScopeHook()] }).run(
      context("src/hero.tsx"),
    );
    expect(result.decision.kind).toBe("ask");
    expect(result.decision.requiredApproval?.kind).toBe("write-outside-scope");
  });
});
