import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { TrustedScope } from "@mimera/contracts";
import {
  OriginRateLimiter,
  ReferencePolicy,
  RobotsPolicyClient,
} from "@mimera/reference-policy";
import { BrowserDownloadDeniedError, BrowserLab } from "../src/index.ts";

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
      if (url.pathname === "/redirect") {
        return new Response(null, { status: 302, headers: { location: "/final" } });
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
      if (["/", "/index.html", "/final"].includes(url.pathname)) {
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

const trustedScope = (targetRoot: string): TrustedScope => ({
  targetRoot,
  targetFiles: [],
  allowedOrigins: [origin],
  allowedCommands: [],
  grantedPackPermissions: ["browser:observe", "network:declared-origins", "evidence:write"],
  policyVersion: "1",
});

function createLab(): BrowserLab {
  return new BrowserLab({
    policy: new ReferencePolicy({
      allowedOrigins: [origin],
      allowHttp: true,
      allowLoopback: true,
    }),
    robots: new RobotsPolicyClient(),
    rateLimiter: new OriginRateLimiter({ minimumIntervalMs: 0 }),
  });
}

describe("BrowserLab", () => {
  test("captures deterministic desktop and mobile evidence", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mimera-browser-"));
    directories.push(outputDirectory);
    const lab = createLab();

    try {
      const result = await lab.capturePage({
        sessionId: "session-1",
        host: "codex",
        trustedScope: trustedScope(outputDirectory),
        url: origin,
        outputDirectory,
        viewports: [
          { id: "desktop", width: 1440, height: 900, isMobile: false },
          { id: "mobile", width: 390, height: 844, isMobile: true },
        ],
      });

      expect(result.captures).toHaveLength(2);
      const desktop = result.captures.find((capture) => capture.viewport.id === "desktop");
      const mobile = result.captures.find((capture) => capture.viewport.id === "mobile");
      expect(desktop?.title).toBe("Mimera Navbar Fixture");
      expect(desktop?.dom.nodes.find((node) => node.id === "main-nav")?.visible).toBe(true);
      const navbarNode = desktop?.dom.nodes.find((node) => node.dataComponent === "navbar");
      expect(navbarNode?.domPath).toContain("header");
      expect(desktop?.dom.nodes.find((node) => node.id === "main-nav")?.nearestComponent).toBe("navbar");
      expect(mobile?.dom.nodes.find((node) => node.ariaLabel === "Open menu")?.visible).toBe(true);
      expect(mobile?.dom.nodes.find((node) => node.id === "main-nav")?.visible).toBe(false);
      expect(desktop?.network.some((event) => event.resourceType === "document")).toBe(true);
      expect(result.evidence.every((item) => item.trust === "untrusted-reference")).toBe(true);
      const desktopDomEvidence = result.evidence.find((item) => {
        const payload = item.payload as { kind?: string; viewport?: { id?: string } };
        return payload.kind === "dom" && payload.viewport?.id === "desktop";
      });
      expect(desktopDomEvidence).toBeDefined();
      expect((await stat(desktop!.artifacts.screenshot.path)).size).toBeGreaterThan(100);
      expect((await stat(mobile!.artifacts.trace.path)).size).toBeGreaterThan(100);
    } finally {
      await lab.close();
    }
  }, 30_000);

  test("follows an authorized same-origin redirect and records the final URL", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mimera-browser-redirect-"));
    directories.push(outputDirectory);
    const lab = createLab();

    try {
      const result = await lab.capturePage({
        sessionId: "session-redirect",
        host: "codex",
        trustedScope: trustedScope(outputDirectory),
        url: `${origin}/redirect`,
        outputDirectory,
        viewports: [{ id: "desktop", width: 1280, height: 800, isMobile: false }],
      });

      const capture = result.captures[0]!;
      expect(result.requestedUrl).toBe(`${origin}/redirect`);
      expect(capture.finalUrl).toBe(`${origin}/final`);
      expect(capture.dom.url).toBe(`${origin}/final`);
      expect(
        capture.network.some(
          (event) => event.kind === "response" && event.url === `${origin}/redirect` && event.status === 302,
        ),
      ).toBe(true);
    } finally {
      await lab.close();
    }
  }, 30_000);

  test("cancels downloads and surfaces a typed denial without writing the payload", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mimera-browser-download-"));
    directories.push(outputDirectory);
    const lab = createLab();

    try {
      let caught: unknown;
      try {
        await lab.capturePage({
          sessionId: "session-download",
          host: "codex",
          trustedScope: trustedScope(outputDirectory),
          url: `${origin}/download-page`,
          outputDirectory,
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
      const files = await readdir(outputDirectory, { recursive: true });
      expect(files.some((file) => file.endsWith("payload.bin"))).toBe(false);
    } finally {
      await lab.close();
    }
  }, 30_000);
});
