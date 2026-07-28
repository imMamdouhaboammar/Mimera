import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { MimeraProject } from "@mimera/core";
import {
  createMimeraMcpServer,
  type CreateMimeraMcpServerOptions,
} from "@mimera/mcp-server";
import { PreflightService } from "@mimera/preflight";
import {
  ReferenceCaptureService,
  type ReferenceCaptureInput,
  type ReferenceCaptureOutput,
} from "@mimera/reference-capture";

let server: ReturnType<typeof Bun.serve>;
let externalServer: ReturnType<typeof Bun.serve>;
let origin: string;
let externalOrigin: string;
const directories: string[] = [];
const closers: Array<() => Promise<void>> = [];

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
      if (url.pathname === "/") {
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
  await Promise.all(closers.splice(0).map((close) => close()));
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createAuthorizedProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mimera-mcp-browser-"));
  directories.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "mcp-browser-fixture",
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
    now: "2026-07-28T12:00:00.000Z",
  });
  await new PreflightService({ now: () => "2026-07-28T12:00:01.000Z" }).prepare(project);
  project.close();
  return root;
}

async function createClient(
  targetRoot: string,
  overrides: Partial<Pick<CreateMimeraMcpServerOptions, "captureService" | "openProject">> = {},
): Promise<Client> {
  const mcpServer = createMimeraMcpServer({
    name: "mimera-test",
    version: "0.1.0",
    targetRoot,
    captureService: new ReferenceCaptureService({
      allowHttp: true,
      allowLoopback: true,
      minimumIntervalMs: 0,
    }),
    ...overrides,
  });
  const client = new Client({ name: "mimera-test-client", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    mcpServer.server.connect(serverTransport),
  ]);
  closers.push(async () => {
    await client.close();
    await mcpServer.close();
  });
  return client;
}

const desktop = {
  id: "desktop",
  width: 1280,
  height: 800,
  isMobile: false,
};

class CoordinatedReferenceCaptureService extends ReferenceCaptureService {
  readonly #barrier: Promise<void>;
  #releaseBarrier: (() => void) | undefined;
  #entered = 0;

  constructor() {
    super({
      allowHttp: true,
      allowLoopback: true,
      minimumIntervalMs: 0,
    });
    this.#barrier = new Promise<void>((resolveBarrier) => {
      this.#releaseBarrier = resolveBarrier;
    });
  }

  override async capture(
    project: MimeraProject,
    input: ReferenceCaptureInput,
  ): Promise<ReferenceCaptureOutput> {
    this.#entered += 1;
    if (this.#entered === 1) {
      setTimeout(() => this.#releaseBarrier?.(), 30);
    } else {
      this.#releaseBarrier?.();
    }
    await this.#barrier;
    return super.capture(project, input);
  }
}

test("lists a project-bound browser.open_reference MCP tool without path or policy overrides", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const listed = await client.listTools();

  expect(listed.tools).toHaveLength(1);
  expect(listed.tools[0]?.name).toBe("browser.open_reference");
  expect(listed.tools[0]?.inputSchema).toMatchObject({
    type: "object",
    required: ["url", "viewports"],
  });
  expect(listed.tools[0]?.inputSchema.properties).not.toHaveProperty("targetRoot");
  expect(listed.tools[0]?.inputSchema.properties).not.toHaveProperty("allowHttp");
  expect(listed.tools[0]?.inputSchema.properties).not.toHaveProperty("allowLoopback");
  expect(listed.tools[0]?.inputSchema.properties).toHaveProperty("viewports");
  expect(listed.tools[0]?.outputSchema).toBeDefined();
  const outputSchema = JSON.stringify(listed.tools[0]?.outputSchema);
  expect(outputSchema).toContain("REFERENCE_CAPTURED");
  expect(outputSchema).toContain("BROWSER_TOOL_FAILED");
});

test("captures an authorized reference through the MCP protocol and returns compact artifact paths", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: { url: origin, viewports: [desktop] },
  });

  expect(result.isError).not.toBe(true);
  expect(result.content).toEqual([{
    type: "text",
    text: "Reference captured: 1 viewport, 4 evidence items",
  }]);
  const output = result.structuredContent as {
    schemaVersion: string;
    tool: string;
    status: string;
    outputDirectory: string;
    evidenceIds: string[];
    captures: Array<{
      finalUrl: string;
      artifacts: Record<"screenshot" | "dom" | "network" | "trace", { path: string }>;
    }>;
  };
  expect(output.schemaVersion).toBe("1");
  expect(output.tool).toBe("browser.open_reference");
  expect(output.status).toBe("REFERENCE_CAPTURED");
  expect(output.evidenceIds).toHaveLength(4);
  expect(output.captures).toHaveLength(1);
  expect(output.captures[0]?.finalUrl).toBe(`${origin}/`);
  expect((await stat(output.captures[0]!.artifacts.screenshot.path)).size).toBeGreaterThan(100);
  const serialized = JSON.stringify(output);
  expect(serialized).not.toContain('"nodes"');
  expect(serialized).not.toContain('"events"');
  expect(serialized.length).toBeLessThan(6_000);
  expect(JSON.stringify(result.content)).not.toContain(output.outputDirectory);

  const project = await MimeraProject.open(root);
  expect(project.currentSession().status).toBe("REFERENCE_CAPTURED");
  expect(project.listEvidence()).toHaveLength(6);
  project.close();
});

