import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectProject } from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("detects a Bun React Vite project without traversing ignored or symlinked trees", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimera-inspector-"));
  const outside = await mkdtemp(join(tmpdir(), "mimera-inspector-outside-"));
  directories.push(root, outside);
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "node_modules", "hidden"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "fixture-app",
      scripts: { dev: "vite", test: "bun test", build: "vite build" },
      dependencies: { react: "19.0.0", "react-dom": "19.0.0" },
      devDependencies: { vite: "7.0.0", tailwindcss: "4.0.0", playwright: "1.61.0" },
    }),
  );
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1");
  await writeFile(join(root, "src", "main.tsx"), "export const app = true;\n");
  await writeFile(join(root, "AGENTS.md"), "# Instructions\n");
  await writeFile(join(root, "node_modules", "hidden", "ignored.js"), "ignored\n");
  await writeFile(join(outside, "secret.py"), "print('secret')\n");
  await symlink(outside, join(root, "external"));

  const profile = await inspectProject(root, { now: "2026-07-27T10:00:00.000Z" });

  expect(profile.packageName).toBe("fixture-app");
  expect(profile.packageManager).toBe("bun");
  expect(profile.runtimes).toContain("bun");
  expect(profile.frameworks).toEqual(["playwright", "react", "tailwindcss", "vite"]);
  expect(profile.scripts).toEqual({ build: "vite build", dev: "vite", test: "bun test" });
  expect(profile.entrypoints).toContain("src/main.tsx");
  expect(profile.instructionsFiles).toEqual(["AGENTS.md"]);
  expect(profile.languageCounts.tsx).toBe(1);
  expect(profile.languageCounts.py).toBeUndefined();
  expect(profile.scannedFileCount).toBe(4);
});

test("detects Python support from pyproject and source files", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimera-inspector-python-"));
  directories.push(root);
  await mkdir(join(root, "app"), { recursive: true });
  await writeFile(join(root, "pyproject.toml"), "[project]\nname='fixture'\n");
  await writeFile(join(root, "app", "main.py"), "print('hello')\n");

  const profile = await inspectProject(root);

  expect(profile.runtimes).toContain("python");
  expect(profile.languageCounts.py).toBe(1);
  expect(profile.entrypoints).toContain("app/main.py");
});
