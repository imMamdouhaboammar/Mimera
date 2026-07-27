import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  AGENT_DESCRIPTORS,
  AgentRegistry,
} from "@mimera/agent-runtime";
import {
  HostAdapterRegistry,
  createDefaultHostAdapters,
} from "@mimera/host-adapters";
import {
  HostInstallConflictError,
  MimeraInstaller,
  detectHosts,
} from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function root(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mimera-installer-"));
  directories.push(directory);
  return directory;
}

function installer(): MimeraInstaller {
  return new MimeraInstaller({
    agents: new AgentRegistry(AGENT_DESCRIPTORS),
    adapters: new HostAdapterRegistry(createDefaultHostAdapters()),
    version: "0.1.0",
    now: () => "2026-07-27T10:00:00.000Z",
  });
}

test("installs the Claude adapter atomically and records a manifest", async () => {
  const target = await root();

  const result = await installer().install({ targetRoot: target, hosts: ["claude-code"] });

  expect(result.hosts).toEqual(["claude-code"]);
  expect(result.written.filter((path) => path.startsWith(".claude/agents/"))).toHaveLength(27);
  expect((await stat(join(target, ".claude/agents/component-builder.md"))).isFile()).toBe(true);
  expect(await readFile(join(target, ".claude/agents/component-builder.md"), "utf8")).toContain(
    "tools: Read, Grep, Glob, Edit, Write, Bash",
  );
  const manifest = JSON.parse(
    await readFile(join(target, ".mimera/installations/claude-code.json"), "utf8"),
  ) as { host: string; registryHash: string; files: { path: string; contentHash: string }[] };
  expect(manifest.host).toBe("claude-code");
  expect(manifest.registryHash).toHaveLength(64);
  expect(manifest.files.some((file) => file.path === ".claude/agents/component-builder.md")).toBe(true);
});

test("is idempotent when generated files are unchanged", async () => {
  const target = await root();
  const service = installer();
  const first = await service.install({ targetRoot: target, hosts: ["codex"] });
  const second = await service.install({ targetRoot: target, hosts: ["codex"] });

  expect(first.written.length).toBeGreaterThan(20);
  expect(second.written).toEqual([]);
  expect(second.unchanged.length).toBe(first.written.length);
});

test("fails before writing any file when a generated path conflicts", async () => {
  const target = await root();
  await writeFile(join(target, ".conflict-marker"), "keep\n");
  await Bun.write(join(target, ".claude/agents/component-builder.md"), "custom local agent\n");

  await expect(
    installer().install({ targetRoot: target, hosts: ["claude-code"] }),
  ).rejects.toBeInstanceOf(HostInstallConflictError);

  expect(await readFile(join(target, ".claude/agents/component-builder.md"), "utf8")).toBe(
    "custom local agent\n",
  );
  await expect(stat(join(target, ".claude/agents/visual-reviewer.md"))).rejects.toMatchObject({
    code: "ENOENT",
  });
  expect(await readFile(join(target, ".conflict-marker"), "utf8")).toBe("keep\n");
});

test("force installation backs up and replaces conflicting files", async () => {
  const target = await root();
  await Bun.write(join(target, ".cursor/rules/mimera.mdc"), "custom cursor rule\n");

  const result = await installer().install({
    targetRoot: target,
    hosts: ["cursor"],
    force: true,
  });

  expect(result.replaced).toContain(".cursor/rules/mimera.mdc");
  expect(await readFile(join(target, ".cursor/rules/mimera.mdc"), "utf8")).toContain(
    "Mandatory Mimera workflow",
  );
  expect((await stat(join(target, ".mimera/backups/cursor/.cursor/rules/mimera.mdc"))).isFile()).toBe(true);
});

test("detects host surfaces without inventing unsupported hosts", async () => {
  const target = await root();
  await Bun.write(join(target, ".cursor/rules/project.mdc"), "---\nalwaysApply: true\n---\n");
  await Bun.write(join(target, "CLAUDE.md"), "# Project\n");

  expect(await detectHosts(target)).toEqual(["claude-code", "cursor"]);
  expect(await detectHosts(await root())).toEqual(["generic"]);
});
