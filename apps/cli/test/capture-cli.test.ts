import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { runCli, type CliIo } from "../src/index.ts";

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

function captureIo(): CliIo & { stdoutLines: string[]; stderrLines: string[] } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdoutLines,
    stderrLines,
    stdout: (text) => stdoutLines.push(text),
    stderr: (text) => stderrLines.push(text),
  };
}

test("runs init prepare capture and analysis from the CLI", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimera-cli-capture-"));
  directories.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "cli-capture-fixture",
    scripts: { test: "bun test" },
    dependencies: { react: "19.0.0" },
    devDependencies: { vite: "7.0.0" },
  }));
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1\n");

  const initIo = captureIo();
  expect(await runCli([
    "init",
    root,
    "--reference",
    origin,
    "--host",
    "codex",
    "--json",
  ], initIo)).toBe(0);

  const prepareIo = captureIo();
  expect(await runCli(["prepare", root, "--json"], prepareIo)).toBe(0);
  const prepared = JSON.parse(prepareIo.stdoutLines.join("")) as {
    status: string;
    profile: { packageName?: string };
  };
  expect(prepared.status).toBe("REFERENCE_AUTHORIZED");
  expect(prepared.profile.packageName).toBe("cli-capture-fixture");

  const captureOutput = captureIo();
  expect(await runCli([
    "capture",
    root,
    "--url",
    origin,
    "--allow-localhost",
    "--json",
  ], captureOutput)).toBe(0);
  const captured = JSON.parse(captureOutput.stdoutLines.join("")) as {
    status: string;
    evidenceCount: number;
    viewports: string[];
    outputDirectory: string;
  };

  expect(captured.status).toBe("REFERENCE_CAPTURED");
  expect(captured.evidenceCount).toBe(10);
  expect(captured.viewports).toEqual(["desktop", "mobile"]);
  expect(captured.outputDirectory.startsWith(join(root, ".mimera", "evidence"))).toBe(true);

  const analysisOutput = captureIo();
  expect(await runCli(["analyze", root, "--json"], analysisOutput)).toBe(0);
  const analyzed = JSON.parse(analysisOutput.stdoutLines.join("")) as {
    status: string;
    evidenceCount: number;
    signature: { rhythmUnitPx: number | null; cornerLanguage: string; density: string };
    components: string[];
    responsiveRuleTypes: string[];
  };

  expect(analyzed.status).toBe("PAGE_DECOMPOSED");
  expect(analyzed.evidenceCount).toBe(12);
  expect(analyzed.signature.rhythmUnitPx).toBeGreaterThan(0);
  expect(analyzed.components).toEqual(["navbar", "main"]);
  expect(analyzed.responsiveRuleTypes).toContain("navigation-collapses-to-menu");
}, 30_000);
