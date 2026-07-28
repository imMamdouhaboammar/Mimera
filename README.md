# Mimera

Mimera is a local-first, agentic system for studying reference interfaces and rebuilding their design direction inside an existing product, one approved component at a time.

## Runtime policy

- Bun is the primary runtime, package manager, test runner, CLI host, and state owner.
- Python is an optional worker runtime for specialized analysis through a versioned JSON Lines protocol.
- Critical writes, state transitions, evidence ingestion, and approvals pass through deterministic hooks.

## Current milestone

Plan 1 is implemented and tested. Plans 2, 3, 4, 5, 7, and 8 are partially implemented, while Plan 6 is missing. The SHA-pinned evidence audit, open exit criteria, and selected next vertical slice are maintained in `docs/status/implementation-status.md`.
