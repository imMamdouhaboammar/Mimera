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
- Local targeted and full tests pass without repository dependency changes.
