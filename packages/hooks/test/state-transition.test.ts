import { describe, expect, test } from "bun:test";
import type { HookContext, ReferenceSession, TrustedScope } from "@mimera/contracts";
import { SessionStateMachine } from "@mimera/state-machine";
import {
  HookRunner,
  createHookTransitionGuard,
  createStateTransitionHook,
} from "../src/index.ts";

const trustedScope: TrustedScope = {
  targetRoot: "/tmp/target",
  targetFiles: [],
  allowedOrigins: [],
  allowedCommands: [],
  grantedPackPermissions: [],
  policyVersion: "1",
};

const session: ReferenceSession = {
  id: "session-1",
  version: 1,
  targetRoot: "/tmp/target",
  referenceUrls: ["https://example.com"],
  host: "codex",
  mode: "structure",
  status: "CREATED",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
};

describe("state transition enforcement", () => {
  test("denies transitions outside the canonical graph", async () => {
    const context: HookContext = {
      sessionId: session.id,
      host: session.host,
      phase: "pre-state-transition",
      operation: "state.transition",
      input: {
        currentStatus: "CREATED",
        nextStatus: "COMPLETE",
        expectedVersion: 1,
        actualVersion: 1,
        actor: "workflow-orchestrator",
      },
      trustedScope,
      correlationId: "correlation-1",
    };

    const result = await new HookRunner({ hooks: [createStateTransitionHook()] }).run(context);
    expect(result.decision.kind).toBe("deny");
    expect(result.decision.reasonCode).toBe("STATE_TRANSITION_ILLEGAL");
  });

  test("adapts the hook runner into the state machine guard", async () => {
    const runner = new HookRunner({ hooks: [createStateTransitionHook()] });
    const machine = new SessionStateMachine({
      guard: createHookTransitionGuard({ runner, trustedScope, host: "codex" }),
    });

    const result = await machine.transition({
      session,
      nextStatus: "PREFLIGHT",
      expectedVersion: 1,
      actor: "workflow-orchestrator",
      correlationId: "correlation-2",
    });

    expect(result.status).toBe("PREFLIGHT");
  });
});
