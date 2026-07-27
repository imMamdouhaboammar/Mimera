import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { HookContext } from "@mimera/contracts";
import { HookRunner, createWriteScopeHook } from "@mimera/hooks";
import { MimeraStore, SqliteHookAuditSink } from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("persists append-only hook audit events", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mimera-audit-"));
  directories.push(directory);
  const store = new MimeraStore(join(directory, "mimera.sqlite"));
  const runner = new HookRunner({
    hooks: [createWriteScopeHook()],
    auditSink: new SqliteHookAuditSink(store),
  });
  const context: HookContext = {
    sessionId: "session-1",
    host: "codex",
    phase: "pre-tool-call",
    operation: "project.write-patch",
    input: { path: "../../.ssh/config" },
    trustedScope: {
      targetRoot: "/tmp/target",
      targetFiles: ["src/app.ts"],
      allowedOrigins: [],
      allowedCommands: [],
      grantedPackPermissions: ["project:write-scoped"],
      policyVersion: "1",
    },
    correlationId: "correlation-1",
  };

  const result = await runner.run(context);
  const events = store.listHookAudit("session-1");

  expect(result.decision.kind).toBe("deny");
  expect(events).toHaveLength(1);
  expect(events[0]?.reasonCode).toBe("WRITE_OUTSIDE_TARGET_ROOT");
  expect(events[0]?.inputDigest).toHaveLength(64);
  store.close();
});
