import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { AgentRegistry } from "@mimera/agent-runtime";
import {
  HostKindSchema,
  type HostKind,
} from "@mimera/contracts";
import type {
  GeneratedHostFile,
  HostAdapterRegistry,
} from "@mimera/host-adapters";
import { z } from "zod";

export class HostInstallConflictError extends Error {
  readonly conflicts: string[];

  constructor(conflicts: readonly string[]) {
    super(`Mimera installation conflicts with existing files: ${conflicts.join(", ")}`);
    this.name = "HostInstallConflictError";
    this.conflicts = [...conflicts].sort();
  }
}

export class DuplicateGeneratedPathError extends Error {
  readonly path: string;

  constructor(pathValue: string) {
    super(`Multiple host adapters generated the same path: ${pathValue}`);
    this.name = "DuplicateGeneratedPathError";
    this.path = pathValue;
  }
}

export const InstallationManifestSchema = z.object({
  schemaVersion: z.literal("1"),
  host: HostKindSchema,
  version: z.string().min(1),
  registryHash: z.string().regex(/^[a-f0-9]{64}$/),
  installedAt: z.string().datetime({ offset: true }),
  files: z.array(
    z.object({
      path: z.string().min(1),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      mode: z.number().int().positive().optional(),
    }),
  ),
});
export type InstallationManifest = z.infer<typeof InstallationManifestSchema>;

export interface MimeraInstallerOptions {
  agents: AgentRegistry;
  adapters: HostAdapterRegistry;
  version: string;
  now?: () => string;
}

export interface InstallHostsInput {
  targetRoot: string;
  hosts: HostKind[];
  force?: boolean;
}

export interface InstallHostsResult {
  targetRoot: string;
  hosts: HostKind[];
  written: string[];
  unchanged: string[];
  replaced: string[];
  registryHashes: Record<string, string>;
}

export interface UninstallHostsInput {
  targetRoot: string;
  hosts: HostKind[];
  restoreBackups?: boolean;
}

export interface UninstallHostsResult {
  targetRoot: string;
  hosts: HostKind[];
  removed: string[];
  restored: string[];
}

interface PlannedFile extends GeneratedHostFile {
  host: HostKind;
  contentHash: string;
  absolutePath: string;
  relativePath: string;
  status: "new" | "unchanged" | "replace";
  backupPath?: string;
  stagePath: string;
}

