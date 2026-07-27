import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { HookContext } from "@mimera/contracts";
import { HookRunner, createWriteScopeHook } from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("denies writes through a symlink that escapes the target root", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimera-root-"));
  const outside = await mkdtemp(join(tmpdir(), "mimera-outside-"));
  directories.push(root, outside);
  await mkdir(join(root, "src"), { recursive: true });
  await symlink(outside, join(root, "src", "external"));

  const context: HookContext = {
    sessionId: "session-1",
    componentId: "navbar",
    agentId: "component-builder",
    host: "codex",
    phase: "pre-tool-call",
    operation: "project.write-patch",
    input: { path: "src/external/secret.txt" },
    trustedScope: {
      targetRoot: root,
      targetFiles: ["src/external/secret.txt"],
      allowedOrigins: [],
      allowedCommands: [],
      grantedPackPermissions: ["project:write-scoped"],
      policyVersion: "1",
    },
    correlationId: "correlation-1",
  };

  const result = await new HookRunner({ hooks: [createWriteScopeHook()] }).run(context);
  expect(result.decision.kind).toBe("deny");
  expect(result.decision.reasonCode).toBe("WRITE_SYMLINK_ESCAPE");
});
