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
  await project.advance("PREFLIGHT", "workflow-orchestrator");
  await project.completeStage("PROJECT_PROFILED", [{
    id: "profile-capture-test",
    payload: { kind: "project-profile" },
    trust: "trusted-system",
    capturedAt: "2026-07-27T10:01:00.000Z",
    contentHash: "7".repeat(64),
  }], { actor: "project-inspector" });
  await project.completeStage("REFERENCE_AUTHORIZED", [{
    id: "auth-capture-test",
    payload: { kind: "reference-authorization" },
    trust: "trusted-user",
    capturedAt: "2026-07-27T10:02:00.000Z",
    contentHash: "8".repeat(64),
  }], { actor: "reference-authorization-service" });
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
  expect(project.listEvidence()).toHaveLength(3);
  expect(project.listEvidence()).toContainEqual(evidence[0]!);
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

test("cannot bypass evidence-backed capture with advance", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  await project.advance("PREFLIGHT", "preflight-service");
  await project.completeStage("PROJECT_PROFILED", [{
    id: "profile-guard",
    payload: { kind: "project-profile" },
    trust: "trusted-system",
    capturedAt: "2026-07-27T10:00:01.000Z",
    contentHash: "5".repeat(64),
  }], { actor: "project-inspector" });
  await project.completeStage("REFERENCE_AUTHORIZED", [{
    id: "auth-guard",
    payload: { kind: "reference-authorization" },
    trust: "trusted-user",
    capturedAt: "2026-07-27T10:00:02.000Z",
    contentHash: "6".repeat(64),
  }], { actor: "reference-authorization-service" });

  await expect(
    project.advance("REFERENCE_CAPTURED", "reference-capture-service"),
  ).rejects.toThrow("requires evidence");
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  project.close();
});

test("persists page and component context with an evidence-backed stage", async () => {
  const root = await targetRoot();
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  await project.advance("PREFLIGHT", "preflight-service");
  await project.completeStage("PROJECT_PROFILED", [{
    id: "profile-context",
    payload: { kind: "project-profile" },
    trust: "trusted-system",
    capturedAt: "2026-07-27T10:00:01.000Z",
    contentHash: "b".repeat(64),
  }], { actor: "project-inspector" });
  await project.completeStage("REFERENCE_AUTHORIZED", [{
    id: "authorization-context",
    payload: { kind: "reference-authorization" },
    trust: "trusted-user",
    capturedAt: "2026-07-27T10:00:02.000Z",
    contentHash: "c".repeat(64),
  }], { actor: "reference-authorization-service" });
  await project.completeStage("REFERENCE_CAPTURED", [{
    id: "capture-context",
    payload: { kind: "capture" },
    trust: "untrusted-reference",
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:00:03.000Z",
    contentHash: "d".repeat(64),
  }], { actor: "reference-capture-service" });
  await project.completeStage("PAGE_DECOMPOSED", [{
    id: "decomposition-context",
    payload: { kind: "page-decomposition" },
    trust: "trusted-system",
    capturedAt: "2026-07-27T10:00:04.000Z",
    contentHash: "e".repeat(64),
  }], { actor: "design-analysis-service" });

  const session = await project.completeStage("COMPONENT_SPECIFIED", [{
    id: "component-context",
    payload: { kind: "component-spec" },
    trust: "trusted-system",
    capturedAt: "2026-07-27T10:00:05.000Z",
    contentHash: "f".repeat(64),
  }], {
    actor: "component-specification-service",
    sessionPatch: { currentPageId: "home", currentComponentId: "navbar" },
  });

  expect(session.currentPageId).toBe("home");
  expect(session.currentComponentId).toBe("navbar");
  expect(project.currentSession().currentComponentId).toBe("navbar");
  project.close();
});