test("rejects unbounded viewport input before opening the project", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: {
      url: origin,
      viewports: Array.from({ length: 5 }, (_, index) => ({
        id: `viewport-${index}`,
        width: 1280,
        height: 800,
        isMobile: false,
      })),
    },
  });

  expect(result.isError).toBe(true);
  expect(result.content).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "text", text: expect.stringContaining("Input validation error") }),
  ]));
  const project = await MimeraProject.open(root);
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(2);
  project.close();
});

test("returns a typed MCP error for a denied origin without committing evidence", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: { url: externalOrigin, viewports: [desktop] },
  });

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    schemaVersion: "1",
    tool: "browser.open_reference",
    error: {
      name: "NavigationDeniedError",
      reasonCode: "ORIGIN_NOT_ALLOWED",
      url: externalOrigin,
    },
  });
  const project = await MimeraProject.open(root);
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(2);
  project.close();
});

test("returns a typed MCP error for a download without committing evidence", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: { url: `${origin}/download-page`, viewports: [desktop] },
  });

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    schemaVersion: "1",
    tool: "browser.open_reference",
    error: {
      name: "BrowserDownloadDeniedError",
      reasonCode: "DOWNLOAD_BLOCKED",
      url: `${origin}/payload.bin`,
    },
  });
  const project = await MimeraProject.open(root);
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(2);
  project.close();
});

test("rejects a relative project root at server creation", () => {
  expect(() => createMimeraMcpServer({
    name: "mimera-test",
    version: "0.1.0",
    targetRoot: "relative/project",
  })).toThrow("targetRoot must be an absolute path");
});

test("redacts unknown server failures from MCP results", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root, {
    openProject: async () => {
      throw new Error("sensitive internal path /srv/private/project");
    },
  });

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: { url: origin, viewports: [desktop] },
  });

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    schemaVersion: "1",
    tool: "browser.open_reference",
    error: {
      name: "BrowserToolError",
      reasonCode: "BROWSER_TOOL_FAILED",
      message: "Browser tool failed",
    },
  });
  expect(JSON.stringify(result)).not.toContain("/srv/private/project");
});

test("redacts the project path when the registered root is not initialized", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimera-mcp-uninitialized-"));
  directories.push(root);
  const client = await createClient(root);

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: { url: origin, viewports: [desktop] },
  });

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    schemaVersion: "1",
    tool: "browser.open_reference",
    error: {
      name: "ProjectNotInitializedError",
      reasonCode: "PROJECT_NOT_INITIALIZED",
      message: "Mimera project is not initialized",
    },
  });
  expect(JSON.stringify(result)).not.toContain(root);
});

test("returns a typed MCP error when robots policy denies the reference path", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root, {
    captureService: new ReferenceCaptureService({
      allowHttp: true,
      allowLoopback: true,
      minimumIntervalMs: 0,
      robotsFetch: async () => new Response(
        "User-agent: MimeraBot\nDisallow: /blocked",
        { status: 200 },
      ),
    }),
  });

  const result = await client.callTool({
    name: "browser.open_reference",
    arguments: { url: `${origin}/blocked`, viewports: [desktop] },
  });

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    schemaVersion: "1",
    tool: "browser.open_reference",
    error: {
      name: "RobotsDeniedError",
      reasonCode: "ROBOTS_DISALLOWED",
      message: "Reference path is disallowed by robots.txt",
      url: `${origin}/blocked`,
    },
  });
  const project = await MimeraProject.open(root);
  expect(project.currentSession().status).toBe("REFERENCE_AUTHORIZED");
  expect(project.listEvidence()).toHaveLength(2);
  project.close();
});

test("serializes concurrent captures for one project without orphaning artifacts", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root, {
    captureService: new CoordinatedReferenceCaptureService(),
  });

  const [first, second] = await Promise.all([
    client.callTool({
      name: "browser.open_reference",
      arguments: { url: origin, viewports: [desktop] },
    }),
    client.callTool({
      name: "browser.open_reference",
      arguments: { url: origin, viewports: [desktop] },
    }),
  ]);

  const results = [first, second];
  expect(results.filter((result) => result.isError !== true)).toHaveLength(1);
  const failure = results.find((result) => result.isError === true);
  expect(failure?.structuredContent).toMatchObject({
    error: {
      name: "ReferenceCaptureStateError",
      reasonCode: "REFERENCE_CAPTURE_STATE_INVALID",
      status: "REFERENCE_CAPTURED",
    },
  });

  const project = await MimeraProject.open(root);
  const sessionId = project.currentSession().id;
  project.close();
  const captureDirectories = await readdir(
    join(root, ".mimera", "evidence", sessionId),
    { withFileTypes: true },
  );
  expect(captureDirectories.filter((entry) => entry.isDirectory())).toHaveLength(1);
});
