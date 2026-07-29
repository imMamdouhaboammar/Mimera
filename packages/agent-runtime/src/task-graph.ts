import { z } from "zod";
import { AgentIdSchema, type AgentId } from "./contracts.ts";

export const TaskNodeStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
  "blocked",
  "skipped",
]);
export type TaskNodeStatus = z.infer<typeof TaskNodeStatusSchema>;

export const TaskGraphNodeSchema = z
  .object({
    id: z.string().min(1),
    agentId: AgentIdSchema,
    description: z.string().min(1),
    dependencies: z.array(z.string().min(1)),
    status: TaskNodeStatusSchema,
    retryCount: z.number().int().nonnegative(),
    maxRetries: z.number().int().positive(),
    contextPacketId: z.string().optional(),
    resultId: z.string().optional(),
    error: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
  })
  .strict();
export type TaskGraphNode = z.infer<typeof TaskGraphNodeSchema>;

export const TaskGraphSchema = z
  .object({
    schemaVersion: z.literal("1"),
    id: z.string().min(1),
    sessionId: z.string().min(1),
    nodes: z.array(TaskGraphNodeSchema),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type TaskGraph = z.infer<typeof TaskGraphSchema>;

export interface CreateTaskNodeInput {
  id: string;
  agentId: AgentId;
  description: string;
  dependencies?: string[];
  maxRetries?: number;
}

export class TaskGraphManager {
  readonly #graph: TaskGraph;

  constructor(graph: TaskGraph) {
    this.#graph = TaskGraphSchema.parse(graph);
  }

  static create(sessionId: string, graphId?: string): TaskGraphManager {
    const now = new Date().toISOString();
    return new TaskGraphManager({
      schemaVersion: "1",
      id: graphId ?? crypto.randomUUID(),
      sessionId,
      nodes: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static parse(rawJson: string): TaskGraphManager {
    return new TaskGraphManager(JSON.parse(rawJson));
  }

  get graph(): TaskGraph {
    return this.#graph;
  }

  addNode(input: CreateTaskNodeInput): TaskGraphNode {
    if (this.#graph.nodes.some((node) => node.id === input.id)) {
      throw new Error(`Task node with id '${input.id}' already exists in task graph`);
    }
    const node: TaskGraphNode = {
      id: input.id,
      agentId: input.agentId,
      description: input.description,
      dependencies: input.dependencies ?? [],
      status: "pending",
      retryCount: 0,
      maxRetries: input.maxRetries ?? 3,
    };
    this.#graph.nodes.push(node);
    this.#graph.updatedAt = new Date().toISOString();
    return node;
  }

  getExecutableNodes(): TaskGraphNode[] {
    const completedIds = new Set(
      this.#graph.nodes
        .filter((node) => node.status === "completed" || node.status === "skipped")
        .map((node) => node.id),
    );
    return this.#graph.nodes.filter(
      (node) =>
        node.status === "pending" &&
        node.dependencies.every((dependencyId) => completedIds.has(dependencyId)),
    );
  }

  updateNodeStatus(
    nodeId: string,
    status: TaskNodeStatus,
    details: { error?: string; resultId?: string; contextPacketId?: string } = {},
  ): TaskGraphNode {
    const node = this.#graph.nodes.find((item) => item.id === nodeId);
    if (!node) throw new Error(`Task node '${nodeId}' not found in task graph`);

    const now = new Date().toISOString();
    node.status = status;
    if (status === "in_progress" && !node.startedAt) node.startedAt = now;
    if (status === "completed" || status === "skipped" || status === "blocked") node.completedAt = now;
    if (status === "failed") {
      node.retryCount += 1;
      if (node.retryCount >= node.maxRetries) node.status = "blocked";
    }
    if (details.error !== undefined) node.error = details.error;
    if (details.resultId !== undefined) node.resultId = details.resultId;
    if (details.contextPacketId !== undefined) node.contextPacketId = details.contextPacketId;

    this.#graph.updatedAt = now;
    return node;
  }

  isComplete(): boolean {
    return this.#graph.nodes.every(
      (node) => node.status === "completed" || node.status === "skipped",
    );
  }

  hasBlockers(): boolean {
    return this.#graph.nodes.some((node) => node.status === "blocked");
  }

  serialize(): string {
    return `${JSON.stringify(this.#graph, null, 2)}\n`;
  }
}
