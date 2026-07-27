import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  MimeraProject,
  ProjectAlreadyInitializedError,
  ProjectNotInitializedError,
} from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function targetRoot(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mimera-project-"));
  directories.push(directory);
  return directory;
}

describe("MimeraProject", () => {
  test("initializes a portable project and session", async () => {
    const root = await targetRoot();
    const project = await MimeraProject.initialize({
      targetRoot: root,
      referenceUrls: ["https://example.com"],
      host: "codex",
      mode: "structure",
      python: { enabled: true, command: "python3" },
      now: "2026-07-27T10:00:00.000Z",
    });

    const configText = await readFile(join(root, ".mimera", "config.json"), "utf8");
    const config = JSON.parse(configText) as { currentSessionId: string; targetRoot: string };

    expect(config.targetRoot).toBe(root);
    expect(config.currentSessionId).toBe(project.currentSession().id);
    expect(project.currentSession().status).toBe("CREATED");
    expect(project.status().nextStatuses).toEqual(["PREFLIGHT"]);
    expect(project.status().python.enabled).toBe(true);
    project.close();
  });

  test("refuses to overwrite an initialized project", async () => {
    const root = await targetRoot();
    const project = await MimeraProject.initialize({
      targetRoot: root,
      referenceUrls: ["https://example.com"],
      host: "codex",
      mode: "structure",
      python: { enabled: false },
    });
    project.close();

    expect(
      MimeraProject.initialize({
        targetRoot: root,
        referenceUrls: ["https://example.com"],
        host: "codex",
        mode: "structure",
        python: { enabled: false },
      }),
    ).rejects.toBeInstanceOf(ProjectAlreadyInitializedError);
  });

  test("loads and advances the current session through guarded state", async () => {
    const root = await targetRoot();
    const initialized = await MimeraProject.initialize({
      targetRoot: root,
      referenceUrls: ["https://example.com"],
      host: "codex",
      mode: "structure",
      python: { enabled: false },
      now: "2026-07-27T10:00:00.000Z",
    });
    initialized.close();

    const project = await MimeraProject.open(root);
    const advanced = await project.advance("PREFLIGHT", "workflow-orchestrator", {
      now: "2026-07-27T10:01:00.000Z",
      correlationId: "correlation-1",
    });

    expect(advanced.status).toBe("PREFLIGHT");
    expect(project.currentSession().version).toBe(2);
    expect(project.status().auditEventCount).toBe(1);
    project.close();
  });

  test("fails clearly when the project is not initialized", async () => {
    const root = await targetRoot();
    expect(MimeraProject.open(root)).rejects.toBeInstanceOf(ProjectNotInitializedError);
  });
});

test("persists evidence through the project boundary", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: "2026-07-27T10:00:00.000Z",
  });
  const sessionId = project.currentSession().id;
  const evidence = {
    id: "evidence-1",
    payload: { title: "Reference" },
    trust: "untrusted-reference" as const,
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:01:00.000Z",
    contentHash: "c".repeat(64),
  };

  project.recordEvidence(evidence);

  expect(project.listEvidence()).toEqual([evidence]);
  expect(project.status().evidenceCount).toBe(1);
  expect(project.currentSession().id).toBe(sessionId);
  project.close();
});
