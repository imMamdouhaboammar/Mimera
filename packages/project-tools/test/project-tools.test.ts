import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { TrustedScope } from "@mimera/contracts";
import {
  HookRunner,
  InMemoryAuditSink,
  createCommandPolicyHook,
  createWriteScopeHook,
} from "@mimera/hooks";
import {
  PolicyApprovalRequiredError,
  PolicyDeniedError,
  SafeProjectTools,
} from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture(): Promise<{
  root: string;
  scope: TrustedScope;
  audit: InMemoryAuditSink;
  tools: SafeProjectTools;
}> {
  const root = await mkdtemp(join(tmpdir(), "mimera-project-tools-"));
  directories.push(root);
  const scope: TrustedScope = {
    targetRoot: root,
    targetFiles: ["src/components/Navbar.tsx"],
    allowedOrigins: [],
    allowedCommands: ["bun --version"],
    grantedPackPermissions: ["project:write-scoped", "shell:declared-commands"],
    policyVersion: "1",
  };
  const audit = new InMemoryAuditSink();
  const runner = new HookRunner({
    hooks: [createWriteScopeHook(), createCommandPolicyHook()],
    auditSink: audit,
  });
  return {
    root,
    scope,
    audit,
    tools: new SafeProjectTools({
      sessionId: "session-1",
      componentId: "navbar",
      agentId: "component-builder",
      host: "codex",
      trustedScope: scope,
      hookRunner: runner,
    }),
  };
}

describe("SafeProjectTools writes", () => {
  test("writes an approved component file atomically", async () => {
    const { root, tools, audit } = await fixture();

    const result = await tools.writeFile("src/components/Navbar.tsx", "export function Navbar() {}\n");

    expect(await readFile(join(root, "src/components/Navbar.tsx"), "utf8")).toBe(
      "export function Navbar() {}\n",
    );
    expect(result.relativePath).toBe("src/components/Navbar.tsx");
    expect(result.contentHash).toHaveLength(64);
    expect((await stat(result.absolutePath)).isFile()).toBe(true);
    expect(audit.events.at(-1)?.decision).toBe("allow");
  });

  test("raises an approval requirement before an undeclared project write", async () => {
    const { root, tools } = await fixture();

    await expect(tools.writeFile("src/components/Hero.tsx", "export {};\n")).rejects.toBeInstanceOf(
      PolicyApprovalRequiredError,
    );
    await expect(stat(join(root, "src/components/Hero.tsx"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("denies a write through a symlink outside the target root", async () => {
    const { root, scope, audit } = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "mimera-project-tools-outside-"));
    directories.push(outside);
    await symlink(outside, join(root, "external"));
    scope.targetFiles = ["external/Navbar.tsx"];
    const tools = new SafeProjectTools({
      sessionId: "session-1",
      componentId: "navbar",
      agentId: "component-builder",
      host: "codex",
      trustedScope: scope,
      hookRunner: new HookRunner({ hooks: [createWriteScopeHook()], auditSink: audit }),
    });

    await expect(tools.writeFile("external/Navbar.tsx", "export {};\n")).rejects.toBeInstanceOf(
      PolicyDeniedError,
    );
    await expect(stat(join(outside, "Navbar.tsx"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("SafeProjectTools commands", () => {
  test("runs an allowed command without a shell", async () => {
    const { tools } = await fixture();

    const result = await tools.runCommand("bun", ["--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(result.command).toEqual(["bun", "--version"]);
  });

  test("denies a destructive command before spawning it", async () => {
    const { tools } = await fixture();

    await expect(tools.runCommand("rm", ["-rf", "."])).rejects.toBeInstanceOf(PolicyDeniedError);
  });
});
