import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workflowPath = resolve(import.meta.dir, "../.github/workflows/ci.yml");

test("CI runs Mimera's locked Bun and Playwright verification", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  expect(workflow).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
  expect(workflow).toMatch(/pull_request:\s*\n\s*branches:\s*\[main\]/);
  expect(workflow).toContain("permissions:\n  contents: read");
  expect(workflow).toContain("cancel-in-progress: true");
  expect(workflow).toContain("runs-on: ubuntu-24.04");
  expect(workflow).toContain(
    "uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd # v5.0.1",
  );
  expect(workflow).toContain(
    "uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0",
  );
  expect(workflow).not.toContain("ubuntu-latest");
  expect(workflow).not.toMatch(/uses: [^\s]+@v\d/);
  expect(workflow).toContain("run: bun install --frozen-lockfile --ignore-scripts");
  expect(workflow).toContain("working-directory: packages/browser-lab");
  expect(workflow).toContain(
    "run: bunx --no-install playwright install --with-deps chromium",
  );
  expect(workflow).toContain("run: bun run check");
});
