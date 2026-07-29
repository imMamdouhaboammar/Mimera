import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { BrowserDownloadDeniedError } from "@mimera/browser-lab";
import { MimeraProject } from "@mimera/core";
import { NavigationDeniedError } from "@mimera/reference-policy";
import {
  ReferenceCaptureService,
  ReferenceCaptureStateError,
} from "../src/index.ts";

let server: ReturnType<typeof Bun.serve>;
let externalServer: ReturnType<typeof Bun.serve>;
let origin: string;
let externalOrigin: string;
const directories: string[] = [];

beforeAll(() => {
  const fixture = resolve(import.meta.dir, "../../../fixtures/reference-sites/navbar/index.html");
  externalServer = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: MimeraBot\nAllow: /", { status: 200 });
      }
      if (url.pathname === "/final") {
        return new Response(await readFile(fixture), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    },
  });
  externalOrigin = `http://${externalServer.hostname}:${externalServer.port}`;

  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: MimeraBot\nAllow: /", { status: 200 });
      }
      if (url.pathname === "/cross-origin-redirect") {
        return new Response(null, {
          status: 302,
          headers: { location: `${externalOrigin}/final` },
        });
      }
      if (url.pathname === "/download-page") {
        return new Response(`<!doctype html>
          <html><head><title>Download Fixture</title></head>
          <body>
            <a id="download" href="/payload.bin" download>Download</a>
            <script>addEventListener("load", () => document.querySelector("#download").click())</script>
          </body></html>`, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (url.pathname === "/payload.bin") {
        return new Response("blocked-download-payload", {
          headers: {
            "content-type": "application/octet-stream",
            "content-disposition": 'attachment; filename="payload.bin"',
          },
        });
      }
      if (url.pathname === "/retry-storm") {
        return new Response(`<!doctype html>
          <html><head><title>Retry Storm Fixture</title></head>
          <body>
            <h1>Retry Storm</h1>
            <script>
              window.pollDone = Promise.all([
                fetch("/api/poll?id=1"),
                fetch("/api/poll?id=2"),
                fetch("/api/poll?id=3"),
                fetch("/api/poll?id=4")
              ]);
            </script>
          </body></html>`, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (url.pathname === "/api/poll") {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        });
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

afterAll(() => {
  server.stop(true);
  externalServer.stop(true);
});
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

async function authorizeProject(project: MimeraProject): Promise<void> {
  await project.advance("PREFLIGHT", "workflow-orchestrator");
  await project.completeStage("PROJECT_PROFILED", [{
    id: "profile-reference-capture",
    payload: { kind: "project-profile" },
    trust: "trusted-system",
    capturedAt: "2026-07-27T10:00:01.000Z",
    contentHash: "9".repeat(64),
  }], { actor: "project-inspector" });
  await project.completeStage("REFERENCE_AUTHORIZED", [{
    id: "auth-reference-capture",
    payload: { kind: "reference-authorization" },
    trust: "trusted-user",
    capturedAt: "2026-07-27T10:00:02.000Z",
    contentHash: "a".repeat(64),
  }], { actor: "reference-authorization-service" });
}


test("captures and commits a complete responsive evidence pack", async () => {
  const project = await createProject();
  await authorizeProject(project);
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
  expect(project.listEvidence()).toHaveLength(10);
  expect(result.capture.captures).toHaveLength(2);
  expect((await stat(result.outputDirectory)).isDirectory()).toBe(true);
  project.close();
}, 30_000);

test("rejects a cross-origin redirect without committing partial capture evidence", async () => {
  const project = await createProject();
  await authorizeProject(project);
  const evidenceBeforeCapture = project.listEvidence().length;
  const service = new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 0,
  });

  let caught: unknown;
  try {
    await service.capture(project, {
      url: `${origin}/cross-origin-redirect`,
      viewports: [{ id: "desktop", width: 1280, height: 800, isMobile: false }],
    });
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(NavigationDeniedError);
  expect(caught).toMatchObject({
    reasonCode: "ORIGIN_NOT_ALLOWED",
    url: `${externalOrigin}/final`,
  });
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(evidenceBeforeCapture);
  project.close();
}, 30_000);


test("rejects a download attempt without committing partial capture evidence", async () => {
  const project = await createProject();
  await authorizeProject(project);
  const evidenceBeforeCapture = project.listEvidence().length;
  const service = new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 0,
  });

  let caught: unknown;
  try {
    await service.capture(project, {
      url: `${origin}/download-page`,
      viewports: [{ id: "desktop", width: 1280, height: 800, isMobile: false }],
    });
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(BrowserDownloadDeniedError);
  expect(caught).toMatchObject({
    reasonCode: "DOWNLOAD_BLOCKED",
    url: `${origin}/payload.bin`,
  });
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(evidenceBeforeCapture);
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

test("paces rapid same-origin subrequests during reference capture", async () => {
  const project = await createProject();
  await authorizeProject(project);
  const service = new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 50,
  });

  const result = await service.capture(project, {
    url: `${origin}/retry-storm`,
    viewports: [{ id: "desktop", width: 1280, height: 800, isMobile: false }],
  });

  expect(result.session.status).toBe("REFERENCE_CAPTURED");
  const capture = result.capture.captures[0]!;
  const pollResponses = capture.network.filter(
    (event) => event.kind === "response" && event.url.includes("/api/poll"),
  );
  expect(pollResponses).toHaveLength(4);

  const timestamps = pollResponses.map((event) => new Date(event.timestamp).getTime());
  for (let i = 1; i < timestamps.length; i++) {
    expect(timestamps[i]! - timestamps[i - 1]!).toBeGreaterThanOrEqual(30);
  }

  project.close();
}, 30_000);