function sha256(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function portablePath(value: string): string {
  return value.split(path.sep).join("/");
}

function safeRelativePath(input: string): string {
  const normalized = path.posix.normalize(input.replaceAll("\\", "/"));
  if (
    normalized.startsWith("/") ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Generated installation path escapes target root: ${input}`);
  }
  return normalized;
}

async function exists(pathValue: string): Promise<boolean> {
  return stat(pathValue).then(() => true).catch((error: unknown) => {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return false;
    throw error;
  });
}

async function fileHash(pathValue: string): Promise<string> {
  return sha256(new Uint8Array(await readFile(pathValue)));
}

async function detectPath(targetRoot: string, relativePath: string): Promise<boolean> {
  return exists(path.join(targetRoot, relativePath));
}

export async function detectHosts(targetRoot: string): Promise<HostKind[]> {
  const root = path.resolve(targetRoot);
  const detected: HostKind[] = [];
  if (await detectPath(root, ".claude") || await detectPath(root, "CLAUDE.md")) {
    detected.push("claude-code");
  }
  if (await detectPath(root, ".codex")) detected.push("codex");
  if (await detectPath(root, ".cursor")) detected.push("cursor");
  if (await detectPath(root, ".gemini") || await detectPath(root, "GEMINI.md")) {
    detected.push("gemini-cli");
  }
  return detected.length > 0 ? detected.sort() : ["generic"];
}

function manifestFile(
  host: HostKind,
  version: string,
  registryHash: string,
  installedAt: string,
  files: readonly GeneratedHostFile[],
): GeneratedHostFile {
  const manifest = InstallationManifestSchema.parse({
    schemaVersion: "1",
    host,
    version,
    registryHash,
    installedAt,
    files: files
      .map((item) => ({
        path: safeRelativePath(item.path),
        contentHash: sha256(item.content),
        ...(item.mode !== undefined ? { mode: item.mode } : {}),
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  });
  return {
    path: `.mimera/installations/${host}.json`,
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  };
}

export class MimeraInstaller {
  readonly #agents: AgentRegistry;
  readonly #adapters: HostAdapterRegistry;
  readonly #version: string;
  readonly #now: () => string;

  constructor(options: MimeraInstallerOptions) {
    this.#agents = options.agents;
    this.#adapters = options.adapters;
    this.#version = options.version;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async install(input: InstallHostsInput): Promise<InstallHostsResult> {
    const targetRoot = path.resolve(input.targetRoot);
    await mkdir(targetRoot, { recursive: true });
    const hosts = [...new Set(input.hosts.map((host) => HostKindSchema.parse(host)))].sort();
    if (hosts.length === 0) throw new Error("At least one host adapter is required");

    const registryHashes: Record<string, string> = {};
    const generated = new Map<string, { host: HostKind; file: GeneratedHostFile }>();
    const installedAt = this.#now();
    for (const host of hosts) {
      const rendered = this.#adapters.get(host).render({
        agents: this.#agents,
        version: this.#version,
      });
      registryHashes[host] = rendered.registryHash;
      const files = [
        ...rendered.files,
        manifestFile(host, this.#version, rendered.registryHash, installedAt, rendered.files),
      ];
      for (const item of files) {
        const relativePath = safeRelativePath(item.path);
        if (generated.has(relativePath)) throw new DuplicateGeneratedPathError(relativePath);
        generated.set(relativePath, { host, file: { ...item, path: relativePath } });
      }
    }

    const stagingRoot = path.join(targetRoot, ".mimera", ".install-staging", crypto.randomUUID());
    const plan: PlannedFile[] = [];
    const conflicts: string[] = [];
    for (const [relativePath, entry] of [...generated.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const absolutePath = path.join(targetRoot, ...relativePath.split("/"));
      const desiredHash = sha256(entry.file.content);
      const present = await exists(absolutePath);
      let statusValue: PlannedFile["status"] = "new";
      if (present) {
        const currentHash = await fileHash(absolutePath);
        if (currentHash === desiredHash) statusValue = "unchanged";
        else if (input.force) statusValue = "replace";
        else {
          statusValue = "replace";
          conflicts.push(relativePath);
        }
      }
      const backupPath = statusValue === "replace"
        ? path.join(targetRoot, ".mimera", "backups", entry.host, ...relativePath.split("/"))
        : undefined;
      plan.push({
        ...entry.file,
        host: entry.host,
        contentHash: desiredHash,
        absolutePath,
        relativePath,
        status: statusValue,
        ...(backupPath ? { backupPath } : {}),
        stagePath: path.join(stagingRoot, ...relativePath.split("/")),
      });
    }
    if (conflicts.length > 0 && !input.force) throw new HostInstallConflictError(conflicts);

    const changed = plan.filter((item) => item.status !== "unchanged");
    for (const item of changed) {
      await mkdir(path.dirname(item.stagePath), { recursive: true });
      await writeFile(item.stagePath, item.content, { mode: item.mode ?? 0o600 });
    }

    const committed: PlannedFile[] = [];
    try {
      for (const item of changed) {
        if (item.status === "replace" && item.backupPath) {
          await mkdir(path.dirname(item.backupPath), { recursive: true });
          await copyFile(item.absolutePath, item.backupPath);
        }
        await mkdir(path.dirname(item.absolutePath), { recursive: true });
        await rename(item.stagePath, item.absolutePath);
        if (item.mode !== undefined) await chmod(item.absolutePath, item.mode);
        committed.push(item);
      }
    } catch (error) {
      for (const item of [...committed].reverse()) {
        if (item.status === "new") {
          await rm(item.absolutePath, { force: true }).catch(() => {});
        } else if (item.backupPath && await exists(item.backupPath)) {
          await copyFile(item.backupPath, item.absolutePath).catch(() => {});
        }
      }
      throw error;
    } finally {
      await rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
    }

    return {
      targetRoot,
      hosts,
      written: changed.map((item) => item.relativePath).sort(),
      unchanged: plan.filter((item) => item.status === "unchanged").map((item) => item.relativePath).sort(),
      replaced: changed.filter((item) => item.status === "replace").map((item) => item.relativePath).sort(),
      registryHashes,
    };
  }

  async uninstall(input: UninstallHostsInput): Promise<UninstallHostsResult> {
    const targetRoot = path.resolve(input.targetRoot);
    const hosts = [...new Set(input.hosts.map((host) => HostKindSchema.parse(host)))].sort();
    if (hosts.length === 0) throw new Error("At least one host adapter is required for uninstall");

    const removed: string[] = [];
    const restored: string[] = [];

    for (const host of hosts) {
      const manifestPath = path.join(targetRoot, ".mimera", "installations", `${host}.json`);
      if (!(await exists(manifestPath))) continue;

      let manifest: InstallationManifest;
      try {
        manifest = InstallationManifestSchema.parse(
          JSON.parse(await readFile(manifestPath, "utf8")),
        );
      } catch {
        continue;
      }

      for (const file of manifest.files) {
        const absolutePath = path.join(targetRoot, ...file.path.split("/"));
        const backupPath = path.join(targetRoot, ".mimera", "backups", host, ...file.path.split("/"));

        if (input.restoreBackups && (await exists(backupPath))) {
          await mkdir(path.dirname(absolutePath), { recursive: true });
          await copyFile(backupPath, absolutePath);
          restored.push(file.path);
        } else if (await exists(absolutePath)) {
          await rm(absolutePath, { force: true });
          removed.push(file.path);
        }
      }

      await rm(manifestPath, { force: true });
      await rm(path.join(targetRoot, ".mimera", "backups", host), { recursive: true, force: true }).catch(() => {});
    }

    return {
      targetRoot,
      hosts,
      removed: removed.sort(),
      restored: restored.sort(),
    };
  }
}
