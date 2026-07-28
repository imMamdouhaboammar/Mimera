# Plan 2 MCP Browser Tool Facade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion for every task.

**Goal:** Expose the first safe MCP browser tool over Mimera's existing project, policy, capture, and evidence boundaries.

**Architecture:** Create a project-bound `McpServer` factory and register `browser.open_reference` on the official MCP TypeScript SDK. The handler validates bounded input, opens only the configured Mimera project, delegates to `ReferenceCaptureService`, returns compact metadata plus artifact paths, and maps policy/capture failures into typed MCP `isError` results. It never exposes Playwright objects, target-path selection, policy overrides, or raw DOM/network payloads.

**Tech Stack:** Bun 1.3.14, TypeScript, Zod 4, Model Context Protocol TypeScript SDK 1.30.0, Playwright 1.61.0, Bun test.

## Constraints

- Use the official MCP SDK and an in-memory client/server handshake in tests.
- Register only `browser.open_reference` in this slice.
- Bind one absolute project root at registration; do not accept target paths or policy override flags from MCP arguments.
- Accept only HTTP(S) URLs and one to four unique bounded viewports.
- Use `MimeraProject.open` against the fixed registration root and `ReferenceCaptureService`; do not expose raw BrowserLab or Playwright handles.
- Return compact structured content and artifact paths, not DOM or network dumps.
- Preserve origin, private-network, robots, rate, redirect, download, state, and evidence gates.
- Close the project for success and failure paths.

## Task 1: MCP contract

**Files:**
- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/src/index.ts`
- Create: `packages/mcp-server/src/browser-tools.ts`
- Create: `packages/mcp-server/test/browser-tools.test.ts`
- Create: `packages/mcp-server/test/dependency-policy.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `scripts/test-plan.ts`
- Modify: `scripts/test-plan.test.ts`
- Modify: `scripts/implementation-status.test.ts`
- Modify: `docs/status/implementation-status.md`
- Modify: `bun.lock`

- [x] Write RED end-to-end MCP tests for tool listing and a permitted reference capture.
- [x] Add RED cases for bounded viewport validation, denied origin, and download denial.
- [x] Register `browser.open_reference` with Zod input validation.
- [x] Delegate to the durable reference-capture service.
- [x] Return compact structured content with evidence IDs and artifact paths.
- [x] Keep human-readable MCP text compact and avoid duplicating structured payloads or artifact paths.
- [x] Map known failures to stable MCP error results without stack traces.
- [x] Keep the browser-backed MCP test in its own Bun process.
- [x] Bind the tool to one registration-time project root and reject relative roots.
- [x] Export `createMimeraMcpServer` so consumers receive the project-bound tool through one factory.
- [x] Redact unknown internal errors from protocol results.
- [x] Publish object-root MCP output schemas while validating strict success/failure unions internally.
- [x] Preserve typed robots denial and redact policy implementation details.
- [x] Redact uninitialized project paths from protocol results.
- [x] Pin MCP SDK 1.30.0 and override `@hono/node-server` to fixed 2.0.12 after a failing dependency audit.

## Verification

- [x] Run focused MCP browser tests.
- [x] Run the isolated browser group.
- [x] Run `bun run check` under `CI=true` with two CPU cores.
- [x] Run `git diff --check` and review dependency, MCP argument, SSRF, download, path, and error surfaces.
- [ ] Commit, open a pull request, require green CI and Qlty, merge, and verify `main`.
