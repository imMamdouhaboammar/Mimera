import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { MimeraProject } from "@mimera/core";
import {
  ReferenceCaptureService,
  ReferenceCaptureStateError,
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

async function createProject(): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-reference-capture-"));
  directories.push(root);
  return MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: [origin],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
}

test("captures and commits a complete responsive evidence pack", async () => {
  const project = await createProject();
  for (const status of ["PREFLIGHT", "PROJECT_PROFILED", "REFERENCE_AUTHORIZED"] as const) {
    await project.advance(status, "workflow-orchestrator");
  }
  const service = new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 0,
  });

  const result = await service.capture(project, {
    url: origin,
    viewports: [
      { id: "desktop", width: 1440, height: 900, isMobile: false },
      { id: "mobile", width: 390, height: 844, isMobile: true },
    ],
  });

  expect(result.session.status).toBe("REFERENCE_CAPTURED");
  expect(project.currentSession().status).toBe("REFERENCE_CAPTURED");
  expect(project.listEvidence()).toHaveLength(8);
  expect(result.capture.captures).toHaveLength(2);
  expect((await stat(result.outputDirectory)).isDirectory()).toBe(true);
  project.close();
}, 30_000);

test("refuses capture before reference authorization", async () => {
  const project = await createProject();
  const service = new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 0,
  });

  await expect(
    service.capture(project, {
      url: origin,
      viewports: [{ id: "desktop", width: 1440, height: 900, isMobile: false }],
    }),
  ).rejects.toBeInstanceOf(ReferenceCaptureStateError);
  expect(project.listEvidence()).toEqual([]);
  project.close();
});
