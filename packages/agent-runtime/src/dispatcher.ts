import type {
  HookContext,
  HookDecision,
  HostKind,
  TrustedScope,
} from "@mimera/contracts";
import { HookRunner } from "@mimera/hooks";
import {
  AgentResultSchema,
  ContextPacketSchema,
  type AgentDescriptor,
  type AgentResult,
  type ContextPacket,
} from "./contracts.ts";
import { AgentRegistry } from "./registry.ts";

export interface AgentWorker {
  execute(descriptor: AgentDescriptor, packet: ContextPacket): Promise<unknown>;
}

export interface AgentDispatcherOptions {
  registry: AgentRegistry;
  hookRunner: HookRunner;
  resolveWorker(descriptor: AgentDescriptor): AgentWorker;
}

export interface DispatchAgentInput {
  packet: ContextPacket;
  trustedScope: TrustedScope;
  host: HostKind;
}

export class AgentDispatchDeniedError extends Error {
  readonly reasonCode: string;
  readonly phase: "pre-agent-dispatch" | "post-agent-result";

  constructor(
    decision: HookDecision,
    phase: "pre-agent-dispatch" | "post-agent-result",
  ) {
    super(decision.message);
    this.name = "AgentDispatchDeniedError";
    this.reasonCode = decision.reasonCode;
    this.phase = phase;
  }
}

export class AgentToolGrantMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentToolGrantMismatchError";
  }
}

export class AgentResultMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentResultMismatchError";
  }
}

export class AgentWorkerResultInvalidError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("Agent worker returned an invalid result contract");
    this.name = "AgentWorkerResultInvalidError";
    this.cause = cause;
  }
}

export class AgentConcurrencyError extends Error {
  readonly leaseKey: string;

  constructor(leaseKey: string) {
    super(`Agent concurrency lease is already held: ${leaseKey}`);
    this.name = "AgentConcurrencyError";
    this.leaseKey = leaseKey;
  }
}

function requireHookAllow(
  decision: HookDecision,
  phase: "pre-agent-dispatch" | "post-agent-result",
): void {
  if (decision.kind === "allow") return;
  throw new AgentDispatchDeniedError(decision, phase);
}

function ensureToolGrant(
  descriptor: AgentDescriptor,
  packet: ContextPacket,
  trustedScope: TrustedScope,
): void {
  if (packet.toolGrant.profile !== descriptor.toolProfile) {
    throw new AgentToolGrantMismatchError(
      `Agent ${descriptor.id} requires tool profile ${descriptor.toolProfile}, received ${packet.toolGrant.profile}`,
    );
  }
  const approvedFiles = new Set(trustedScope.targetFiles);
  const unapprovedFiles = packet.toolGrant.targetFiles.filter((path) => !approvedFiles.has(path));
  if (unapprovedFiles.length > 0) {
    throw new AgentToolGrantMismatchError(
      `Context packet grants unapproved target files: ${unapprovedFiles.join(", ")}`,
    );
  }
  const approvedCommands = new Set(trustedScope.allowedCommands);
  const unapprovedCommands = packet.toolGrant.allowedCommands.filter(
    (command) => !approvedCommands.has(command),
  );
  if (unapprovedCommands.length > 0) {
    throw new AgentToolGrantMismatchError(
      `Context packet grants unapproved commands: ${unapprovedCommands.join(", ")}`,
    );
  }
  const approvedOrigins = new Set(trustedScope.allowedOrigins);
  const unapprovedOrigins = (packet.toolGrant.allowedOrigins ?? []).filter(
    (origin) => !approvedOrigins.has(origin),
  );
  if (unapprovedOrigins.length > 0) {
    throw new AgentToolGrantMismatchError(
      `Context packet grants unapproved origins: ${unapprovedOrigins.join(", ")}`,
    );
  }
}

function leaseKey(descriptor: AgentDescriptor, packet: ContextPacket): string | null {
  if (descriptor.concurrency === "exclusive-write") {
    return `write:${packet.sessionId}:${packet.componentId ?? "session"}`;
  }
  if (descriptor.concurrency === "serial") {
    return `serial:${packet.sessionId}`;
  }
  return null;
}

export class AgentDispatcher {
  readonly #registry: AgentRegistry;
  readonly #hookRunner: HookRunner;
  readonly #resolveWorker: AgentDispatcherOptions["resolveWorker"];
  readonly #leases = new Set<string>();

  constructor(options: AgentDispatcherOptions) {
    this.#registry = options.registry;
    this.#hookRunner = options.hookRunner;
    this.#resolveWorker = options.resolveWorker;
  }

  async dispatch(input: DispatchAgentInput): Promise<AgentResult> {
    const packet = ContextPacketSchema.parse(input.packet);
    const descriptor = this.#registry.get(packet.agentId);
    ensureToolGrant(descriptor, packet, input.trustedScope);

    const key = leaseKey(descriptor, packet);
    if (key && this.#leases.has(key)) throw new AgentConcurrencyError(key);
    if (key) this.#leases.add(key);

    const correlationId = crypto.randomUUID();
    try {
      const preContext: HookContext = {
        sessionId: packet.sessionId,
        ...(packet.pageId ? { pageId: packet.pageId } : {}),
        ...(packet.componentId ? { componentId: packet.componentId } : {}),
        agentId: descriptor.id,
        host: input.host,
        phase: "pre-agent-dispatch",
        operation: `agent.dispatch.${descriptor.id}`,
        input: { descriptor, packet },
        trustedScope: input.trustedScope,
        correlationId,
      };
      const preDispatch = await this.#hookRunner.run(preContext);
      requireHookAllow(preDispatch.decision, "pre-agent-dispatch");

      const worker = this.#resolveWorker(descriptor);
      let result: AgentResult;
      try {
        result = AgentResultSchema.parse(await worker.execute(descriptor, packet));
      } catch (error) {
        if (error instanceof AgentResultMismatchError) throw error;
        throw new AgentWorkerResultInvalidError(error);
      }
      if (result.agentId !== descriptor.id) {
        throw new AgentResultMismatchError(
          `Agent result belongs to ${result.agentId}, expected ${descriptor.id}`,
        );
      }
      if (result.contextPacketId !== packet.id) {
        throw new AgentResultMismatchError(
          `Agent result belongs to packet ${result.contextPacketId}, expected ${packet.id}`,
        );
      }

      const postContext: HookContext = {
        sessionId: packet.sessionId,
        ...(packet.pageId ? { pageId: packet.pageId } : {}),
        ...(packet.componentId ? { componentId: packet.componentId } : {}),
        agentId: descriptor.id,
        host: input.host,
        phase: "post-agent-result",
        operation: `agent.result.${descriptor.id}`,
        input: result,
        trustedScope: input.trustedScope,
        correlationId,
      };
      const postResult = await this.#hookRunner.run(postContext);
      requireHookAllow(postResult.decision, "post-agent-result");
      const accepted = AgentResultSchema.parse(postResult.input);
      if (accepted.agentId !== descriptor.id || accepted.contextPacketId !== packet.id) {
        throw new AgentResultMismatchError("Post-result hooks changed the result identity");
      }
      return accepted;
    } finally {
      if (key) this.#leases.delete(key);
    }
  }
}
