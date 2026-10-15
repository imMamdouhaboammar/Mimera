---
name: rea-design-reconstruction
description: Unified reverse-engineering, behavioral extraction, and clean-room reconstruction harness bridging /rea (Reverse Engineer Anything), Mimera's Computer Vision Simulation Engine, and SkyTheme's Haute Couture Commerce Physics. Deconstructs minified JavaScript bundles, obfuscated WebGL/Three.js shaders, reactive canvas physics, and complex micro-interactions with verifiable evidence ledgers, and reconstructs them into clean-room TypeScript components with +90% visual parity gating.
---

# REA Design & UI-UX Behavioral Reconstruction Harness

This skill is the master ultra-connected harness uniting **Mimera's Computer Vision Engine**, **SkyTheme's Haute Couture Commerce Physics**, and **/rea's Deep Binary & Web Reverse-Engineering Framework**.

When dealing with complex modern web interfaces featuring obfuscated JavaScript bundles, custom WebGL shaders, Three.js scene graphs, Canvas particle engines, or proprietary micro-interactions, this skill provides the definitive, verifiable reconstruction pipeline.

---

## 1. The Unified Tri-Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           ONE POWERFUL RECONSTRUCTION HARNESS                           │
├───────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│   1. REA Reverse Eng      │   2. SkyTheme Physics       │   3. Mimera Visual Simulation │
│   (Deconstruct & Trace)   │   (Motion & Web Components) │   (Audit & Parity Gating)     │
├───────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • analyze_web_bundle      │ • Lenis momentum scrolling  │ • Playwright dual-viewport    │
│ • trace_javascript_       │ • RAF epsilon cancellation  │ • Sobel structural edge MSE   │
│   semantics               │ • Accessible BagDrawer      │ • 48-bin color histogram      │
│ • recover_javascript_     │   (role="dialog")           │ • Dynamic noise attenuation   │
│   sources                 │ • 3D Lookbook carousel      │ • +90% visual parity gate     │
│ • inspect_web_events      │ • Touch-momentum gating     │ • Cryptographic SHA-256 seal  │
└───────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Invariants & Non-Negotiable Directives

1. **Evidence-First Attribution Invariant**:
   - Every reconstructed feature must be anchored to verifiable evidence (artifact SHA-256 digest, script URL, module AST offset).
   - Reconstructed source files must include the standard REA Attribution Header:
     ```typescript
     /**
      * Feature Reconstruction: [Feature Name]
      * Reverse-Engineered from: [Target Binary / URL]
      * Evidence Digest: sha256:[hex-digest]
      * Binary / Script Location: [path-or-offset]
      */
     ```
2. **Zero-Guessing Computed Style & Geometry**:
   - Extract padding, font sizes, line heights, and margins directly from live DOM using `window.getComputedStyle(element)`.
3. **Motion Physics & Touch Gating**:
   - Gate all momentum scroll engines behind desktop fine-pointer viewports:
     ```javascript
     const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
     if (!isTouch) {
       // Initialize Lenis or Lerp physics
     }
     ```
4. **RAF Loop Settling Epsilon Threshold**:
   - Always establish an epsilon threshold (`|target - current| < 1e-4`) to cancel `requestAnimationFrame` loops when card positions stabilize.
5. **Accessible Overlay Confinement**:
   - All slide-out drawers and modals must declare `role="dialog"` and `aria-modal="true"`, lock body scroll when open, trap Tab focus, and dismiss on Escape.
6. **Strict +90.0% Visual Parity Threshold**:
   - Side-by-side Desktop (`1440x900`) and Mobile (`390x844`) audits must score >= 90.0% composite parity.

---

## 3. End-to-End Workflow

### Step 1: REA Deconstruction & Bundle Investigation
```bash
# Inspect minified web bundle or script and generate REA Evidence Digest
bun mimera rea https://target-app.com/assets/index.min.js --feature "Lookbook3DPhysics" --location "bundle.js#L180-L245"

# Or invoke REA MCP tools directly:
# - analyze_web_bundle
# - trace_javascript_semantics
# - inspect_web_event_listeners
```

### Step 2: Reference Reconnaissance & Computed Style Extraction
```bash
# Capture responsive evidence pack across desktop and mobile viewports
bun mimera capture

# Extract Design DNA tokens, typography hierarchies, and component boundaries
bun mimera analyze
```

### Step 3: Clean-Room Component Implementation
- Integrate SkyTheme custom Web Components (`<bag-drawer>`, `<lookbook-carousel>`, `<mobile-docker>`).
- Implement the reconstructed logic cleanly in TypeScript, attaching the REA attribution header.
- Apply extracted CSS custom properties and tokens.

### Step 4: Multi-Viewport Simulation & Parity Verification
```bash
# Run automated side-by-side dual-viewport audit (700px scroll increments)
bun mimera simulate --reference https://target-app.com --target http://localhost:5173/ --threshold 90

# Validate storefront invariants (touch scroll gating, aria-modal, RAF cancellation)
bun mimera storefront --validate --out ./storefront-dist
```

### Step 5: Multi-Reviewer Gate & Regression Locking
```bash
# Conduct multi-reviewer evaluation gate
bun mimera review --component lookbook-carousel

# Seal approved implementation into cryptographic regression lock
bun mimera lock --component lookbook-carousel -f src/components/LookbookCarousel.tsx -f src/components/LookbookCarousel.css

# Verify no previous components have regressed
bun mimera lock --verify
```

---

## 4. MCP Tools Mapping

| Capability | Tool Name | Description |
|---|---|---|
| **Storefront Generator** | `storefront.generate_luxury` | Generates complete luxury commerce storefront with 40+ conversion features. |
| **Invariant Checker** | `storefront.validate_invariants` | Asserts touch scroll gating, dialog accessibility, and RAF settling. |
| **REA Bundle Bridge** | `rea.inspect_bundle` | Generates REA evidence digests and attribution headers for reconstructed code. |
| **Vision Parity Scorer** | `visual.structural_similarity` | Sobel 3x3 edge MSE and 48-bin color histogram evaluation. |
| **Full Vision Auditor** | `visual.audit_simulation` | Playwright side-by-side desktop and mobile audits. |
| **Regression Seal** | `bun mimera lock` | Cryptographic SHA-256 component sealing. |
