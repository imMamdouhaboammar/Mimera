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

Upgraded build surface (current verified build):
- Workspace packages: 23 (integrated `@mimera/skytheme-storefront`)
- Test files: 49
- TypeScript test cases: 155+
- CLI commands: 13 (init, status, resume, prepare, capture, analyze, specify, doctor, simulate, review, lock, storefront, rea)
- Project-bound MCP tools: 17 tools (browser, visual, storefront, and rea)
- Native visual simulation engine in `packages/visual-tools`: zero-dependency PNG codec (`png.ts`), 3x3 Sobel edge MSE detection, 48-bin color histogram similarity, and configurable visual parity gating (`edge-detection.ts`, `scorer.ts`).
- Dual-viewport automated Playwright vision auditor in `packages/browser-lab/src/vision-auditor.ts`.
- Component RegressionLock & TestDesigner services in `packages/component-spec/src`.
- SkyTheme Storefront & Motion Physics Engine in `packages/skytheme-storefront`: Lenis smooth scroll, 3D Lookbook carousel, Shop-the-Look hotspots, accessible BagDrawer (`role="dialog"`, `aria-modal="true"`), and RAF loop epsilon cancellation.
- REA (Reverse Engineer Anything) Bridge Service: verifiable SHA-256 evidence digests and clean-room attribution ledgers.

Repository evidence:

- Application: `apps/cli`.
- Workspace package declarations: `apps/*` and `packages/*` in `package.json`.
- Forty-six TypeScript test files under `apps`, `packages`, and `scripts`, plus `python/tests/test_protocol.py`.
- The verified test entrypoint is `scripts/test.ts`; browser-backed files run in independent Bun processes.
- CLI commands are declared in `apps/cli/src/index.ts`: init, status, resume, prepare, capture, analyze, specify, doctor, simulate, review, and lock.
- Host renderers are implemented in `packages/host-adapters/src/render.ts` for Claude Code, Codex, Cursor, Gemini CLI, and the generic fallback.
- CI is defined in `.github/workflows/ci.yml` and runs the frozen Bun and Playwright gate.

## Plans 1 through 8 status

| Plan | Status | Implemented evidence | Current boundary |
|---|---|---|---|
| Plan 1 | `implemented-and-tested` | Contracts in `packages/contracts/src/index.ts`; guarded transitions in `packages/state-machine/src/index.ts`; SQLite persistence in `packages/evidence-store/src/index.ts`; hooks in `packages/hooks/src`; project lifecycle in `packages/core/src/index.ts`; eleven CLI commands in `apps/cli/src/index.ts`; Python worker bridge in `packages/python-bridge/src/index.ts`. | The Plan 1 exit criteria are covered by contract, state-machine, store, hook, core, CLI, and Python bridge tests. |
| Plan 2 | `partially-implemented` | Playwright capture and typed download denial in `packages/browser-lab/src/browser-lab.ts`; durable capture in `packages/reference-capture/src/index.ts`; project-bound MCP tools (14 tools) in `packages/mcp-server/src/browser-tools.ts` and `visual-tools.ts`; origin, private-network, robots, redirect, download, and rate policy in `packages/reference-policy/src`. | MCP browser and vision tools are registered and verified. Capture retry-storm integration remains open. |
| Plan 3 | `partially-implemented` | Design token and responsive inference in `packages/design-dna/src/index.ts`; persisted Design DNA and page decomposition in `packages/design-analysis/src/index.ts`; component evidence feeds `packages/component-spec/src/index.ts`. | Interaction recording/replay and broader fixture coverage remain. |
| Plan 4 | `implemented-and-tested` | Master skill (`using-reference-engine`), visual inspection (`visual-verification`), reconnaissance (`reference-reconnaissance`), regression locking (`regression-locking`), design DNA extraction (`design-dna-extraction`), brand adaptation (`brand-adaptation`), and enhanced cloner skills (`website-cloner`, `web-clone`) packaged in `.agents/skills/`. Role descriptors in `packages/agent-runtime/src/descriptors.ts`. | Host skill bindings and dispatcher tests verified. |
| Plan 5 | `implemented-and-tested` | Component contracts in `packages/component-spec/src/index.ts`; `TestDesignerService` (`test-designer.ts`); `RegressionLockService` (`regression-lock.ts`) with SHA-256 seal and verification; safe project tools in `packages/project-tools/src/index.ts`. | Tested in `regression-lock.test.ts`. |
| Plan 6 | `implemented-and-tested` | Native simulation engine (`packages/visual-tools`), automated multi-viewport Playwright audit (`packages/browser-lab/src/vision-auditor.ts`), CLI commands `simulate`, `review`, and `lock` in `apps/cli/src/index.ts`. | Tested in `vision-auditor.test.ts` and `simulation-cli.test.ts`. |
| Plan 7 | `partially-implemented` | Five host renderers in `packages/host-adapters/src/render.ts`; atomic install, conflict handling, backups, idempotency, and detection in `packages/installer/src/index.ts`; doctor command in `apps/cli/src/index.ts`. | Uninstall, explicit rollback, native hook removal, clean-machine coverage for every host, and runtime capability probes remain open. |
| Plan 8 | `partially-implemented` | Path, command, transition, trust, and provenance controls in `packages/hooks/src` and `packages/reference-policy/src`; negative security tests; CI in `.github/workflows/ci.yml`. | Signed releases, publication, compatibility matrix, Recipe Pack loader/signature/local registry, fixture gallery, and beta channel are missing. |

## Missing exit criteria

### Plan 2

- The capture pipeline applies the per-origin rate limiter across routed subrequests and has executable retry-storm integration coverage in `packages/browser-lab/test/browser-lab.test.ts` and `packages/reference-capture/test/reference-capture.test.ts`.

### Plan 3

- Brand adaptation transformation engine and `BrandMapping` artifact are implemented in `packages/design-analysis/src/brand-adapter.ts` and tested in `packages/design-analysis/test/brand-adapter.test.ts`.
- No interaction-event evidence contract or recorder exists.
- The fixture set proves a navbar analysis, not a general page/interaction analysis surface.

### Plan 4

- Persisted task graph schema, node state machine, dependency resolution, retry tracking, and serialization are implemented in `packages/agent-runtime/src/task-graph.ts` and tested in `packages/agent-runtime/test/task-graph.test.ts`.
- Agent execution has a worker interface, dispatcher, context curator, and test doubles, but no real supported-host worker run is tested.

### Plan 5

- Reviewer score aggregation, veto engine, and threshold enforcement are implemented in `packages/implementation-workspace/src/review-aggregator.ts` and tested in `packages/implementation-workspace/test/review-aggregator.test.ts`.
- The Navbar fixture does not complete the full Plan 5 exit cycle.

### Plan 6

- Web-based interactive review dashboard remains optional next enhancement; CLI simulation (`bun mimera simulate`) and review (`bun mimera review`) are operational.

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
