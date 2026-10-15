# Implementation status

This repository contains an agent skill, architectural examples, a standalone HTML preview generator, and a separate minimal Shopify OS2 starter.

| Capability | HTML preview | Shopify Liquid starter | Reference parity |
| --- | --- | --- | --- |
| Renderable layout | Yes | Implemented structure | Not assessed |
| Hero | Generic demo | Merchant-editable image/text | Not assessed |
| Lookbook | Motion demonstration | Not implemented | Not assessed |
| Hotspots | Accessible selection demo | Not implemented | Not assessed |
| Cart drawer | Local dialog demonstration, no network cart | Not implemented | Not assessed |
| Product page | Static demo copy | Native Liquid product form | Not assessed |
| Collection listing | Static links | Liquid collection loop | Not assessed |
| Checkout | Nonfunctional preview button | Native Shopify cart form | Requires live dev store |
| Search | Preview UI only | Native search form/results | Requires live dev store |
| Theme Editor | Not applicable | Sections with schemas | Requires live editor tests |
| Pixel parity | Never verified | Never verified | Requires paired browser captures |
| Animated sections in references | Documentation and examples | Not integrated | Requires per-section work |

## Agentic clean-room support layer (not automatic parity)

The new tools bootstrap, Spector.js setup, per-project evidence ledger, sampled scroll screenshots and release audit are helper scripts for a human-authorized coding agent. They do **not** implement the missing Shopify sections or verify the reference by themselves. Spector must be run and its usable output recorded for observed WebGL, and actual interactions need independent motion-video evidence. See [runbook](references/clean-room-toolchain.md).

## Test layers

- `bun scripts/run-evals.ts`: deterministic **syntax and structural** checks only.
- `bun scripts/validate-storefront.ts ./dist/index.html`: file and JS integrity only.
- `bun run test:browser`: actual Chromium preview interaction tests.
- `bun run generate:shopify --out ./shopify-theme-dist`: creates a real Shopify-style folder layout. Shopify CLI Theme Check, Theme Editor and checkout validation must be performed before release.
- Visual parity requires **same viewport, same content/media permissions, same scroll progress, screenshots and screen recordings**. Static tests cannot prove parity.

## Release gates

1. Runtime JS has no syntax errors and browser tests pass.
2. Shopify Theme Check passes (for Shopify target).
3. Merchant can edit sections without runtime regressions.
4. Cart, variant, search and checkout scenarios tested against a development store.
5. Independent review of screenshots and motion captures, with quantified differences.
6. Provenance/license review for **every imported snippet, asset, binary or font**.
7. CI green on the exact PR HEAD.

Mark any unverified gate as PENDING, not PASS.
