# Mimera

**Mimera** is a local-first, agentic reference-driven interface engineering system. It studies reference applications, extracts design DNA, layout geometries, responsive behavior, and visual tokens, then reconstructs them inside your codebase component-by-component under strict quality rules and user approvals.

---

## Key Features

- **Deterministic Reference Capture**: Captures desktop and mobile responsive evidence, DOM trees, computed styles, network calls, and traces with zero untrusted instructions leakage.
- **Visual Inspection & Simulation Engine (`@mimera/visual-tools`)**:
  - **Pixel-Level Diffing**: Fast RGBA image/screenshot comparison calculating pixel mismatches, ratio, and bounding box diffs.
  - **Box-Model & Spatial Geometry**: Computes element bounding box deltas, center-point distances, padding/margin models, and spatial alignment indices.
  - **Dynamic Region Masking**: Masks volatile layout areas (timestamps, avatars, dynamic text) prior to visual comparison to prevent false positives.
  - **Diff Overlay Heatmaps**: Generates visual comparison overlays highlighting pixel shifts and geometry drift.
  - **Rule-Based Visual Scoring & Veto Engine**: Evaluates structural alignment, box-model spacing, typography, and brand-adapted styles with zero tolerance for critical layout displacement (>50px) or missing core components.
- **Project-Bound MCP Server (`@mimera/mcp-server`)**: Exposes 12 project-scoped Model Context Protocol (MCP) tools for AI agents:
  - **Browser Tools**: `browser.open_reference`, `browser.take_snapshot`, `browser.take_screenshot`, `browser.inspect_element`, `browser.get_computed_styles`, `browser.close`.
  - **Visual Tools**: `visual.compare`, `visual.compare_element`, `visual.measure_geometry`, `visual.create_overlay`, `visual.score`, `visual.mask_dynamic_region`.
- **Deterministic Hook Security**: Intercepts writes, state transitions, and tool calls with fail-closed security policy enforcing write scopes and command allowlists.
- **Multi-Host Compatibility**: Out-of-the-box adapters for Claude Code, Codex, Cursor, Gemini CLI, and generic terminal runtimes.

---

## Workspace Architecture

Mimera is structured as a Bun monorepo comprising 22 specialized packages:

| Package | Description |
|---|---|
| `@mimera/contracts` | Core data contracts, Zod schemas, hook definitions, and state interfaces |
| `@mimera/core` | Project lifecycle, session state management, and SQLite persistence |
| `@mimera/state-machine` | Guarded session state transitions and checkpointing |
| `@mimera/hooks` | Deterministic security hooks for write scopes, commands, and evidence trust |
| `@mimera/evidence-store` | Immutable evidence ingestion, SHA-256 digests, and artifact storage |
| `@mimera/browser-lab` | Playwright browser automation, multi-viewport capture, and download isolation |
| `@mimera/reference-capture` | Responsive evidence pack capture pipeline and policy enforcement |
| `@mimera/reference-policy` | Robots.txt, origin allowlists, private network blocking, and rate limiting |
| `@mimera/visual-tools` | Pixel diffing, spatial geometry comparison, region masking, and fidelity scoring |
| `@mimera/mcp-server` | Project-bound MCP server registering 12 browser and vision tools |
| `@mimera/project-inspector` | Workspace analysis, framework detection, and project profiling |
| `@mimera/preflight` | Project preflight profiling and session authorization |
| `@mimera/design-dna` | Token extraction, color harmony analysis, and typography inference |
| `@mimera/design-analysis` | Page decomposition, component boundary detection, and brand mapping |
| `@mimera/component-spec` | Component specification generator and acceptance criteria |
| `@mimera/project-tools` | Safe project file operations and atomic patch applicator |
| `@mimera/implementation-workspace` | Isolated component builder workspace and review aggregator |
| `@mimera/agent-runtime` | Portable agent roles, registry, context packets, and task dispatcher |
| `@mimera/context-curator` | Minimal context packet synthesis for agent execution |
| `@mimera/host-adapters` | Adapter generators for Claude, Codex, Cursor, and Gemini CLI |
| `@mimera/installer` | Atomic host adapter installation and backup manager |
| `@mimera/python-bridge` | Worker process bridge over versioned JSON Lines protocol |

---

## Runtime Policy

1. **Bun First**: Bun is the primary runtime, package manager, test runner, CLI host, and state owner.
2. **Deterministic Hooks**: Critical writes, state transitions, evidence ingestion, and command executions pass through deterministic hook guards.
3. **No Unapproved Writes**: Code generation is strictly scoped to declared target files and requires user approval for out-of-scope modifications.
4. **Untrusted Input Isolation**: All DOM content and text extracted from reference sites is labeled `untrusted-reference` and blocked from direct execution.

---

## CLI Commands

The Mimera CLI (`apps/cli`) provides 8 essential commands:

```bash
# Initialize a new Mimera session in the current project
bun mimera init --reference <url> --host codex --mode structure

# Check session status and current state
bun mimera status

# Resume an existing session from checkpoint
bun mimera resume

# Run preflight project profiling and reference authorization
bun mimera prepare

# Capture responsive reference evidence pack
bun mimera capture

# Extract Design DNA and page decomposition
bun mimera analyze

# Generate Component Implementation Spec
bun mimera specify

# Validate local environment, Bun, Python, and storage
bun mimera doctor
```

---

## Development & Verification

```bash
# Install dependencies
bun install

# Run type check across all packages
bun run typecheck

# Run linter
bun run lint

# Run full test suite (unit + browser tests)
bun run check
```

---

## Status Audit

Plan 1 is implemented and tested. The SHA-pinned evidence audit, missing exit criteria, and vertical slice roadmaps are maintained in [`docs/status/implementation-status.md`](docs/status/implementation-status.md).
