# Mimera

Mimera is a local-first, agentic system for studying reference interfaces and rebuilding their design direction inside an existing product, one approved component at a time.

## Runtime policy

- Bun is the primary runtime, package manager, test runner, CLI host, and state owner.
- Python is an optional worker runtime for specialized analysis through a versioned JSON Lines protocol.
- Critical writes, state transitions, evidence ingestion, and approvals pass through deterministic hooks.

## Current milestone

Plan 1: contracts, hooks, state machine, SQLite session storage, CLI skeleton, and Python worker protocol.
