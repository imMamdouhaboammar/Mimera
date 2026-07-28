# Plan 2 Browser Safety Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion for every task.

**Goal:** Make redirect and download policy behavior executable, typed, and safe at both BrowserLab and durable reference-capture boundaries.

**Architecture:** Extend the existing local fixture servers with redirect and download endpoints. Keep same-origin redirects inside the authorized origin. Preserve `NavigationDeniedError` when a redirect leaves the allowed origin. Convert download attempts into a typed BrowserLab denial and never commit partial reference evidence.

**Tech Stack:** Bun 1.3.14, TypeScript, Playwright 1.61.0, Bun test.

## Constraints

- Do not add dependencies or change `bun.lock`.
- Do not increase test timeouts or add retries.
- Keep browser-backed tests in the existing isolated files.
- Preserve the original reference policy error when a routed request is blocked.
- Cancel downloads and expose a stable reason code and URL.
- A failed capture must not advance the project session or commit capture evidence.

## Task 1: Redirect contract

**Files:**
- Modify: `packages/browser-lab/test/browser-lab.test.ts`
- Modify: `packages/reference-capture/test/reference-capture.test.ts`
- Modify only if RED requires it: `packages/browser-lab/src/browser-lab.ts`

- [x] Add a same-origin redirect fixture and assert the capture records the final URL.
- [x] Add a cross-origin redirect fixture and assert the original `NavigationDeniedError` is returned.
- [x] Assert the durable project remains `REFERENCE_AUTHORIZED` with no partial capture evidence.
- [x] Run the focused tests and preserve the RED output.
- [x] Confirm the existing redirect path already preserves the typed policy error, so no redirect production change is required.

## Task 2: Download contract

**Files:**
- Modify: `packages/browser-lab/test/browser-lab.test.ts`
- Modify: `packages/reference-capture/test/reference-capture.test.ts`
- Modify only if RED requires it: `packages/browser-lab/src/browser-lab.ts`
- Modify only if the public type surface requires it: `packages/browser-lab/src/contracts.ts`

- [x] Add a page that initiates a download during capture.
- [x] Assert capture rejects with a typed download denial containing reason code and URL.
- [x] Assert no downloaded payload is written inside the capture directory.
- [x] Add the smallest production change needed to cancel and surface the attempt.

## Verification

- [x] Run focused BrowserLab and ReferenceCapture tests.
- [x] Run the full isolated browser group.
- [x] Run `bun run check` under `CI=true` with two CPU cores.
- [x] Run `git diff --check` and confirm dependency files are unchanged.
- [x] Review redirect, SSRF, download, file-write, and error-propagation paths.
- [ ] Commit, open a pull request, require green CI and Qlty, merge, and verify `main`.
