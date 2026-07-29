import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { MimeraProject } from "@mimera/core";
import { createMimeraMcpServer } from "@mimera/mcp-server";
import { PreflightService } from "@mimera/preflight";

const directories: string[] = [];
const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createAuthorizedProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mimera-mcp-visual-"));
  directories.push(root);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "mcp-visual-fixture", scripts: { test: "bun test" } }),
  );
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1\n");
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["http://127.0.0.1:3000"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: "2026-07-29T12:00:00.000Z",
  });
  await new PreflightService({ now: () => "2026-07-29T12:00:01.000Z" }).prepare(project);
  project.close();
  return root;
}

async function createClient(targetRoot: string): Promise<Client> {
  const mcpServer = createMimeraMcpServer({
    name: "mimera-visual-test",
    version: "0.1.0",
    targetRoot,
  });
  const client = new Client({ name: "mimera-visual-client", version: "0.1.0" });
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

test("lists visual tools in MCP server catalog alongside browser tools", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const listed = await client.listTools();
  const toolNames = listed.tools.map((tool) => tool.name);

  expect(toolNames).toContain("browser.open_reference");
  expect(toolNames).toContain("visual.compare");
  expect(toolNames).toContain("visual.compare_element");
  expect(toolNames).toContain("visual.measure_geometry");
  expect(toolNames).toContain("visual.create_overlay");
  expect(toolNames).toContain("visual.score");
  expect(toolNames).toContain("visual.mask_dynamic_region");
  expect(listed.tools).toHaveLength(12);
});

test("executes visual.compare and visual.compare_element via MCP JSON-RPC", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  const compareRes = await client.callTool({
    name: "visual.compare",
    arguments: { width: 1000, height: 800, mismatchCount: 100 },
  });
  expect(compareRes.isError).toBe(undefined);
  expect(compareRes.structuredContent).toMatchObject({
    ok: true,
    tool: "visual.compare",
    totalPixels: 800000,
    mismatchedPixels: 100,
  });

  const compareElemRes = await client.callTool({
    name: "visual.compare_element",
    arguments: {
      selector: "nav.main",
      referenceBounds: { x: 0, y: 0, width: 800, height: 60 },
      targetBounds: { x: 0, y: 0, width: 800, height: 60 },
    },
  });
  expect(compareElemRes.isError).toBe(undefined);
  expect(compareElemRes.structuredContent).toMatchObject({
    ok: true,
    tool: "visual.compare_element",
    isAligned: true,
    geometryScore: 100,
  });
});

test("executes visual.measure_geometry visual.create_overlay visual.score visual.mask_dynamic_region", async () => {
  const root = await createAuthorizedProject();
  const client = await createClient(root);

  // 1. measure_geometry
  const measureRes = await client.callTool({
    name: "visual.measure_geometry",
    arguments: {
      selector: "button.cta",
      bounds: { x: 20, y: 20, width: 120, height: 40 },
    },
  });
  expect(measureRes.isError).toBe(undefined);
  expect(measureRes.structuredContent).toMatchObject({
    ok: true,
    tool: "visual.measure_geometry",
    area: 4800,
    aspectRatio: 3,
  });

  // 2. create_overlay
  const overlayRes = await client.callTool({
    name: "visual.create_overlay",
    arguments: { width: 800, height: 600, diffPixelCount: 50 },
  });
  expect(overlayRes.isError).toBe(undefined);
  expect(overlayRes.structuredContent).toMatchObject({
    ok: true,
    tool: "visual.create_overlay",
    diffPixelCount: 50,
  });

  // 3. score
  const scoreRes = await client.callTool({
    name: "visual.score",
    arguments: { matchPercentage: 95, criticalElementsPresent: true },
  });
  expect(scoreRes.isError).toBe(undefined);
  expect(scoreRes.structuredContent).toMatchObject({
    ok: true,
    tool: "visual.score",
    status: "pass",
  });

  // 4. mask_dynamic_region
  const maskRes = await client.callTool({
    name: "visual.mask_dynamic_region",
    arguments: {
      id: "time-badge",
      bounds: { x: 10, y: 10, width: 50, height: 20 },
      reason: "timestamp",
    },
  });
  expect(maskRes.isError).toBe(undefined);
  expect(maskRes.structuredContent).toMatchObject({
    ok: true,
    tool: "visual.mask_dynamic_region",
    maskedRegionCount: 1,
    maskedAreaPixels: 1000,
  });
});
