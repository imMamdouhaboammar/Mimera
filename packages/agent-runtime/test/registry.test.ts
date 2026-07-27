import { describe, expect, test } from "bun:test";
import {
  AGENT_DESCRIPTORS,
  AgentRegistry,
  ContextPacketSchema,
} from "../src/index.ts";

describe("Mimera agent registry", () => {
  test("contains exactly 27 unique portable agent roles", () => {
    const registry = new AgentRegistry(AGENT_DESCRIPTORS);
    expect(registry.list()).toHaveLength(27);
    expect(new Set(registry.list().map((agent) => agent.id)).size).toBe(27);
  });

  test("keeps project writers exclusive and hook-protected", () => {
    const registry = new AgentRegistry(AGENT_DESCRIPTORS);
    const writers = registry.list().filter((agent) => agent.writesProject);

    expect(writers.map((agent) => agent.id)).toEqual([
      "component-builder",
      "interaction-builder",
      "page-integrator",
      "responsive-builder",
      "test-builder",
    ]);
    for (const writer of writers) {
      expect(writer.concurrency).toBe("exclusive-write");
      expect(writer.requiredHooks).toEqual(
        expect.arrayContaining(["builtin.write-scope", "builtin.command-policy"]),
      );
    }
  });

  test("keeps reviewers read-only and assigns visual reasoning where needed", () => {
    const registry = new AgentRegistry(AGENT_DESCRIPTORS);
    const reviewers = registry.byGroup("review");

    expect(reviewers.every((agent) => agent.writesProject === false)).toBe(true);
    expect(registry.get("taste-director").modelClass).toBe("vision-reasoning");
    expect(registry.get("visual-reviewer").toolProfile).toBe("visual-review");
    expect(registry.get("regression-guardian").outputArtifact).toBe("regression-report");
  });

  test("validates portable context packets without conversation history", () => {
    const packet = ContextPacketSchema.parse({
      schemaVersion: "1",
      id: "packet-1",
      sessionId: "session-1",
      pageId: "home",
      componentId: "navbar",
      agentId: "component-builder",
      assignment: "Implement the approved navbar component contract",
      evidenceRefs: ["dom-desktop", "dom-mobile"],
      artifactRefs: ["component-spec-navbar"],
      constraints: ["Write only approved target files"],
      toolGrant: {
        profile: "scoped-builder",
        targetFiles: ["src/components/Navbar.tsx"],
        allowedCommands: ["bun test"],
      },
      issuedAt: "2026-07-27T10:00:00.000Z",
    });

    expect(packet.agentId).toBe("component-builder");
    expect(packet).not.toHaveProperty("conversationHistory");
    expect(() => ContextPacketSchema.parse({ ...packet, evidenceRefs: [] })).toThrow();
  });
});
