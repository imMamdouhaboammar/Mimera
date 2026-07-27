import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import type {
  ApprovalRequirement,
  HookContext,
  HookDecision,
  HostKind,
  TrustedScope,
} from "@mimera/contracts";
import { HookRunner } from "@mimera/hooks";

export class PolicyDeniedError extends Error {
  readonly reasonCode: string;

  constructor(decision: HookDecision) {
    super(decision.message);
    this.name = "PolicyDeniedError";
    this.reasonCode = decision.reasonCode;
  }
}

export class PolicyApprovalRequiredError extends Error {
  readonly reasonCode: string;
  readonly requiredApproval: ApprovalRequirement;

  constructor(decision: HookDecision & { requiredApproval: ApprovalRequirement }) {
    super(decision.message);
    this.name = "PolicyApprovalRequiredError";
    this.reasonCode = decision.reasonCode;
    this.requiredApproval = decision.requiredApproval;
  }
}

export class PolicyDeferredError extends Error {
  readonly reasonCode: string;

  constructor(decision: HookDecision) {
    super(decision.message);
    this.name = "PolicyDeferredError";
    this.reasonCode = decision.reasonCode;
  }
}

export class CommandTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Command exceeded ${timeoutMs}ms`);
    this.name = "CommandTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class CommandOutputLimitError extends Error {
  readonly maxOutputBytes: number;

  constructor(maxOutputBytes: number) {
    super(`Command output exceeded ${maxOutputBytes} bytes`);
    this.name = "CommandOutputLimitError";
    this.maxOutputBytes = maxOutputBytes;
  }
}

export interface SafeProjectToolsOptions {
  sessionId: string;
  componentId?: string;
  agentId: string;
  host: HostKind;
  trustedScope: TrustedScope;
  hookRunner: HookRunner;
  commandTimeoutMs?: number;
  maxOutputBytes?: number;
  environment?: Record<string, string>;
}

export interface WriteFileResult {
  relativePath: string;
  absolutePath: string;
  contentHash: string;
  sizeBytes: number;
}

export interface CommandResult {
  command: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

function portablePath(value: string): string {
  return value.split(sep).join("/");
}

function defaultEnvironment(): Record<string, string> {
  const allowed = ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "CI", "TERM"];
  return Object.fromEntries(
    allowed.flatMap((name) => {
      const value = process.env[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );
}

function requireAllowed(decision: HookDecision): void {
  if (decision.kind === "allow") return;
  if (decision.kind === "ask" && decision.requiredApproval) {
    throw new PolicyApprovalRequiredError({ ...decision, requiredApproval: decision.requiredApproval });
  }
  if (decision.kind === "defer") throw new PolicyDeferredError(decision);
  throw new PolicyDeniedError(decision);
}

export class SafeProjectTools {
  readonly #sessionId: string;
  readonly #componentId: string | undefined;
  readonly #agentId: string;
  readonly #host: HostKind;
  readonly #trustedScope: TrustedScope;
  readonly #hookRunner: HookRunner;
  readonly #commandTimeoutMs: number;
  readonly #maxOutputBytes: number;
  readonly #environment: Record<string, string>;

  constructor(options: SafeProjectToolsOptions) {
    this.#sessionId = options.sessionId;
    this.#componentId = options.componentId;
    this.#agentId = options.agentId;
    this.#host = options.host;
    this.#trustedScope = structuredClone(options.trustedScope);
    this.#hookRunner = options.hookRunner;
    this.#commandTimeoutMs = options.commandTimeoutMs ?? 120_000;
    this.#maxOutputBytes = options.maxOutputBytes ?? 2_000_000;
    this.#environment = { ...defaultEnvironment(), ...options.environment };
  }

  async writeFile(relativePath: string, content: string | Uint8Array): Promise<WriteFileResult> {
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    await this.#authorize("project.write-file", { path: relativePath, sizeBytes: bytes.byteLength });

    const absolutePath = resolve(this.#trustedScope.targetRoot, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await this.#authorize("project.write-file", { path: relativePath, sizeBytes: bytes.byteLength });

    const temporaryPath = `${absolutePath}.${crypto.randomUUID()}.mimera-tmp`;
    try {
      await writeFile(temporaryPath, bytes, { mode: 0o600 });
      await rename(temporaryPath, absolutePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }

    return {
      relativePath: portablePath(relative(this.#trustedScope.targetRoot, absolutePath)),
      absolutePath,
      contentHash: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.byteLength,
    };
  }

  async runCommand(command: string, args: readonly string[]): Promise<CommandResult> {
    await this.#authorize("runtime.spawn", {
      command,
      args: [...args],
      cwd: this.#trustedScope.targetRoot,
    });

    const startedAt = performance.now();
    const child = Bun.spawn([command, ...args], {
      cwd: this.#trustedScope.targetRoot,
      env: this.#environment,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, this.#commandTimeoutMs);

    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      if (timedOut) throw new CommandTimeoutError(this.#commandTimeoutMs);
      const outputBytes = Buffer.byteLength(stdout) + Buffer.byteLength(stderr);
      if (outputBytes > this.#maxOutputBytes) {
        throw new CommandOutputLimitError(this.#maxOutputBytes);
      }
      return {
        command: [command, ...args],
        exitCode,
        stdout,
        stderr,
        durationMs: Math.max(0, performance.now() - startedAt),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async #authorize(operation: string, input: unknown): Promise<void> {
    const context: HookContext = {
      sessionId: this.#sessionId,
      ...(this.#componentId ? { componentId: this.#componentId } : {}),
      agentId: this.#agentId,
      host: this.#host,
      phase: "pre-tool-call",
      operation,
      input,
      trustedScope: this.#trustedScope,
      correlationId: crypto.randomUUID(),
    };
    const result = await this.#hookRunner.run(context);
    requireAllowed(result.decision);
  }
}
