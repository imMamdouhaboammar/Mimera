import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runCli, type CliIo } from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function targetRoot(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mimera-cli-"));
  directories.push(directory);
  return directory;
}

function captureIo(): CliIo & { stdoutLines: string[]; stderrLines: string[] } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdoutLines,
    stderrLines,
    stdout: (text) => stdoutLines.push(text),
    stderr: (text) => stderrLines.push(text),
  };
}

describe("Mimera CLI", () => {
  test("initializes, reports status, and resumes a session", async () => {
    const root = await targetRoot();
    const initIo = captureIo();
    const initCode = await runCli(
      [
        "init",
        root,
        "--reference",
        "https://example.com",
        "--host",
        "codex",
        "--mode",
        "structure",
        "--python",
        "--python-command",
        "python3",
        "--json",
      ],
      initIo,
    );
    const initialized = JSON.parse(initIo.stdoutLines.join("")) as {
      status: string;
      sessionId: string;
      python: { enabled: boolean };
    };

    expect(initCode).toBe(0);
    expect(initialized.status).toBe("CREATED");
    expect(initialized.sessionId).toBeTruthy();
    expect(initialized.python.enabled).toBe(true);

    const statusIo = captureIo();
    expect(await runCli(["status", root, "--json"], statusIo)).toBe(0);
    const status = JSON.parse(statusIo.stdoutLines.join("")) as {
      currentSession: { id: string; status: string };
      nextStatuses: string[];
    };
    expect(status.currentSession.id).toBe(initialized.sessionId);
    expect(status.currentSession.status).toBe("CREATED");
    expect(status.nextStatuses).toEqual(["PREFLIGHT"]);

    const resumeIo = captureIo();
    expect(await runCli(["resume", root, "--json"], resumeIo)).toBe(0);
    const resumed = JSON.parse(resumeIo.stdoutLines.join("")) as { sessionId: string; nextStatuses: string[] };
    expect(resumed.sessionId).toBe(initialized.sessionId);
    expect(resumed.nextStatuses).toEqual(["PREFLIGHT"]);
  });

  test("doctor validates Bun, Python, and project storage", async () => {
    const root = await targetRoot();
    const initIo = captureIo();
    await runCli(
      [
        "init",
        root,
        "--reference",
        "https://example.com",
        "--python",
        "--python-command",
        "python3",
        "--json",
      ],
      initIo,
    );

    const doctorIo = captureIo();
    expect(await runCli(["doctor", root, "--json"], doctorIo)).toBe(0);
    const report = JSON.parse(doctorIo.stdoutLines.join("")) as {
      ok: boolean;
      checks: { bun: { ok: boolean }; python: { ok: boolean }; project: { ok: boolean } };
    };
    expect(report.ok).toBe(true);
    expect(report.checks.bun.ok).toBe(true);
    expect(report.checks.python.ok).toBe(true);
    expect(report.checks.project.ok).toBe(true);
  });

  test("returns a non-zero code and structured error for invalid mode", async () => {
    const root = await targetRoot();
    const io = captureIo();
    const code = await runCli(
      ["init", root, "--reference", "https://example.com", "--mode", "pixel-magic", "--json"],
      io,
    );

    expect(code).toBe(1);
    const error = JSON.parse(io.stderrLines.join("")) as { error: { code: string } };
    expect(error.error.code).toBe("INVALID_ARGUMENT");
  });
});
