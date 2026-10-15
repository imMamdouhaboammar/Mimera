---
name: regression-locking
description: Regression locking and verification skill for Mimera. Seals approved component artifacts into tamper-evident cryptographic SHA-256 locks and verifies that subsequent component edits never degrade or break previously locked components.
---

# Regression Locking Skill

This skill guarantees that once a component is approved by the user, its source files, CSS contracts, and visual assets are sealed into a `RegressionLock`. Subsequent component development cannot silently mutate or break previously approved components.

## Core Rules

1. **Mandatory Sealing on Approval**:
   - Immediately following user approval of a component, run `bun mimera lock` specifying all associated files.
2. **Preflight Verification**:
   - Before beginning implementation on any new component, run `bun mimera lock --verify`.
   - If any previously locked file has been modified or deleted, the build halts immediately with `REGRESSION_DETECTED`.

## CLI Usage

```bash
# Seal an approved component
bun mimera lock --component <component-id> -f src/components/<Component>.tsx -f src/components/<Component>.css

# Verify all project locks against workspace disk
bun mimera lock --verify
```
