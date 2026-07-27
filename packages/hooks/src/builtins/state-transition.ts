import {
  SessionStatusSchema,
  type HookDecision,
  type HostKind,
  type TrustedScope,
} from "@mimera/contracts";
import {
  SessionStateMachine,
  type TransitionGuard,
} from "@mimera/state-machine";
import { HookRunner } from "../runner.ts";
import { defineHook } from "../registry.ts";

interface StateTransitionInput {
  currentStatus: unknown;
  nextStatus: unknown;
  expectedVersion: unknown;
  actualVersion: unknown;
  actor: unknown;
}

export function createStateTransitionHook(machine = new SessionStateMachine()) {
  return defineHook({
    id: "builtin.state-transition",
    phases: ["pre-state-transition"],
    operations: ["state.transition"],
    layer: "platform-safety",
    priority: 5,
    run(context): HookDecision {
      const input = context.input as StateTransitionInput;
      const current = SessionStatusSchema.safeParse(input?.currentStatus);
      const next = SessionStatusSchema.safeParse(input?.nextStatus);
      if (!current.success || !next.success) {
        return {
          kind: "deny",
          reasonCode: "STATE_TRANSITION_INPUT_INVALID",
          message: "State transition input is invalid",
        };
      }
      if (
        typeof input.expectedVersion !== "number" ||
        typeof input.actualVersion !== "number" ||
        !Number.isInteger(input.expectedVersion) ||
        !Number.isInteger(input.actualVersion)
      ) {
        return {
          kind: "deny",
          reasonCode: "STATE_VERSION_INVALID",
          message: "State versions must be integers",
        };
      }
      if (input.expectedVersion !== input.actualVersion) {
        return {
          kind: "deny",
          reasonCode: "STATE_VERSION_STALE",
          message: "State transition was based on a stale session version",
        };
      }
      if (typeof input.actor !== "string" || input.actor.trim() === "") {
        return {
          kind: "deny",
          reasonCode: "STATE_ACTOR_INVALID",
          message: "State transitions require a named actor",
        };
      }
      if (!machine.canTransition(current.data, next.data)) {
        return {
          kind: "deny",
          reasonCode: "STATE_TRANSITION_ILLEGAL",
          message: `Transition ${current.data} -> ${next.data} is not allowed`,
        };
      }
      return {
        kind: "allow",
        reasonCode: "STATE_TRANSITION_ALLOWED",
        message: "State transition passed the independent hook",
      };
    },
  });
}

export interface HookTransitionGuardOptions {
  runner: HookRunner;
  trustedScope: TrustedScope;
  host: HostKind;
}

export function createHookTransitionGuard(options: HookTransitionGuardOptions): TransitionGuard {
  return async (input) => {
    const result = await options.runner.run({
      sessionId: input.session.id,
      ...(input.session.currentComponentId ? { componentId: input.session.currentComponentId } : {}),
      agentId: input.actor,
      host: options.host,
      phase: "pre-state-transition",
      operation: "state.transition",
      input: {
        currentStatus: input.session.status,
        nextStatus: input.nextStatus,
        expectedVersion: input.expectedVersion,
        actualVersion: input.session.version,
        actor: input.actor,
      },
      trustedScope: options.trustedScope,
      correlationId: input.correlationId,
    });
    return {
      allowed: result.decision.kind === "allow",
      reasonCode: result.decision.reasonCode,
      message: result.decision.message,
    };
  };
}
