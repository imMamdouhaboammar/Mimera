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


test("records an evidence pack through one project operation", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  const evidence = [
    {
      id: "pack-1",
      payload: { kind: "dom" },
      trust: "untrusted-reference" as const,
      sourceUrl: "https://example.com",
      capturedAt: "2026-07-27T10:01:00.000Z",
      contentHash: "e".repeat(64),
    },
    {
      id: "pack-2",
      payload: { kind: "screenshot" },
      trust: "untrusted-reference" as const,
      sourceUrl: "https://example.com",
      capturedAt: "2026-07-27T10:01:01.000Z",
      contentHash: "f".repeat(64),
    },
  ];

  expect(project.recordEvidenceBatch(evidence)).toEqual(evidence);
  expect(project.listEvidence()).toEqual(evidence);
  project.close();
});

test("completes reference capture with guarded state and evidence in one operation", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: "2026-07-27T10:00:00.000Z",
  });
  for (const status of ["PREFLIGHT", "PROJECT_PROFILED", "REFERENCE_AUTHORIZED"] as const) {
    await project.advance(status, "workflow-orchestrator");
  }
  const evidence = [{
    id: "capture-1",
    payload: { kind: "dom" },
    trust: "untrusted-reference" as const,
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:03:00.000Z",
    contentHash: "2".repeat(64),
  }];

  const session = await project.completeReferenceCapture(evidence, {
    actor: "reference-capture-service",
    correlationId: "capture-correlation",
    now: "2026-07-27T10:04:00.000Z",
  });

  expect(session.status).toBe("REFERENCE_CAPTURED");
  expect(project.currentSession().status).toBe("REFERENCE_CAPTURED");
  expect(project.listEvidence()).toEqual(evidence);
  project.close();
});

test("completes evidence-backed stages atomically", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: "2026-07-27T10:00:00.000Z",
  });
  await project.advance("PREFLIGHT", "preflight-service");
  const evidence = [{
    id: "project-profile-1",
    payload: { framework: "vite" },
    trust: "trusted-system" as const,
    capturedAt: "2026-07-27T10:01:00.000Z",
    contentHash: "3".repeat(64),
  }];

  const session = await project.completeStage("PROJECT_PROFILED", evidence, {
    actor: "project-inspector",
    correlationId: "profile-correlation",
  });

  expect(session.status).toBe("PROJECT_PROFILED");
  expect(project.listEvidence()).toEqual(evidence);
  project.close();
});

test("requires evidence for evidence-backed stage completion", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  await project.advance("PREFLIGHT", "preflight-service");

  await expect(
    project.completeStage("PROJECT_PROFILED", [], { actor: "project-inspector" }),
  ).rejects.toThrow("requires at least one evidence item");
  expect(project.currentSession().status).toBe("PREFLIGHT");
  project.close();
});
