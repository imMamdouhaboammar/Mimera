import { resolve } from "node:path";
import { createTestPlan } from "./test-plan.ts";

type TestMode = "all" | "unit" | "browser";

function parseMode(args: string[]): TestMode {
  if (args.length === 0) return "all";
  if (args.length === 1 && args[0] === "--unit") return "unit";
  if (args.length === 1 && args[0] === "--browser") return "browser";
  throw new Error(`Unsupported test arguments: ${args.join(" ")}`);
}

async function runTests(
  projectRoot: string,
  label: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  console.log(`\n[test:${label}] ${paths.length} file${paths.length === 1 ? "" : "s"}`);
  const child = Bun.spawn(
    [globalThis.process.execPath, "test", "--no-orphans", ...paths],
    {
      cwd: projectRoot,
      env: globalThis.process.env,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`Test group ${label} failed with exit code ${exitCode}`);
  }
}

export async function runTestPlan(args: string[]): Promise<void> {
  const projectRoot = resolve(import.meta.dir, "..");
  const mode = parseMode(args);
  const plan = await createTestPlan(projectRoot);

  if (mode !== "browser") {
    await runTests(projectRoot, "unit", plan.unitTests);
  }
  if (mode !== "unit") {
    for (const path of plan.browserTests) {
      await runTests(projectRoot, `browser:${path}`, [path]);
    }
  }
}

if (import.meta.main) {
  await runTestPlan(process.argv.slice(2));
}
