import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  MimeraConfigSchema,
  ReferenceSessionSchema,
  type HighFidelityAuthorization,
  type HostKind,
  type MimeraConfig,
  type PythonRuntimeConfig,
  type ReferenceMode,
  type ReferenceSession,
  type SessionStatus,
  type TrustedScope,
} from "@mimera/contracts";
import { MimeraStore, SqliteHookAuditSink } from "@mimera/evidence-store";
import {
  HookRunner,
  createHookTransitionGuard,
  createStateTransitionHook,
} from "@mimera/hooks";
import { detectPythonRuntime } from "@mimera/python-bridge";
import { SessionStateMachine } from "@mimera/state-machine";

const STATE_DIRECTORY = ".mimera";
const CONFIG_FILE = "config.json";
const DATABASE_FILE = "mimera.sqlite";

export class ProjectAlreadyInitializedError extends Error {
  constructor(targetRoot: string) {
    super(`Mimera is already initialized at ${targetRoot}`);
    this.name = "ProjectAlreadyInitializedError";
  }
}

export class ProjectNotInitializedError extends Error {
  constructor(targetRoot: string) {
    super(`Mimera is not initialized at ${targetRoot}`);
    this.name = "ProjectNotInitializedError";
  }
}

export class CurrentSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Current Mimera session was not found: ${sessionId}`);
    this.name = "CurrentSessionNotFoundError";
  }
}

export interface MimeraProjectPaths {
  targetRoot: string;
  stateDirectory: string;
  configPath: string;
  databasePath: string;
}

export interface InitializeMimeraProjectOptions {
  targetRoot: string;
  referenceUrls: string[];
  host: HostKind;
  mode: ReferenceMode;
  python: {
    enabled: boolean;
    command?: string;
  };
  policyVersion?: string;
  highFidelityAuthorization?: HighFidelityAuthorization;
  now?: string;
}

export interface AdvanceSessionOptions {
  correlationId?: string;
  now?: string;
}

export interface MimeraProjectStatus {
  projectId: string;
  targetRoot: string;
  policyVersion: string;
  currentSession: ReferenceSession;
  python: PythonRuntimeConfig;
  evidenceCount: number;
  auditEventCount: number;
  nextStatuses: readonly SessionStatus[];
}

function projectPaths(targetRoot: string): MimeraProjectPaths {
  const absoluteRoot = resolve(targetRoot);
  const stateDirectory = join(absoluteRoot, STATE_DIRECTORY);
  return {
    targetRoot: absoluteRoot,
    stateDirectory,
    configPath: join(stateDirectory, CONFIG_FILE),
    databasePath: join(stateDirectory, DATABASE_FILE),
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeConfigAtomic(path: string, config: MimeraConfig): Promise<void> {
  const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}

async function resolvePythonConfig(
  input: InitializeMimeraProjectOptions["python"],
): Promise<PythonRuntimeConfig> {
  if (!input.enabled) return { enabled: false };
  const runtime = await detectPythonRuntime(input.command ? [input.command] : undefined);
  return { enabled: true, command: runtime.command };
}

function createTrustedScope(config: MimeraConfig): TrustedScope {
  return {
    targetRoot: config.targetRoot,
    targetFiles: [],
    allowedOrigins: [],
    allowedCommands: [],
    grantedPackPermissions: [],
    policyVersion: config.policyVersion,
  };
}

export class MimeraProject {
  readonly #paths: MimeraProjectPaths;
  readonly #config: MimeraConfig;
  readonly #store: MimeraStore;
  readonly #machine: SessionStateMachine;
  #closed = false;

  private constructor(paths: MimeraProjectPaths, config: MimeraConfig, store: MimeraStore) {
    this.#paths = paths;
    this.#config = config;
    this.#store = store;
    const auditSink = new SqliteHookAuditSink(store);
    const runner = new HookRunner({
      hooks: [createStateTransitionHook()],
      auditSink,
    });
    this.#machine = new SessionStateMachine({
      guard: createHookTransitionGuard({
        runner,
        trustedScope: createTrustedScope(config),
        host: config.defaultHost,
      }),
    });
  }

  static async initialize(options: InitializeMimeraProjectOptions): Promise<MimeraProject> {
    const paths = projectPaths(options.targetRoot);
    await mkdir(paths.targetRoot, { recursive: true });
    if (await exists(paths.configPath)) {
      throw new ProjectAlreadyInitializedError(paths.targetRoot);
    }

    await mkdir(paths.stateDirectory, { recursive: true, mode: 0o700 });
    const now = options.now ?? new Date().toISOString();
    const python = await resolvePythonConfig(options.python);
    const sessionId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const config = MimeraConfigSchema.parse({
      schemaVersion: "1",
      projectId,
      targetRoot: paths.targetRoot,
      policyVersion: options.policyVersion ?? "1",
      defaultHost: options.host,
      defaultMode: options.mode,
      currentSessionId: sessionId,
      python,
      createdAt: now,
      updatedAt: now,
    });
    const session = ReferenceSessionSchema.parse({
      id: sessionId,
      version: 1,
      targetRoot: paths.targetRoot,
      referenceUrls: options.referenceUrls,
      host: options.host,
      mode: options.mode,
      status: "CREATED",
      ...(options.highFidelityAuthorization
        ? { highFidelityAuthorization: options.highFidelityAuthorization }
        : {}),
      createdAt: now,
      updatedAt: now,
    });

    let store: MimeraStore | undefined;
    try {
      await writeConfigAtomic(paths.configPath, config);
      store = new MimeraStore(paths.databasePath);
      store.createSession(session);
      return new MimeraProject(paths, config, store);
    } catch (error) {
      store?.close();
      await rm(paths.stateDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  static async open(targetRoot: string): Promise<MimeraProject> {
    const paths = projectPaths(targetRoot);
    if (!(await exists(paths.configPath))) {
      throw new ProjectNotInitializedError(paths.targetRoot);
    }
    const config = MimeraConfigSchema.parse(JSON.parse(await readFile(paths.configPath, "utf8")));
    const store = new MimeraStore(paths.databasePath);
    const project = new MimeraProject(paths, config, store);
    try {
      project.currentSession();
      return project;
    } catch (error) {
      store.close();
      throw error;
    }
  }

  get paths(): MimeraProjectPaths {
    return { ...this.#paths };
  }

  get config(): MimeraConfig {
    return structuredClone(this.#config);
  }

  currentSession(): ReferenceSession {
    this.#assertOpen();
    const sessionId = this.#config.currentSessionId;
    if (!sessionId) throw new CurrentSessionNotFoundError("unset");
    const session = this.#store.getSession(sessionId);
    if (!session) throw new CurrentSessionNotFoundError(sessionId);
    return session;
  }

  status(): MimeraProjectStatus {
    const currentSession = this.currentSession();
    return {
      projectId: this.#config.projectId,
      targetRoot: this.#config.targetRoot,
      policyVersion: this.#config.policyVersion,
      currentSession,
      python: structuredClone(this.#config.python),
      evidenceCount: this.#store.listEvidence(currentSession.id).length,
      auditEventCount: this.#store.listHookAudit(currentSession.id).length,
      nextStatuses: this.#machine.allowedTransitions(currentSession.status),
    };
  }

  async advance(
    nextStatus: SessionStatus,
    actor: string,
    options: AdvanceSessionOptions = {},
  ): Promise<ReferenceSession> {
    const current = this.currentSession();
    const updated = await this.#machine.transition({
      session: current,
      nextStatus,
      expectedVersion: current.version,
      actor,
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      ...(options.now ? { now: options.now } : {}),
    });
    return this.#store.updateSession(updated, current.version);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#store.close();
  }

  #assertOpen(): void {
    if (this.#closed) throw new Error("Mimera project is closed");
  }
}
