# Contributing to Mimera

Thank you for your interest in contributing to Mimera!

## Development Philosophy

1. **Bun First**: Bun is the mandatory package manager and runtime. Do not use npm or yarn.
2. **Deterministic Hooks**: All mutations and write operations must be bounded by hooks and write scopes.
3. **Zero Guessing & Parity Gating**: Visual and DOM properties must be derived from verified computed styles and meet the +90.0% parity threshold.
4. **The 4 Kernel Invariants**: All frontend code and documentation must adhere to touch-momentum gating, accessible dialog confinement, RAF epsilon settling, and quoted Mermaid labels.

## Local Setup

```bash
# Clone the repository
git clone https://github.com/imMamdouhaboammar/Mimera.git
cd Mimera

# Install dependencies using Bun
bun install

# Verify workspace checks
bun run check
```

## Running Tests

```bash
# Run full suite (unit + browser tests)
bun run check

# Run only unit tests
bun run test:unit

# Run only browser integration tests
bun run test:browser
```

## Submitting Pull Requests

1. Create a focused feature branch from `main`.
2. Ensure `bun run check` passes with 0 errors and 100% test pass rate.
3. Commit with descriptive conventional commit messages.
4. Open a pull request against `main`.
