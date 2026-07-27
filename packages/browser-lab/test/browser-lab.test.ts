import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { TrustedScope } from "@mimera/contracts";
import {
  OriginRateLimiter,
  ReferencePolicy,
  RobotsPolicyClient,
} from "@mimera/reference-policy";
import { BrowserLab } from "../src/index.ts";

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
      if (url.pathname === "/" || url.pathname === "/index.html") {
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

describe("BrowserLab", () => {
  test("captures deterministic desktop and mobile evidence", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mimera-browser-"));
    directories.push(outputDirectory);
    const policy = new ReferencePolicy({
      allowedOrigins: [origin],
      allowHttp: true,
      allowLoopback: true,
    });
    const lab = new BrowserLab({
      policy,
      robots: new RobotsPolicyClient(),
      rateLimiter: new OriginRateLimiter({ minimumIntervalMs: 0 }),
    });

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
      expect(mobile?.dom.nodes.find((node) => node.ariaLabel === "Open menu")?.visible).toBe(true);
      expect(mobile?.dom.nodes.find((node) => node.id === "main-nav")?.visible).toBe(false);
      expect(desktop?.network.some((event) => event.resourceType === "document")).toBe(true);
      expect(result.evidence.every((item) => item.trust === "untrusted-reference")).toBe(true);
      expect((await stat(desktop!.artifacts.screenshot.path)).size).toBeGreaterThan(100);
      expect((await stat(mobile!.artifacts.trace.path)).size).toBeGreaterThan(100);
    } finally {
      await lab.close();
    }
  }, 30_000);
});
