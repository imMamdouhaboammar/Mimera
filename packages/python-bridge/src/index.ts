import { delimiter } from "node:path";
import type { Subprocess } from "bun";

export interface PythonRuntime {
  command: string;
  version: string;
  major: number;
  minor: number;
  patch: number;
}

export class PythonRuntimeNotFoundError extends Error {
  constructor() {
    super("No supported Python runtime was found. Mimera requires Python 3.9 or newer when Python workers are enabled.");
    this.name = "PythonRuntimeNotFoundError";
  }
}

export class PythonWorkerError extends Error {
  readonly code: string;
  readonly data: unknown;

  constructor(code: string, message: string, data?: unknown) {
    super(message);
    this.name = "PythonWorkerError";
    this.code = code;
    this.data = data;
  }
}

export class PythonWorkerTimeoutError extends PythonWorkerError {
  constructor(method: string, timeoutMs: number) {
    super("WORKER_TIMEOUT", `Python worker method ${method} exceeded ${timeoutMs}ms`);
    this.name = "PythonWorkerTimeoutError";
  }
}

export async function detectPythonRuntime(
  candidates: readonly string[] = ["python3", "python"],
): Promise<PythonRuntime> {
  for (const command of candidates) {
    try {
      const process = Bun.spawn([command, "--version"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
        process.exited,
      ]);
      if (exitCode !== 0) continue;
      const output = `${stdout}\n${stderr}`.trim();
      const match = output.match(/Python\s+(\d+)\.(\d+)\.(\d+)/);
      if (!match) continue;
      const major = Number(match[1]);
      const minor = Number(match[2]);
      const patch = Number(match[3]);
      if (major > 3 || (major === 3 && minor >= 9)) {
        return { command, version: `${major}.${minor}.${patch}`, major, minor, patch };
      }
    } catch {
      continue;
    }
  }
  throw new PythonRuntimeNotFoundError();
}

interface WorkerSuccessResponse {
  protocolVersion: "1";
  id: string;
  ok: true;
  result: unknown;
}

interface WorkerErrorResponse {
  protocolVersion: "1";
  id: string;
  ok: false;
  error: {
    code: string;
    message: string;
    data?: unknown;
  };
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

interface PendingRequest {
  method: string;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
  timer: ReturnType<typeof setTimeout>;
}

export interface PythonWorkerClientOptions {
  pythonPath: string;
  pythonRoot: string;
  requestTimeoutMs?: number;
}

export class PythonWorkerClient {
  readonly #process: Subprocess<"pipe", "pipe", "pipe">;
  readonly #pending = new Map<string, PendingRequest>();
  readonly #requestTimeoutMs: number;
  readonly #readLoop: Promise<void>;
  #closed = false;
  #stderr = "";

  constructor(options: PythonWorkerClientOptions) {
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    const existingPythonPath = process.env.PYTHONPATH;
    this.#process = Bun.spawn([options.pythonPath, "-m", "mimera_worker"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PYTHONPATH: [options.pythonRoot, existingPythonPath].filter(Boolean).join(delimiter),
      },
    });
    this.#readLoop = this.#consumeOutput();
    void this.#consumeStderr();
    void this.#watchExit();
  }

  async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    if (this.#closed) throw new PythonWorkerError("WORKER_CLOSED", "Python worker is closed");
    if (!method.trim()) throw new PythonWorkerError("INVALID_METHOD", "Worker method cannot be empty");
    const id = crypto.randomUUID();
    const request = JSON.stringify({
      protocolVersion: "1",
      id,
      method,
      params,
    });

    const response = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new PythonWorkerTimeoutError(method, this.#requestTimeoutMs));
      }, this.#requestTimeoutMs);
      this.#pending.set(id, {
        method,
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
    });

    this.#process.stdin.write(`${request}\n`);
    await this.#process.stdin.flush();
    return response;
  }

  async #consumeOutput(): Promise<void> {
    const reader = this.#process.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        while (true) {
          const newline = buffer.indexOf("\n");
          if (newline < 0) break;
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) this.#handleLine(line);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async #consumeStderr(): Promise<void> {
    this.#stderr = (await new Response(this.#process.stderr).text()).trim();
  }

  #handleLine(line: string): void {
    let response: WorkerResponse;
    try {
      response = JSON.parse(line) as WorkerResponse;
    } catch {
      this.#failAll(new PythonWorkerError("INVALID_RESPONSE", "Python worker returned invalid JSON"));
      return;
    }
    const pending = this.#pending.get(response.id);
    if (!pending) return;
    this.#pending.delete(response.id);
    clearTimeout(pending.timer);
    if (response.protocolVersion !== "1") {
      pending.reject(new PythonWorkerError("PROTOCOL_MISMATCH", "Python worker protocol version does not match"));
      return;
    }
    if (response.ok) {
      pending.resolve(response.result);
      return;
    }
    pending.reject(new PythonWorkerError(response.error.code, response.error.message, response.error.data));
  }

  async #watchExit(): Promise<void> {
    const exitCode = await this.#process.exited;
    if (!this.#closed && this.#pending.size > 0) {
      const suffix = this.#stderr ? `: ${this.#stderr}` : "";
      this.#failAll(new PythonWorkerError("WORKER_EXITED", `Python worker exited with code ${exitCode}${suffix}`));
    }
  }

  #failAll(error: PythonWorkerError): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#process.stdin.end();
    await Promise.allSettled([this.#process.exited, this.#readLoop]);
    this.#failAll(new PythonWorkerError("WORKER_CLOSED", "Python worker was closed"));
  }
}
