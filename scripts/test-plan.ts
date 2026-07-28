import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const TEST_ROOTS = ["apps", "packages", "python", "scripts"] as const;

export const BROWSER_INTEGRATION_TESTS = [
  "apps/cli/test/capture-cli.test.ts",
  "packages/browser-lab/test/browser-lab.test.ts",
  "packages/component-spec/test/component-spec.test.ts",
  "packages/design-analysis/test/design-analysis.test.ts",
  "packages/reference-capture/test/reference-capture.test.ts",
  "packages/mcp-server/test/browser-tools.test.ts",
] as const;

export interface TestPlan {
  unitTests: string[];
  browserTests: string[];
}

function portablePath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function isTestFile(name: string): boolean {
  return name.endsWith(".test.ts") || name.endsWith(".test.tsx");
}
async function collectTests(
  projectRoot: string,
  directory: string,
  tests: string[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      await collectTests(projectRoot, path, tests);
      continue;
    }
    if (entry.isFile() && isTestFile(entry.name)) {
      tests.push(portablePath(projectRoot, path));
    }
  }
}

export async function createTestPlan(projectRoot: string): Promise<TestPlan> {
  const allTests: string[] = [];
  for (const root of TEST_ROOTS) {
    await collectTests(projectRoot, join(projectRoot, root), allTests);
  }
  allTests.sort();

  const browserSet = new Set<string>(BROWSER_INTEGRATION_TESTS);
  const missingBrowserTests = BROWSER_INTEGRATION_TESTS.filter(
    (path) => !allTests.includes(path),
  );
  if (missingBrowserTests.length > 0) {
    throw new Error(`Missing browser integration tests: ${missingBrowserTests.join(", ")}`);
  }

  return {
    unitTests: allTests.filter((path) => !browserSet.has(path)),
    browserTests: [...BROWSER_INTEGRATION_TESTS],
  };
}
