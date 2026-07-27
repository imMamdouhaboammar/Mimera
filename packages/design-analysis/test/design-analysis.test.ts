import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { MimeraProject } from "@mimera/core";
import { PreflightService } from "@mimera/preflight";
import { ReferenceCaptureService } from "@mimera/reference-capture";
import {
  DesignAnalysisService,
  DesignEvidenceIncompleteError,
} from "../src/index.ts";

let server: ReturnType<typeof Bun.serve>;
let origin: string;
const directories: string[] = [];

beforeAll(() => {
  const fixture = resolve(import.meta.dir, "../../../fixtures/reference-sites/navbar/index.html");
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: MimeraBot\nAllow: /", { status: 200 });
      }
      if (url.pathname === "/") {
        return new Response(await readFile(fixture), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    },
  });
  origin = `http://${server.hostname}:${server.port}`;
});

afterAll(() => server.stop(true));
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function capturedProject(viewportCount: 1 | 2): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-design-analysis-"));
  directories.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "design-analysis-fixture",
    scripts: { test: "bun test" },
    dependencies: { react: "19.0.0" },
    devDependencies: { vite: "7.0.0" },
  }));
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1\n");
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: [origin],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  await new PreflightService().prepare(project);
  await new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 0,
  }).capture(project, {
    url: origin,
    viewports: viewportCount === 2
      ? [
          { id: "desktop", width: 1440, height: 900, isMobile: false },
          { id: "mobile", width: 390, height: 844, isMobile: true },
        ]
      : [{ id: "desktop", width: 1440, height: 900, isMobile: false }],
  });
  return project;
}

test("extracts and persists design DNA and page decomposition", async () => {
  const project = await capturedProject(2);
  const service = new DesignAnalysisService({ now: () => "2026-07-27T10:10:00.000Z" });

  const result = await service.analyze(project);

  expect(result.session.status).toBe("PAGE_DECOMPOSED");
  expect(result.analysis.dna.responsiveRules.some((rule) => rule.type === "navigation-collapses-to-menu")).toBe(true);
  expect(result.analysis.decomposition.components[0]?.id).toBe("navbar");
  expect(project.listEvidence()).toHaveLength(12);

  const repeated = await service.analyze(project);
  expect(repeated.analysis).toEqual(result.analysis);
  expect(project.listEvidence()).toHaveLength(12);
  project.close();
}, 30_000);

test("requires at least two viewport DOM captures", async () => {
  const project = await capturedProject(1);

  await expect(new DesignAnalysisService().analyze(project)).rejects.toBeInstanceOf(
    DesignEvidenceIncompleteError,
  );
  expect(project.currentSession().status).toBe("REFERENCE_CAPTURED");
  project.close();
}, 30_000);
