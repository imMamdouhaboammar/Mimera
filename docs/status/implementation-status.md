# Mimera Implementation Status Audit

Audited main baseline SHA: `0089683e5e3db890a72e990db384ed54608a32f1`

Status verified through: serialized first project-bound MCP browser tool facade

Audit date: `2026-07-28`

This maintained audit started from the named `main` baseline and includes the verified changes in the current build. It classifies behavior from source, tests, CLI surfaces, and CI. It does not treat a package name or a planned state transition as proof that a deliverable works.

Status labels:

- `implemented-and-tested`: the current exit criteria are exercised by passing tests.
- `partially-implemented`: meaningful deliverables exist, but named deliverables or exit criteria remain open.
- `implemented-but-unverified`: production behavior exists without adequate executable proof.
- `missing`: no executable implementation was found.
- `blocked`: an external dependency prevents implementation or verification.
- `documentation-stale`: documentation claims do not match the repository.

## Detected repository surface

- Applications: 1
- Workspace packages: 22
- Test files: 42
- TypeScript test cases: 135
- CLI commands: 8
- Host adapters: 5
- GitHub Actions workflows: 1

Repository evidence:

- Application: `apps/cli`.
- Workspace package declarations: `apps/*` and `packages/*` in `package.json`.
- Thirty-nine TypeScript test files under `apps`, `packages`, and `scripts`, plus `python/tests/test_protocol.py`.
- The verified test entrypoint is `scripts/test.ts`; six browser-backed files run in independent Bun processes.
- CLI commands are declared in `apps/cli/src/index.ts`: init, status, resume, prepare, capture, analyze, specify, and doctor.
- Host renderers are implemented in `packages/host-adapters/src/render.ts` for Claude Code, Codex, Cursor, Gemini CLI, and the generic fallback.
- CI is defined in `.github/workflows/ci.yml` and runs the frozen Bun and Playwright gate.

## Plans 1 through 8 status

| Plan | Status | Implemented evidence | Current boundary |
|---|---|---|---|
| Plan 1 | `implemented-and-tested` | Contracts in `packages/contracts/src/index.ts`; guarded transitions in `packages/state-machine/src/index.ts`; SQLite persistence in `packages/evidence-store/src/index.ts`; hooks in `packages/hooks/src`; project lifecycle in `packages/core/src/index.ts`; eight CLI commands in `apps/cli/src/index.ts`; Python worker bridge in `packages/python-bridge/src/index.ts`. | The Plan 1 exit criteria are covered by contract, state-machine, store, hook, core, CLI, and Python bridge tests. |
| Plan 2 | `partially-implemented` | Playwright capture and typed download denial in `packages/browser-lab/src/browser-lab.ts`; durable capture in `packages/reference-capture/src/index.ts`; project-bound, per-project serialized `browser.open_reference` registration in `packages/mcp-server/src/browser-tools.ts`; protocol handshake and safety tests in `packages/mcp-server/test/browser-tools.test.ts`; origin, private-network, robots, redirect, download, and rate policy in `packages/reference-policy/src`. | The first MCP browser tool is implemented without exposing raw Playwright or project-path selection, and concurrent captures for one project are serialized before opening the project. The remaining Browser Tool surface and a capture-level retry-storm test remain open. |
| Plan 3 | `partially-implemented` | Design token and responsive inference in `packages/design-dna/src/index.ts`; persisted Design DNA and page decomposition in `packages/design-analysis/src/index.ts`; component evidence feeds `packages/component-spec/src/index.ts`. | Interaction recording/replay, a dedicated brand-mapping artifact, and broader fixture coverage are missing. |
| Plan 4 | `partially-implemented` | Twenty-seven role descriptors in `packages/agent-runtime/src/descriptors.ts`; registry and validated dispatch in `packages/agent-runtime/src/dispatcher.ts`; scoped packets in `packages/context-curator/src/index.ts`; host role rendering in `packages/host-adapters/src`. | No persisted task graph, bounded retry history, packaged master/discovery/review skills, or real Core Worker end-to-end execution exists. |
| Plan 5 | `partially-implemented` | Component contracts in `packages/component-spec/src/index.ts`; guarded builder boundary in `packages/implementation-workspace/src/index.ts`; safe project tools in `packages/project-tools/src/index.ts`; review schemas and role descriptors exist. | No complete inspect, implement, review, revise, approve, and lock cycle; scoring, veto aggregation, test-designer output, and regression locks are missing. |
| Plan 6 | `missing` | User-review states exist in `packages/state-machine/src/index.ts`. | No local review server, React dashboard, side-by-side view, overlay/diff UI, approval persistence service, or request-changes surface was found. State names alone do not satisfy the Plan. |
| Plan 7 | `partially-implemented` | Five host renderers in `packages/host-adapters/src/render.ts`; atomic install, conflict handling, backups, idempotency, and detection in `packages/installer/src/index.ts`; doctor command in `apps/cli/src/index.ts`. | Uninstall, explicit rollback, native hook removal, clean-machine coverage for every host, and runtime capability probes remain open. |
| Plan 8 | `partially-implemented` | Path, command, transition, trust, and provenance controls in `packages/hooks/src` and `packages/reference-policy/src`; negative security tests; CI in `.github/workflows/ci.yml`. | Signed releases, publication, compatibility matrix, Recipe Pack loader/signature/local registry, fixture gallery, and beta channel are missing. |

