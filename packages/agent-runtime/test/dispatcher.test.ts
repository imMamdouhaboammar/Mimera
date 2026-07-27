import { describe, expect, test } from "bun:test";
import type { TrustedScope } from "@mimera/contracts";
import {
  HookRunner,
  defineHook,
} from "@mimera/hooks";
import {
  AGENT_DESCRIPTORS,
  AgentConcurrencyError,
  AgentDispatcher,
  AgentResultMismatchError,
  AgentToolGrantMismatchError,
  AgentRegistry,
  AgentDispatchDeniedError,
  type AgentResult,
  type AgentWorker,
  type ContextPacket,
} from "../src/index.ts";

const registry = new AgentRegistry(AGENT_DESCRIPTORS);
const trustedScope: TrustedScope = {
  targetRoot: "/tmp/target",
  targetFiles: ["src/components/Navbar.tsx"],
  allowedOrigins: ["https://example.com"],
  allowedCommands: ["bun test"],
  grantedPackPermissions: ["project:write-scoped", "shell:declared-commands"],
  policyVersion: "1",
};

function packet(overrides: Partial<ContextPacket> = {}): ContextPacket {
  return {
    schemaVersion: "1",
    id: crypto.randomUUID(),
    sessionId: "session-1",
    pageId: "home",
    componentId: "navbar",
    agentId: "component-builder",
    assignment: "Implement the approved navbar contract",
    evidenceRefs: ["dom-desktop", "dom-mobile"],
    artifactRefs: ["component-spec-navbar"],
    constraints: ["Write only approved target files"],
    toolGrant: {
      profile: "scoped-builder",
      targetFiles: ["src/components/Navbar.tsx"],
      allowedCommands: ["bun test"],
    },
    issuedAt: "2026-07-27T10:00:00.000Z",
    ...overrides,
  };
}

function completed(packetValue: ContextPacket, overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    schemaVersion: "1",
    agentId: packetValue.agentId,
    contextPacketId: packetValue.id,
    status: "completed",
    summary: "Completed the bounded assignment",
    outputArtifacts: ["implementation-navbar"],
    findings: [],
    requestedApprovalKinds: [],
    completedAt: "2026-07-27T10:01:00.000Z",
    ...overrides,
  };
}

class FakeWorker implements AgentWorker {
  calls = 0;
  readonly #execute: AgentWorker["execute"];

  constructor(execute: AgentWorker["execute"]) {
    this.#execute = execute;
  }

  execute(...args: Parameters<AgentWorker["execute"]>): ReturnType<AgentWorker["execute"]> {
    this.calls += 1;
    return this.#execute(...args);
  }
}

describe("AgentDispatcher", () => {
  test("dispatches a validated packet and accepts a matching typed result", async () => {
    const worker = new FakeWorker(async (_descriptor, packetValue) => completed(packetValue));
    const dispatcher = new AgentDispatcher({
      registry,
      hookRunner: new HookRunner(),
      resolveWorker: () => worker,
    });

    const result = await dispatcher.dispatch({
      packet: packet(),
      trustedScope,
      host: "codex",
    });

    expect(result.status).toBe("completed");
    expect(worker.calls).toBe(1);
  });

  test("blocks dispatch before invoking the worker when a hook denies it", async () => {
    const worker = new FakeWorker(async (_descriptor, packetValue) => completed(packetValue));
    const denyHook = defineHook({
      id: "test.dispatch-deny",
      phases: ["pre-agent-dispatch"],
      layer: "organization-policy",
      priority: 0,
      run: () => ({ kind: "deny", reasonCode: "DISPATCH_BLOCKED", message: "Blocked" }),
    });
    const dispatcher = new AgentDispatcher({
      registry,
      hookRunner: new HookRunner({ hooks: [denyHook] }),
      resolveWorker: () => worker,
    });

    await expect(
      dispatcher.dispatch({ packet: packet(), trustedScope, host: "codex" }),
    ).rejects.toBeInstanceOf(AgentDispatchDeniedError);
    expect(worker.calls).toBe(0);
  });

  test("rejects a result that belongs to another packet", async () => {
    const worker = new FakeWorker(async (_descriptor, packetValue) =>
      completed(packetValue, { contextPacketId: "another-packet" }),
    );
    const dispatcher = new AgentDispatcher({
      registry,
      hookRunner: new HookRunner(),
      resolveWorker: () => worker,
    });

    await expect(
      dispatcher.dispatch({ packet: packet(), trustedScope, host: "codex" }),
    ).rejects.toBeInstanceOf(AgentResultMismatchError);
  });

  test("rejects tool grants that exceed or differ from the descriptor profile", async () => {
    const worker = new FakeWorker(async (_descriptor, packetValue) => completed(packetValue));
    const dispatcher = new AgentDispatcher({
      registry,
      hookRunner: new HookRunner(),
      resolveWorker: () => worker,
    });

    await expect(
      dispatcher.dispatch({
        packet: packet({ toolGrant: { profile: "orchestration-control", targetFiles: [], allowedCommands: [] } }),
        trustedScope,
        host: "codex",
      }),
    ).rejects.toBeInstanceOf(AgentToolGrantMismatchError);
  });

  test("prevents concurrent writers on the same session component", async () => {
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const worker = new FakeWorker(async (_descriptor, packetValue) => {
      await blocked;
      return completed(packetValue);
    });
    const dispatcher = new AgentDispatcher({
      registry,
      hookRunner: new HookRunner(),
      resolveWorker: () => worker,
    });
    const firstPacket = packet();
    const first = dispatcher.dispatch({ packet: firstPacket, trustedScope, host: "codex" });
    await Bun.sleep(10);

    await expect(
      dispatcher.dispatch({ packet: packet(), trustedScope, host: "codex" }),
    ).rejects.toBeInstanceOf(AgentConcurrencyError);

    release?.();
    await expect(first).resolves.toMatchObject({ contextPacketId: firstPacket.id });
  });
});
