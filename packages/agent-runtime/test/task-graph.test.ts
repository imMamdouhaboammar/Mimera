import { expect, test } from "bun:test";
import { TaskGraphManager } from "../src/index.ts";

test("TaskGraphManager initializes, adds nodes, resolves executable order, and handles retries", () => {
  const manager = TaskGraphManager.create("session-123");

  const task1 = manager.addNode({
    id: "task-cartographer",
    agentId: "project-cartographer",
    description: "Map project structure and dependencies",
  });

  const task2 = manager.addNode({
    id: "task-spec",
    agentId: "component-architect",
    description: "Specify component contracts",
    dependencies: ["task-cartographer"],
  });

  expect(task1.status).toBe("pending");
  expect(task2.status).toBe("pending");

  // Initial executable nodes (only task1 has 0 dependencies)
  let executable = manager.getExecutableNodes();
  expect(executable).toHaveLength(1);
  expect(executable[0]?.id).toBe("task-cartographer");

  // Start task 1
  manager.updateNodeStatus("task-cartographer", "in_progress");
  expect(manager.getExecutableNodes()).toHaveLength(0);

  // Complete task 1
  manager.updateNodeStatus("task-cartographer", "completed", { resultId: "res-1" });
  expect(manager.isComplete()).toBe(false);

  // Now task 2 becomes executable
  executable = manager.getExecutableNodes();
  expect(executable).toHaveLength(1);
  expect(executable[0]?.id).toBe("task-spec");

  // Complete task 2
  manager.updateNodeStatus("task-spec", "completed", { resultId: "res-2" });
  expect(manager.isComplete()).toBe(true);

  // Verify serialization
  const serialized = manager.serialize();
  const restored = TaskGraphManager.parse(serialized);
  expect(restored.graph.id).toBe(manager.graph.id);
  expect(restored.isComplete()).toBe(true);
});

test("TaskGraphManager escalates to blocked after max retries", () => {
  const manager = TaskGraphManager.create("session-fail");
  manager.addNode({
    id: "task-retry",
    agentId: "component-builder",
    description: "Build component with retry",
    maxRetries: 2,
  });

  manager.updateNodeStatus("task-retry", "failed", { error: "Attempt 1 failed" });
  expect(manager.graph.nodes[0]?.retryCount).toBe(1);
  expect(manager.graph.nodes[0]?.status).toBe("failed");

  manager.updateNodeStatus("task-retry", "failed", { error: "Attempt 2 failed" });
  expect(manager.graph.nodes[0]?.retryCount).toBe(2);
  expect(manager.graph.nodes[0]?.status).toBe("blocked");
  expect(manager.hasBlockers()).toBe(true);
});
