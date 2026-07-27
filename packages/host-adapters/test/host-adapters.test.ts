import { describe, expect, test } from "bun:test";
import {
  AGENT_DESCRIPTORS,
  AgentRegistry,
} from "@mimera/agent-runtime";
import {
  HostAdapterRegistry,
  createDefaultHostAdapters,
} from "../src/index.ts";

const agents = new AgentRegistry(AGENT_DESCRIPTORS);
const adapters = new HostAdapterRegistry(createDefaultHostAdapters());

function files(host: "claude-code" | "codex" | "cursor" | "gemini-cli" | "generic") {
  return adapters.get(host).render({ agents, version: "0.1.0" });
}

describe("Claude Code adapter", () => {
  test("renders one native subagent file per portable role", () => {
    const rendered = files("claude-code");
    const agentFiles = rendered.files.filter((file) => file.path.startsWith(".claude/agents/"));

    expect(agentFiles).toHaveLength(27);
    expect(agentFiles.find((file) => file.path.endsWith("component-builder.md"))?.content).toContain(
      "tools: Read, Grep, Glob, Edit, Write, Bash",
    );
    expect(agentFiles.find((file) => file.path.endsWith("visual-reviewer.md"))?.content).not.toContain(
      "Edit, Write",
    );
    expect(rendered.tier).toBe("native-subagents");
  });
});

describe("worker-backed adapters", () => {
  test("renders the Codex skill and all portable worker descriptors", () => {
    const rendered = files("codex");
    expect(rendered.files.some((file) => file.path === ".codex/skills/mimera/SKILL.md")).toBe(true);
    expect(rendered.files.filter((file) => file.path.startsWith(".mimera/hosts/codex/agents/"))).toHaveLength(27);
    expect(rendered.tier).toBe("core-workers");
  });

  test("renders Cursor rules and a command without pretending they are isolated subagents", () => {
    const rendered = files("cursor");
    expect(rendered.files.some((file) => file.path === ".cursor/rules/mimera.mdc")).toBe(true);
    expect(rendered.files.some((file) => file.path === ".cursor/commands/mimera.md")).toBe(true);
    expect(rendered.files.filter((file) => file.path.startsWith(".mimera/hosts/cursor/agents/"))).toHaveLength(27);
    expect(rendered.tier).toBe("core-workers");
  });

  test("renders a Gemini CLI extension surface and worker descriptors", () => {
    const rendered = files("gemini-cli");
    expect(rendered.files.some((file) => file.path.endsWith("gemini-extension.json"))).toBe(true);
    expect(rendered.files.some((file) => file.path.endsWith("GEMINI.md"))).toBe(true);
    expect(rendered.files.filter((file) => file.path.startsWith(".mimera/hosts/gemini-cli/agents/"))).toHaveLength(27);
  });
});

test("all hosts are generated from the same descriptor registry hash", () => {
  const hashes = ["claude-code", "codex", "cursor", "gemini-cli", "generic"].map(
    (host) => adapters.get(host as Parameters<typeof adapters.get>[0]).render({ agents, version: "0.1.0" }).registryHash,
  );

  expect(new Set(hashes).size).toBe(1);
  for (const host of ["claude-code", "codex", "cursor", "gemini-cli", "generic"] as const) {
    const rendered = files(host);
    expect(rendered.files.every((file) => !file.path.startsWith("/") && !file.path.includes(".."))).toBe(true);
  }
});
