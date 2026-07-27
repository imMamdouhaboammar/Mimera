import { describe, expect, test } from "bun:test";
import type { ReferenceSession } from "@mimera/contracts";
import {
  GuardDeniedError,
  InvalidTransitionError,
  SessionStateMachine,
  StaleSessionError,
  type TransitionGuard,
} from "../src/index.ts";

const baseSession: ReferenceSession = {
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

describe("SessionStateMachine", () => {
  test("performs a legal transition and increments the version", async () => {
    const machine = new SessionStateMachine();
    const result = await machine.transition({
      session: baseSession,
      nextStatus: "PREFLIGHT",
      expectedVersion: 1,
      actor: "workflow-orchestrator",
      now: "2026-07-27T10:01:00.000Z",
    });

    expect(result.status).toBe("PREFLIGHT");
    expect(result.version).toBe(2);
    expect(result.updatedAt).toBe("2026-07-27T10:01:00.000Z");
    expect(baseSession.status).toBe("CREATED");
  });

  test("rejects a transition that is not in the graph", async () => {
    const machine = new SessionStateMachine();
    expect(
      machine.transition({
        session: baseSession,
        nextStatus: "COMPLETE",
        expectedVersion: 1,
        actor: "workflow-orchestrator",
      }),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  test("rejects stale optimistic concurrency versions", async () => {
    const machine = new SessionStateMachine();
    expect(
      machine.transition({
        session: baseSession,
        nextStatus: "PREFLIGHT",
        expectedVersion: 4,
        actor: "workflow-orchestrator",
      }),
    ).rejects.toBeInstanceOf(StaleSessionError);
  });

  test("runs an independent guard before committing state", async () => {
    const guard: TransitionGuard = async () => ({
      allowed: false,
      reasonCode: "MISSING_PREFLIGHT_REPORT",
      message: "Preflight report is required",
    });
    const machine = new SessionStateMachine({ guard });

    expect(
      machine.transition({
        session: baseSession,
        nextStatus: "PREFLIGHT",
        expectedVersion: 1,
        actor: "workflow-orchestrator",
      }),
    ).rejects.toBeInstanceOf(GuardDeniedError);
  });
});
