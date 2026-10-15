import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  tempDir = await mkdtemp(join(tmpdir(), "mimera-cli-storefront-test-"));
  originalCwd = process.cwd();
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

test("mimera storefront generates luxury storefront and validates invariants", async () => {
  const io = createBufferIo();
  const generateCode = await runCli(
    ["storefront", "--generate", "--name", "L'ETOILE", "--out", "./dist-luxury"],
    io,
  );
  expect(generateCode).toBe(0);
  expect(io.stdoutText).toContain("SkyTheme Luxury Storefront Generated");
  expect(io.stdoutText).toContain("Brand: L'ETOILE");

  const validateIo = createBufferIo();
  const validateCode = await runCli(
    ["storefront", "--validate", "--out", "./dist-luxury"],
    validateIo,
  );
  expect(validateCode).toBe(0);
  expect(validateIo.stdoutText).toContain("Storefront Invariants Validation");
  expect(validateIo.stdoutText).toContain("ALL INVARIANTS PASSED");
});

test("mimera rea inspects web target and outputs evidence attribution ledger", async () => {
  const io = createBufferIo();
  const code = await runCli(
    [
      "rea",
      "https://luxury-app.example/bundle.js",
      "--feature",
      "LookbookScroller",
      "--location",
      "bundle.js#L200",
      "--notes",
      "Three.js mesh interpolation",
    ],
    io,
  );
  expect(code).toBe(0);
  expect(io.stdoutText).toContain("REA Evidence Ledger");
  expect(io.stdoutText).toContain("Feature: LookbookScroller");
  expect(io.stdoutText).toContain("Digest: sha256:");
  expect(io.stdoutText).toContain("Three.js mesh interpolation");
});
