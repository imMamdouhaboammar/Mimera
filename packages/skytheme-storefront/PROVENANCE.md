# Provenance and licensing review

**Reference URL:** https://skytheme-demo.myshopify.com/
**Theme documentation:** https://themesupport.gitbook.io/sky-docs
**Source note:** the original saved storefront bundle referenced in SKILL.md is not shipped with this repository and was not licensed for redistribution by this PR.

## Policy

- Shopify's public demo is an observable reference, not permission to redistribute paid-theme code, fonts, imagery or videos.
- Existing reference Markdown contains reverse-engineering descriptions and code examples. They require individual provenance review before reuse in an open-source product.
- This repository's MIT LICENSE applies to code that its contributors have the rights to license. It cannot grant permission for third-party content.
- Do not copy first-party Sky code or assets from a browser capture into a distributed artifact unless a rights holder grants appropriate permission.
- Library choices require license and version checks, attribution where applicable, and dependency vulnerability review.
- Never fabricate provenance claims such as "verified original equations", "guaranteed pixel parity" or "officially certified by Claude" without evidence.

## Mandatory evidence record for new work

| Field | Evidence |
| --- | --- |
| Component | Stable ID and file paths |
| Functional reference | Public URL, timestamp, viewport and interaction steps |
| Captures | Screenshot / screen recording paths and hashes |
| External code | Repository, pinned commit/version, license, attribution |
| Media | Source, use permission, derivative rights, expiry |
| Implementation | Author and diff |
| QA | Chromium results, Shopify dev store checks, visual comparison |
| Acceptance | Named reviewer and approval time |

The new Shopify starter only includes author-created layout and basic Liquid integrations. It uses empty image settings instead of bundling proprietary reference imagery.
