import { afterEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  PythonWorkerClient,
  PythonWorkerError,
  detectPythonRuntime,
} from "../src/index.ts";

const clients: PythonWorkerClient[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

const pythonRoot = resolve(import.meta.dir, "../../../python");

describe("Python worker bridge", () => {
  test("detects a supported Python runtime", async () => {
    const runtime = await detectPythonRuntime(["python3"]);
    expect(runtime.command).toBe("python3");
    expect(runtime.major).toBe(3);
    expect(runtime.minor).toBeGreaterThanOrEqual(9);
  });

  test("performs a health request over JSON Lines", async () => {
    const client = new PythonWorkerClient({ pythonPath: "python3", pythonRoot });
    clients.push(client);

    const result = await client.call<{ protocolVersion: string; runtime: string }>("health", {});

    expect(result.protocolVersion).toBe("1");
    expect(result.runtime.startsWith("Python ")).toBe(true);
  });

  test("returns typed worker failures", async () => {
    const client = new PythonWorkerClient({ pythonPath: "python3", pythonRoot });
    clients.push(client);

    const error = await client.call("missing.method", {}).catch((caught) => caught);
    expect(error).toBeInstanceOf(PythonWorkerError);
    expect((error as PythonWorkerError).code).toBe("METHOD_NOT_FOUND");
  });
});
