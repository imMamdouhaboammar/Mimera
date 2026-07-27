import {
  AgentDescriptorSchema,
  type AgentDescriptor,
  type AgentGroup,
  type AgentId,
} from "./contracts.ts";

export class AgentNotFoundError extends Error {
  readonly agentId: string;

  constructor(agentId: string) {
    super(`Mimera agent is not registered: ${agentId}`);
    this.name = "AgentNotFoundError";
    this.agentId = agentId;
  }
}

export class DuplicateAgentError extends Error {
  readonly agentId: AgentId;

  constructor(agentId: AgentId) {
    super(`Duplicate Mimera agent id: ${agentId}`);
    this.name = "DuplicateAgentError";
    this.agentId = agentId;
  }
}

export class AgentRegistry {
  readonly #agents: Map<AgentId, AgentDescriptor>;

  constructor(input: readonly AgentDescriptor[]) {
    this.#agents = new Map();
    for (const raw of input) {
      const descriptor = AgentDescriptorSchema.parse(raw);
      if (this.#agents.has(descriptor.id)) throw new DuplicateAgentError(descriptor.id);
      this.#agents.set(descriptor.id, Object.freeze({ ...descriptor }));
    }
  }

  get(agentId: AgentId): AgentDescriptor {
    const descriptor = this.#agents.get(agentId);
    if (!descriptor) throw new AgentNotFoundError(agentId);
    return descriptor;
  }

  list(): AgentDescriptor[] {
    return [...this.#agents.values()]
      .map((descriptor) => ({ ...descriptor }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  byGroup(group: AgentGroup): AgentDescriptor[] {
    return this.list().filter((descriptor) => descriptor.group === group);
  }
}
