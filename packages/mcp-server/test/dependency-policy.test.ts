import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "../../..");

test("pins the MCP SDK and resolves the fixed Hono Node server line", async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(projectRoot, "package.json"), "utf8"),
  ) as {
    overrides?: Record<string, string>;
  };
  const mcpPackage = JSON.parse(
    await readFile(resolve(projectRoot, "packages/mcp-server/package.json"), "utf8"),
  ) as {
    dependencies: Record<string, string>;
  };
  const lockfile = await readFile(resolve(projectRoot, "bun.lock"), "utf8");

  expect(mcpPackage.dependencies["@modelcontextprotocol/sdk"]).toBe("1.30.0");
  expect(packageJson.overrides?.["@hono/node-server"]).toBe("2.0.12");
  expect(lockfile).toContain('"@hono/node-server@2.0.12"');
  expect(lockfile).not.toContain('"@hono/node-server@1.19.17"');
});
