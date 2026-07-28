import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createTestPlan } from "./test-plan.ts";

const projectRoot = resolve(import.meta.dir, "..");

const expectedBrowserTests = [
  "apps/cli/test/capture-cli.test.ts",
  "packages/browser-lab/test/browser-lab.test.ts",
  "packages/component-spec/test/component-spec.test.ts",
  "packages/design-analysis/test/design-analysis.test.ts",
  "packages/reference-capture/test/reference-capture.test.ts",
];

test("partitions every test while isolating browser integration files", async () => {
  const plan = await createTestPlan(projectRoot);
  const allTests = [...plan.unitTests, ...plan.browserTests];

  expect(plan.browserTests).toEqual(expectedBrowserTests);
  expect(plan.unitTests).toContain("scripts/ci-workflow.test.ts");
  expect(plan.unitTests).toContain("scripts/test-plan.test.ts");
  expect(new Set(allTests).size).toBe(allTests.length);
  expect(allTests.every((path) => path.endsWith(".test.ts") || path.endsWith(".test.tsx"))).toBe(true);
});

test("routes the repository gate through the isolated test runner", async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(projectRoot, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  expect(packageJson.scripts.test).toBe("bun run scripts/test.ts");
  expect(packageJson.scripts["test:unit"]).toBe("bun run scripts/test.ts --unit");
  expect(packageJson.scripts["test:browser"]).toBe("bun run scripts/test.ts --browser");
  expect(packageJson.scripts.check).toBe(
    "bun run typecheck && bun run lint && bun run test",
  );
});
