import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MimeraProject } from "@mimera/core";
import { runCli, type CliIo } from "../src/index.ts";

function createBufferIo(): CliIo & { stdoutText: string; stderrText: string } {
  let stdoutText = "";
  let stderrText = "";
  return {
    stdout(text: string) {
      stdoutText += text;
    },
    stderr(text: string) {
      stderrText += text;
    },
    get stdoutText() {
      return stdoutText;
    },
    get stderrText() {
      return stderrText;
    },
  };
}

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mimera-cli-sim-test-"));
  originalCwd = process.cwd();
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

test("mimera review aggregates review scores and formats human output", async () => {
  const io = createBufferIo();
  const code = await runCli(["review", "--component", "navbar", "--score", "95"], io);
  expect(code).toBe(0);
  expect(io.stdoutText).toContain("Decision:  APPROVED");
  expect(io.stdoutText).toContain("Score:     95/100");

  const vetoIo = createBufferIo();
  const vetoCode = await runCli(
    ["review", "--component", "navbar", "--score", "95", "--veto", "Displacement exceeded"],
    vetoIo,
  );
  expect(vetoCode).toBe(0);
  expect(vetoIo.stdoutText).toContain("Decision:  BLOCKED_BY_VETO");
  expect(vetoIo.stdoutText).toContain("Displacement exceeded");
});

test("mimera lock seals component files and verifies regression locks", async () => {
  await MimeraProject.initialize({
    targetRoot: tempDir,
    referenceUrls: ["https://example.com"],
    host: "generic",
    mode: "structure",
    python: { enabled: false },
  });

  const testFile = "Component.tsx";
  await writeFile(join(tempDir, testFile), "export const Comp = () => <div>Hello</div>;", "utf8");

  const lockIo = createBufferIo();
  const lockCode = await runCli(["lock", "--component", "navbar", "-f", testFile], lockIo);
  expect(lockCode).toBe(0);
  expect(lockIo.stdoutText).toContain("Component Regression Lock Sealed");
  expect(lockIo.stdoutText).toContain("Component: navbar");

  // Verify should pass
  const verifyIo = createBufferIo();
  const verifyCode = await runCli(["lock", "--verify"], verifyIo);
  expect(verifyCode).toBe(0);
  expect(verifyIo.stdoutText).toContain("ALL LOCKS VERIFIED");

  // Mutate file to trigger regression
  await writeFile(join(tempDir, testFile), "export const Comp = () => <div>MUTATED</div>;", "utf8");

  const failVerifyIo = createBufferIo();
  const failVerifyCode = await runCli(["lock", "--verify"], failVerifyIo);
  expect(failVerifyCode).toBe(1);
  expect(failVerifyIo.stderrText).toContain("Regression lock verification failed");
});
