import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MimeraProject } from "@mimera/core";
import { PreflightService, PreflightStateError } from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createProject(): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-preflight-"));
  directories.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "preflight-fixture",
    scripts: { test: "bun test" },
    dependencies: { react: "19.0.0" },
    devDependencies: { vite: "7.0.0" },
  }));
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1\n");
  await writeFile(join(root, "src", "main.tsx"), "export const app = true;\n");
  return MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: "2026-07-27T10:00:00.000Z",
  });
}

test("profiles and authorizes a reference with durable evidence", async () => {
  const project = await createProject();
  const service = new PreflightService({ now: () => "2026-07-27T10:01:00.000Z" });

  const result = await service.prepare(project);
  const evidence = project.listEvidence<{ kind: string; profile?: { packageName?: string } }>();

  expect(result.session.status).toBe("REFERENCE_AUTHORIZED");
  expect(result.profile.packageName).toBe("preflight-fixture");
  expect(evidence).toHaveLength(2);
  expect(evidence.map((item) => item.trust)).toEqual(["trusted-system", "trusted-user"]);
  expect(evidence.map((item) => item.payload.kind)).toEqual(["project-profile", "reference-authorization"]);
  project.close();
});

test("resumes safely from PREFLIGHT without creating duplicate evidence", async () => {
  const project = await createProject();
  await project.advance("PREFLIGHT", "preflight-service");
  const service = new PreflightService({ now: () => "2026-07-27T10:01:00.000Z" });

  await service.prepare(project);
  await service.prepare(project);

  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(2);
  project.close();
});

test("refuses to prepare sessions that already moved past authorization", async () => {
  const project = await createProject();
  const service = new PreflightService();
  await service.prepare(project);
  await project.completeStage("REFERENCE_CAPTURED", [{
    id: "capture-placeholder",
    payload: { kind: "capture" },
    trust: "untrusted-reference",
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:02:00.000Z",
    contentHash: "4".repeat(64),
  }], { actor: "reference-capture-service" });

  await expect(service.prepare(project)).rejects.toBeInstanceOf(PreflightStateError);
  project.close();
});
