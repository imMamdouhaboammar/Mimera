# CI Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a deterministic GitHub Actions gate that reproduces Mimera's Bun and Playwright verification on pull requests and pushes to `main`.

**Architecture:** A single least-privilege workflow installs the Bun version declared in `package.json`, installs the locked Chromium runtime from the browser-lab workspace, and runs the repository's existing `bun run check` gate. A Bun test treats the workflow as a versioned contract.

**Tech Stack:** GitHub Actions, Bun 1.3.14, Playwright 1.61.0, Bun test.

## Global Constraints

- Bun remains the only project package manager and test runner.
- Preserve `bun.lock`; use `bun install --frozen-lockfile --ignore-scripts`.
- Install Chromium and Linux dependencies from the locked browser-lab workspace.
- Grant workflow permissions read-only access to repository contents.
- Do not add third-party dependencies.

---

### Task 1: Define the CI contract

**Files:**
- Create: `scripts/ci-workflow.test.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root `packageManager`, `bun.lock`, and `bun run check`.
- Produces: required CI behavior for `push` and `pull_request` on `main`.

- [ ] Write a failing Bun test that reads `.github/workflows/ci.yml` and asserts triggers, permissions, immutable action SHAs, frozen install, Chromium setup, and the full check command.
- [ ] Run `bun test scripts/ci-workflow.test.ts` and confirm it fails because the workflow is absent.
- [ ] Add the minimal workflow needed to satisfy the contract.
- [ ] Validate the Playwright workspace command resolves version 1.61.0.
- [ ] Run the targeted contract test.
- [ ] Run `bun run check`.
- [ ] Run `git diff --check` and review the workflow for secret, permission, and supply-chain exposure.
- [ ] Commit the independently verifiable build.
- [ ] Open a pull request, inspect checks, merge, and verify updated `main`.

## Acceptance Criteria

- Pull requests to `main` run the full gate.
- Pushes to `main` run the full gate.
- Concurrent superseded runs cancel safely.
- Workflow permissions are `contents: read` only.
- Bun resolves from `package.json` through `oven-sh/setup-bun@v2`.
- Dependencies install from the frozen lockfile without lifecycle scripts.
- Chromium and required Linux libraries install from Playwright 1.61.0.
- `bun run check` is the sole repository verification command.
- Browser-backed integration files execute in separate Bun processes.
- Local targeted and full tests pass without repository dependency changes.

### Task 2: Isolate browser integration processes

**Files:**
- Modify: `package.json`
- Create: `scripts/test-plan.ts`
- Create: `scripts/test-plan.test.ts`
- Create: `scripts/test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/ci-workflow.test.ts`

**Interfaces:**
- Consumes: every repository `*.test.ts` and `*.test.tsx` file.
- Produces: one non-browser test process followed by one process per Playwright integration file.

**Incident evidence:** GitHub Actions reported `waitForTimeout: Target page` inside `BrowserLab.#captureViewport`. A local repeated-capture probe reproduced Chromium remote debugging pipe termination on cycle 8. No test retry, skip, assertion reduction, or timeout increase is permitted as a remedy.

- [ ] Reproduce the remote debugging pipe failure under repeated full BrowserLab captures.
- [ ] Write a failing contract for complete, duplicate-free test partitioning.
- [ ] Write a failing contract that routes `bun run check` through the test runner.
- [ ] Run non-browser tests together and each browser integration file separately.
- [ ] Keep every test and assertion enabled; do not add retries or longer timeouts.
- [ ] Disable checkout credential persistence after verifying the GitHub job defaults.
- [ ] Stress the isolated browser groups and rerun the full repository gate.
- [ ] Push the correction and require a fresh green GitHub Actions run.