## Missing exit criteria

### Plan 2

- Six project-bound MCP browser tools (`browser.open_reference`, `browser.take_snapshot`, `browser.take_screenshot`, `browser.inspect_element`, `browser.get_computed_styles`, and `browser.close`) are registered and tested in `packages/mcp-server`.
- The capture pipeline applies the per-origin rate limiter across routed subrequests and has executable retry-storm integration coverage in `packages/browser-lab/test/browser-lab.test.ts` and `packages/reference-capture/test/reference-capture.test.ts`.

### Plan 3

- Brand adaptation transformation engine and `BrandMapping` artifact are implemented in `packages/design-analysis/src/brand-adapter.ts` and tested in `packages/design-analysis/test/brand-adapter.test.ts`.
- No interaction-event evidence contract or recorder exists.
- The fixture set proves a navbar analysis, not a general page/interaction analysis surface.

### Plan 4

- Persisted task graph schema, node state machine, dependency resolution, retry tracking, and serialization are implemented in `packages/agent-runtime/src/task-graph.ts` and tested in `packages/agent-runtime/test/task-graph.test.ts`.
- Agent execution has a worker interface, dispatcher, context curator, and test doubles, but no real supported-host worker run is tested.
- The planned master, discovery, and review skills are not packaged in this repository.

### Plan 5

- Reviewer score aggregation, veto engine, and threshold enforcement are implemented in `packages/implementation-workspace/src/review-aggregator.ts` and tested in `packages/implementation-workspace/test/review-aggregator.test.ts`.
- No test designer contract exists.
- Revision routing is represented in state transitions, but no service drives it from review evidence.
- No regression lock artifact or verification service exists.
- The Navbar fixture does not complete the full Plan 5 exit cycle.

### Plan 6

- The complete application and persistence surface is missing.

### Plan 7

- Installation, uninstall, and backup restoration operations are implemented and tested in `packages/installer/src/index.ts` and `packages/installer/test/installer.test.ts`.
- Host detection checks files; it does not prove every generated host surface executes against the Core.
- No clean-machine install/uninstall matrix exists.

### Plan 8

- No repeatable signed release or package publication path exists.
- No Recipe Pack runtime loader, signature verification, permission enforcement, local registry, or removal test exists.
- No public beta artifact or compatibility matrix exists.

## Test coverage gaps

- `packages/browser-lab/test/browser-lab.test.ts` and `packages/reference-capture/test/reference-capture.test.ts` cover deterministic capture, authorized redirects, typed download denial, and same-origin retry-storm pacing across routed subrequests.
- `packages/reference-policy/test/rate-limiter.test.ts` proves spacing at the policy unit boundary.
- Agent runtime tests use controlled workers; there is no supported-host real-worker integration.
- Installer tests cover install and conflict behavior but not uninstall, rollback, or clean-machine host execution.
- State-machine tests prove legal transitions, but Plan 5 and Plan 6 lack services and user flows that produce those transitions.
- No release, package-install, Recipe Pack, or signed-artifact test exists.

## Security gaps

Existing controls are substantive: private/reserved network blocking, origin authorization, robots enforcement, symlink escape prevention, destructive command denial, scoped writes, untrusted evidence labels, provenance decisions, immutable CI actions, read-only workflow permissions, disabled checkout credential persistence, and disabled dependency lifecycle scripts.

Open security work:

- Redirect and download controls now have direct integration coverage and typed denial errors; the future MCP browser surface must preserve the same hard gates.
- The MCP facade is project-bound, policy-preserving, and serializes same-project captures to prevent orphaned artifacts; every later Browser Tool must retain the same bounded schema, error redaction, serialization, and no-raw-Playwright guarantees.
- No Recipe Pack signature or permission-escalation runtime exists to test.
- No signed release or distribution verification exists.
- Host adapter generation is tested as content, but installed-runtime hard-gate parity is not proven for every host.
- Plan 8 needs a traceable threat-control matrix linked to executable tests.

## Documentation mismatches

- Before this audit, README described Plan 1 as the current milestone even though Plans 2 through 5, 7, and parts of 8 already had code.
- The master plan names MCP browser tools, task graphs, review aggregation, dashboard approval, uninstall, signed releases, and Recipe Pack runtime behavior that are not yet present.
- Host mapping documents describe twenty-seven roles and five host strategies; descriptor and renderer generation exists, but the described real-worker and MCP/Core execution path is not complete.
- This audit names its baseline and is maintained by later verified builds; classifications must change with executable evidence.

## Recommended next vertical slice

Plan 2 is the earliest incomplete dependency in the ordered implementation program.

Next build: Plan 2 capture retry-storm integration

Scope for the next independently mergeable build:

1. Add a capture fixture that triggers rapid repeated same-origin requests without relying on external network timing.
2. Prove the capture pipeline applies the per-origin limiter across routed requests and cannot create an unbounded retry loop.
3. Record bounded timing and request-count evidence without weakening existing robots, origin, redirect, or download gates.
4. Run the isolated browser group, full repository gate, CI, review, and merge.

Not in that slice: expansion of the remaining MCP Browser Tool names. They remain separate vertical slices after the Plan 2 exit-criterion safety case is executable.

## Audit maintenance rule

Update this audit in the same pull request when a build changes a Plan status, closes a named gap, changes the inventory, or selects a different earliest incomplete dependency. Claims must remain tied to source paths, named tests, and a passing verification run.
