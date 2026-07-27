import {
  ReferenceSessionSchema,
  type ReferenceSession,
  type SessionStatus,
} from "@mimera/contracts";

const TRANSITIONS: Readonly<Record<SessionStatus, readonly SessionStatus[]>> = {
  CREATED: ["PREFLIGHT"],
  PREFLIGHT: ["PROJECT_PROFILED", "BLOCKED"],
  PROJECT_PROFILED: ["REFERENCE_AUTHORIZED", "BLOCKED"],
  REFERENCE_AUTHORIZED: ["REFERENCE_CAPTURED", "BLOCKED"],
  REFERENCE_CAPTURED: ["PAGE_DECOMPOSED", "BLOCKED"],
  PAGE_DECOMPOSED: ["COMPONENT_SPECIFIED", "PAGE_INTEGRATION", "BLOCKED"],
  COMPONENT_SPECIFIED: ["IMPLEMENTING", "BLOCKED"],
  IMPLEMENTING: ["AUTOMATED_REVIEW", "BLOCKED"],
  AUTOMATED_REVIEW: ["NEEDS_REVISION", "USER_REVIEW", "BLOCKED"],
  NEEDS_REVISION: ["IMPLEMENTING", "BLOCKED"],
  BLOCKED: ["PREFLIGHT", "PROJECT_PROFILED", "REFERENCE_AUTHORIZED", "REFERENCE_CAPTURED", "PAGE_DECOMPOSED", "COMPONENT_SPECIFIED", "IMPLEMENTING", "AUTOMATED_REVIEW", "USER_REVIEW"],
  USER_REVIEW: ["CHANGES_REQUESTED", "REJECTED", "APPROVED", "BLOCKED"],
  CHANGES_REQUESTED: ["IMPLEMENTING", "BLOCKED"],
  REJECTED: ["COMPONENT_SPECIFIED", "BLOCKED"],
  APPROVED: ["LOCKED", "BLOCKED"],
  LOCKED: ["NEXT_COMPONENT", "PAGE_INTEGRATION", "BLOCKED"],
  NEXT_COMPONENT: ["COMPONENT_SPECIFIED", "PAGE_INTEGRATION", "BLOCKED"],
  PAGE_INTEGRATION: ["FINAL_VERIFICATION", "BLOCKED"],
  FINAL_VERIFICATION: ["COMPLETE", "NEEDS_REVISION", "BLOCKED"],
  COMPLETE: [],
};

export interface TransitionGuardDecision {
  allowed: boolean;
  reasonCode: string;
  message: string;
}

export interface TransitionGuardInput {
  session: ReferenceSession;
  nextStatus: SessionStatus;
  expectedVersion: number;
  actor: string;
  correlationId: string;
}

export type TransitionGuard = (
  input: TransitionGuardInput,
) => Promise<TransitionGuardDecision> | TransitionGuardDecision;

export interface TransitionRequest {
  session: ReferenceSession;
  nextStatus: SessionStatus;
  expectedVersion: number;
  actor: string;
  correlationId?: string;
  now?: string;
}

export class InvalidTransitionError extends Error {
  readonly currentStatus: SessionStatus;
  readonly nextStatus: SessionStatus;

  constructor(currentStatus: SessionStatus, nextStatus: SessionStatus) {
    super(`Invalid session transition: ${currentStatus} -> ${nextStatus}`);
    this.name = "InvalidTransitionError";
    this.currentStatus = currentStatus;
    this.nextStatus = nextStatus;
  }
}

export class StaleSessionError extends Error {
  readonly expectedVersion: number;
  readonly actualVersion: number;

  constructor(expectedVersion: number, actualVersion: number) {
    super(`Stale session version: expected ${expectedVersion}, actual ${actualVersion}`);
    this.name = "StaleSessionError";
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class GuardDeniedError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "GuardDeniedError";
    this.reasonCode = reasonCode;
  }
}

export interface SessionStateMachineOptions {
  guard?: TransitionGuard;
}

export class SessionStateMachine {
  readonly #guard: TransitionGuard | undefined;

  constructor(options: SessionStateMachineOptions = {}) {
    this.#guard = options.guard;
  }

  canTransition(currentStatus: SessionStatus, nextStatus: SessionStatus): boolean {
    return TRANSITIONS[currentStatus].includes(nextStatus);
  }

  allowedTransitions(currentStatus: SessionStatus): readonly SessionStatus[] {
    return TRANSITIONS[currentStatus];
  }

  async transition(request: TransitionRequest): Promise<ReferenceSession> {
    const session = ReferenceSessionSchema.parse(request.session);
    if (request.expectedVersion !== session.version) {
      throw new StaleSessionError(request.expectedVersion, session.version);
    }
    if (!this.canTransition(session.status, request.nextStatus)) {
      throw new InvalidTransitionError(session.status, request.nextStatus);
    }

    const correlationId = request.correlationId ?? crypto.randomUUID();
    if (this.#guard) {
      const decision = await this.#guard({
        session,
        nextStatus: request.nextStatus,
        expectedVersion: request.expectedVersion,
        actor: request.actor,
        correlationId,
      });
      if (!decision.allowed) {
        throw new GuardDeniedError(decision.reasonCode, decision.message);
      }
    }

    return ReferenceSessionSchema.parse({
      ...session,
      status: request.nextStatus,
      version: session.version + 1,
      updatedAt: request.now ?? new Date().toISOString(),
    });
  }
}
