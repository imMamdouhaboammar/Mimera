import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const auditPath = resolve(projectRoot, "docs/status/implementation-status.md");
const approvedStatuses = new Set([
  "implemented-and-tested",
  "partially-implemented",
  "implemented-but-unverified",
  "missing",
  "blocked",
  "documentation-stale",
]);

test("publishes a complete Plans 1 through 8 implementation audit", async () => {
  const audit = await readFile(auditPath, "utf8");

  expect(audit).toContain("Audited main SHA: `2627d5f26f601a174716cbb6d7f89731bb81aaf8`");
  expect(audit).toContain("Audit date: `2026-07-28`");
  expect(audit).toContain("Applications: 1");
  expect(audit).toContain("Workspace packages: 20");
  expect(audit).toContain("Test files: 37");
  expect(audit).toContain("TypeScript test cases: 118");
  expect(audit).toContain("CLI commands: 8");
  expect(audit).toContain("Host adapters: 5");
  expect(audit).toContain("GitHub Actions workflows: 1");

  const planRows = [...audit.matchAll(/^\| Plan ([1-8]) \| `([^`]+)` \|/gm)];
  expect(planRows).toHaveLength(8);
  expect(planRows.map((match) => Number(match[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(planRows.every((match) => approvedStatuses.has(match[2] ?? ""))).toBe(true);

  for (const heading of [
    "## Detected repository surface",
    "## Plans 1 through 8 status",
    "## Missing exit criteria",
    "## Test coverage gaps",
    "## Security gaps",
    "## Documentation mismatches",
    "## Recommended next vertical slice",
  ]) {
    expect(audit).toContain(heading);
  }

  expect(audit).toContain("Plan 2");
  expect(audit).toContain("earliest incomplete dependency");
});

test("README points to the verified audit instead of the stale Plan 1 milestone", async () => {
  const readme = await readFile(resolve(projectRoot, "README.md"), "utf8");

  expect(readme).toContain("docs/status/implementation-status.md");
  expect(readme).toContain("Plan 1 is implemented and tested");
  expect(readme).not.toContain(
    "Plan 1: contracts, hooks, state machine, SQLite session storage, CLI skeleton, and Python worker protocol.",
  );
});
