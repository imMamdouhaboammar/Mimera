# Mimera Agent Development & Roadmap Tracker

> **Maintainer Note:** This document is the agent's authoritative, maintained task-tracking ledger for Mimera development. Every completed vertical slice and new task state transition must be reflected here alongside `docs/status/implementation-status.md`.

---

## 1. System Architecture & Boundaries

* **Primary Runtime:** Bun 1.3.14 (TypeScript strict, Bun test, Bun package runner).
* **Worker Runtime:** Python 3.10+ (Optional worker runtime communicating over JSON Lines protocol).
* **Key Packages:**
  * `apps/cli`: CLI interface (`init`, `status`, `prepare`, `capture`, `analyze`, `specify`, `doctor`, `resume`).
  * `packages/contracts`: Core Zod schemas and data contracts.
  * `packages/state-machine`: Canonical state transitions & guards.
  * `packages/evidence-store`: SQLite evidence persistence & asset provenance.
  * `packages/hooks`: Deterministic security & policy hooks (Layer 1-3).
  * `packages/reference-policy`: Origin, IP, Robots, Redirect, Download, Rate Limiting policies.
  * `packages/browser-lab`: Playwright browser automation & evidence extraction.
  * `packages/reference-capture`: Durable responsive capture orchestration.
  * `packages/mcp-server`: Model Context Protocol server exposing project tools.
  * `packages/agent-runtime`: 27 portable agent roles and dispatcher.
  * `packages/host-adapters`: Renderers for Claude Code, Codex, Cursor, Gemini CLI, Generic.

---

## 2. Plans 1–8 Milestone Matrix

| Plan | Feature / Subsystem | Status | Key Deliverables & Evidence |
|---|---|---|---|
| **Plan 1** | Core Runtime & Project Lifecycle | `implemented-and-tested` | Contracts, State Machine, SQLite Store, Hooks, Core CLI, Python Bridge. |
| **Plan 2** | Browser Lab & Reference Capture | `partially-implemented` | Playwright capture, Redirect/Download denial, Per-origin rate limiter & Retry-storm pacing, `browser.open_reference` MCP tool. |
| **Plan 3** | Design Analysis & Tokens | `partially-implemented` | Design DNA extraction, Responsive rules, Page decomposition, Component spec. |
| **Plan 4** | Agent Runtime & Task Graph | `partially-implemented` | 27 Role descriptors, Agent dispatcher, Context curator, Host adapters. |
| **Plan 5** | Component Spec & Implementation | `partially-implemented` | Component spec, Safe project tools, Implementation workspace, Review schemas. |
| **Plan 6** | Local Review Dashboard | `missing` | *Pending:* Vite + React local review server and UI. |
| **Plan 7** | Installer & Host Adapters | `partially-implemented` | 5 Host renderers, Atomic installer, Conflict detection, Doctor command. |
| **Plan 8** | Security & Recipe Packs | `partially-implemented` | Path, command, transition, trust, and provenance controls in hooks. |

---

## 3. Active Granular Task Breakdown

### Plan 2: Reference Capture & Browser Lab
- [x] **Browser Lab Safety**: Typed `BrowserDownloadDeniedError`, redirect preservation.
- [x] **MCP Browser Tool Facade**: `browser.open_reference` registered with project serialization & Zod schemas.
- [x] **Retry-Storm & Subrequest Pacing**: Rate limiter enforced during route interception (`page.route`), pacing rapid same-origin fetches in `browser-lab` & `reference-capture`.
- [x] **MCP Browser Tool Surface Expansion**:
  - [x] `browser.open_reference`: Capture authorized reference URL through policy & serialization.
  - [x] `browser.take_snapshot`: DOM tree hierarchy & node snapshot tool.
  - [x] `browser.take_screenshot`: Full-page/element screenshot path tool.
  - [x] `browser.inspect_element`: Detailed selector inspection tool.
  - [x] `browser.get_computed_styles`: CSS tokens & computed style tool.
  - [x] `browser.close`: Clean context termination tool.

### Plan 3: Design Analysis & Token Inference
- [x] **Design DNA Extraction**: Typography, spacing, grid, radius, shadows, color palettes.
- [x] **Page Decomposition**: Component hypothesis & DOM hierarchy analysis.
- [x] **Brand Adapter Artifact**: Dedicated brand-mapping transformation schema & token mapper.
- [ ] **Interaction Event Recording**: Event recorder for hover, focus, click, modal states.

### Plan 4: Agent Runtime & Orchestration
- [x] **27 Role Descriptors**: Full registry of specialized roles (Architect, Reviewers, Builders).
- [x] **Context Curator**: Scoped context packet generation without conversation history bloat.
- [x] **Persisted Task Graph & Bounded Retry**: Dependency resolution, retry counter, blocked state, and JSON serialization.

### Plan 5: Component Implementation & Review Gates
- [x] **Component Specification**: Evidence-backed component contract & write scope.
- [x] **Safe Project Tools**: Atomic write patch, symlink escape prevention, command policy.
- [x] **Reviewer Veto Aggregation**: Combined scoring & veto decision engine.
- [ ] **Regression Lock Artifact**: Automated test generation & lock file creation.

### Plan 6: Review Dashboard
- [ ] **Local Review Server**: Local server serving review state & evidence.
- [ ] **React Review Interface**: Side-by-side visual diff, overlay, and approval workflow.

### Plan 7: Installer & Host Adapters
- [x] **5 Host Renderers**: Claude Code, Codex, Cursor, Gemini CLI, Generic.
- [x] **Atomic Installer & Conflict Handling**: Staging, backup, manifest generation.
- [x] **Uninstall & Rollback Operations**: Clean host file removal and backup restoration.

---

## 4. Verification & Hard Gates

Every task must pass the following quality gate before being marked complete:
1. **Typecheck & Lint:** `bun run typecheck` & `bun run lint`.
2. **Automated Tests:** `bun run test` (All 135+ unit & browser tests passing).
3. **Clean Code & Test Guard:** Run `clean-code-guard` and `test-guard` skill checks.
