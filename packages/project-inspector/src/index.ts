import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { z } from "zod";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".mimera",
  ".worktrees",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

const INSTRUCTION_FILES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CODEX.md",
  ".cursorrules",
]);

const ENTRYPOINT_NAMES = new Set([
  "main.ts",
  "main.tsx",
  "main.js",
  "main.jsx",
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "app.ts",
  "app.tsx",
  "app.js",
  "app.jsx",
  "main.py",
  "app.py",
  "manage.py",
]);

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".css": "css",
  ".go": "go",
  ".html": "html",
  ".java": "java",
  ".js": "js",
  ".jsx": "jsx",
  ".json": "json",
  ".md": "md",
  ".php": "php",
  ".py": "py",
  ".rb": "rb",
  ".rs": "rs",
  ".scss": "scss",
  ".swift": "swift",
  ".toml": "toml",
  ".ts": "ts",
  ".tsx": "tsx",
  ".vue": "vue",
  ".yaml": "yaml",
  ".yml": "yaml",
};

const FRAMEWORK_DEPENDENCIES: Readonly<Record<string, string>> = {
  "@angular/core": "angular",
  "@playwright/test": "playwright",
  "@remix-run/react": "remix",
  "@sveltejs/kit": "sveltekit",
  astro: "astro",
  next: "next",
  nuxt: "nuxt",
  playwright: "playwright",
  react: "react",
  "solid-js": "solid",
  svelte: "svelte",
  tailwindcss: "tailwindcss",
  vite: "vite",
  vue: "vue",
};

export const ProjectProfileSchema = z.object({
  schemaVersion: z.literal("1"),
  targetRoot: z.string().min(1),
  detectedAt: z.string().datetime({ offset: true }),
  packageName: z.string().min(1).optional(),
  packageManager: z.enum(["bun", "pnpm", "npm", "yarn", "unknown"]),
  runtimes: z.array(z.string()).readonly(),
  frameworks: z.array(z.string()).readonly(),
  scripts: z.record(z.string(), z.string()),
  workspace: z.boolean(),
  hasGit: z.boolean(),
  scannedFileCount: z.number().int().nonnegative(),
  languageCounts: z.record(z.string(), z.number().int().positive()),
  instructionsFiles: z.array(z.string()).readonly(),
  entrypoints: z.array(z.string()).readonly(),
});
export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;

export interface InspectProjectOptions {
  now?: string;
  maxFiles?: number;
}

interface PackageJsonShape {
  name?: unknown;
  scripts?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
  workspaces?: unknown;
}

function portablePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split(sep).join("/");
}

async function collectFiles(root: string, maxFiles: number): Promise<string[]> {
  const files: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const directory = queue.shift();
    if (!directory) break;
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (files.length >= maxFiles) return files;
      if (entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) queue.push(path);
        continue;
      }
      if (entry.isFile()) files.push(path);
    }
  }
  return files.sort((left, right) => portablePath(root, left).localeCompare(portablePath(root, right)));
}

async function readPackageJson(root: string): Promise<PackageJsonShape | null> {
  const path = join(root, "package.json");
  try {
    const metadata = await stat(path);
    if (metadata.size > 1_000_000) throw new Error("package.json exceeds 1 MB");
    return JSON.parse(await readFile(path, "utf8")) as PackageJsonShape;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function detectPackageManager(relativeFiles: Set<string>): ProjectProfile["packageManager"] {
  if (relativeFiles.has("bun.lock") || relativeFiles.has("bun.lockb")) return "bun";
  if (relativeFiles.has("pnpm-lock.yaml")) return "pnpm";
  if (relativeFiles.has("yarn.lock")) return "yarn";
  if (relativeFiles.has("package-lock.json")) return "npm";
  return "unknown";
}

export async function inspectProject(
  targetRoot: string,
  options: InspectProjectOptions = {},
): Promise<ProjectProfile> {
  const root = resolve(targetRoot);
  const files = await collectFiles(root, options.maxFiles ?? 10_000);
  const relativeFiles = files.map((path) => portablePath(root, path));
  const relativeSet = new Set(relativeFiles);
  const packageJson = await readPackageJson(root);
  const dependencies = {
    ...stringRecord(packageJson?.dependencies),
    ...stringRecord(packageJson?.devDependencies),
    ...stringRecord(packageJson?.peerDependencies),
  };

  const frameworks = [...new Set(
    Object.keys(dependencies)
      .map((dependency) => FRAMEWORK_DEPENDENCIES[dependency])
      .filter((framework): framework is string => Boolean(framework)),
  )].sort();
  const languageCounts: Record<string, number> = {};
  for (const path of relativeFiles) {
    const language = LANGUAGE_BY_EXTENSION[extname(path).toLowerCase()];
    if (language) languageCounts[language] = (languageCounts[language] ?? 0) + 1;
  }

  const runtimes = new Set<string>();
  const packageManager = detectPackageManager(relativeSet);
  if (packageJson || packageManager !== "unknown") runtimes.add(packageManager === "bun" ? "bun" : "node");
  if (
    relativeSet.has("pyproject.toml") ||
    relativeSet.has("requirements.txt") ||
    relativeFiles.some((path) => path.endsWith(".py"))
  ) {
    runtimes.add("python");
  }

  const instructionsFiles = relativeFiles.filter((path) => {
    const name = path.split("/").at(-1) ?? path;
    return INSTRUCTION_FILES.has(name) || path.startsWith(".cursor/rules/");
  });
  const entrypoints = relativeFiles.filter((path) => {
    const name = path.split("/").at(-1) ?? path;
    return ENTRYPOINT_NAMES.has(name);
  });

  return ProjectProfileSchema.parse({
    schemaVersion: "1",
    targetRoot: root,
    detectedAt: options.now ?? new Date().toISOString(),
    ...(typeof packageJson?.name === "string" && packageJson.name.trim()
      ? { packageName: packageJson.name.trim() }
      : {}),
    packageManager,
    runtimes: [...runtimes].sort(),
    frameworks,
    scripts: stringRecord(packageJson?.scripts),
    workspace: Boolean(packageJson?.workspaces),
    hasGit: relativeSet.has(".git") || await stat(join(root, ".git")).then(() => true).catch(() => false),
    scannedFileCount: relativeFiles.length,
    languageCounts,
    instructionsFiles,
    entrypoints,
  });
}
