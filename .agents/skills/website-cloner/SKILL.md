---
name: website-cloner
description: Agentic workflow for cloning websites with pixel-perfect fidelity using Mimera's visual simulation engine and specialized sub-agents. Use when cloning/reproducing a website, extracting design DNA, or rebuilding an interface with React, Tailwind CSS, and Motion. Enforces Bun runtime, zero-guessing computed style extraction, dynamic video normalization, and the strict +90% visual parity threshold gate.
---

# Website Cloner Skill (Powered by Mimera Engine)

Clone any website with pixel-perfect fidelity using an orchestrated multi-agent workflow integrated with Mimera's native visual simulation and verification engine.

## Overview

This skill integrates the multi-agent cloning pattern with Mimera's zero-dependency visual engine:
- **Orchestration**: End-to-end management from reference reconnaissance to verified component locking.
- **4 Specialized Sub-Agents**:
  1. `website-screenshotter`: Captures desktop (`1440x900`) and mobile (`390x844`) side-by-side viewports at 700px scroll intervals.
  2. `website-extractor`: Harvests assets to `public/`, extracts live computed CSS (`getComputedStyle`), fonts, and color palettes.
  3. `website-cloner`: Implements responsive React components with Tailwind CSS and Motion.
  4. `website-qa-reviewer`: Evaluates structural edge MSE, color histograms, and pixel diffs via `bun mimera simulate`.
- **Quality Gate**: Non-negotiable **+90.0% minimum visual parity threshold** (target 100%).
- **Runtime Policy**: **Bun is strictly mandatory**. `npm` and `yarn` are prohibited.

---

## Architecture

```
┌───────────────────────────────────────────────┐
│           ORCHESTRATOR / MIMERA CLI           │
│     bun mimera prepare -> capture -> analyze  │
└───────────────────────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────┐              ┌────────────────┐
│ screenshotter│              │   extractor    │
│ (Dual view)  │              │ (Computed CSS) │
└──────────────┘              └────────────────┘
       │                               │
       └───────────────┬───────────────┘
                       ▼
              ┌────────────────┐
              │     cloner     │◄──────────────┐
              │(React+Tailwind)│               │
              └────────────────┘               │
                       │                       │
                       ▼                       │
              ┌────────────────┐               │
              │  qa-reviewer   │───────────────┘
              │(Parity >= 90%) │  (Loop until >= 90.0% or 5 iterations)
              └────────────────┘
                       │ (Pass >= 90%)
                       ▼
              ┌────────────────┐
              │ regression-lock│
              │(Cryptographic) │
              └────────────────┘
```

---

## Golden Principles

1. **Zero-Guessing Computed Style Extraction**:
   - Never guess padding, margins, font sizes, or line heights.
   - Always extract exact values from the live DOM via Playwright:
     ```javascript
     const computed = window.getComputedStyle(element);
     console.log(computed.fontSize, computed.lineHeight, computed.padding, computed.margin);
     ```
2. **Dynamic Noise Normalization**:
   - Normalize async video frames, YouTube embeds, and dynamic canvases before comparison:
     ```javascript
     document.querySelectorAll('iframe, video, canvas').forEach(el => el.style.opacity = '0.3');
     ```
3. **Multi-Viewport Side-by-Side Verification**:
   - Evaluate both Desktop (`1440x900`) and Mobile (`390x844`) at 700px vertical increments.
4. **Strict Parity Gate (+90% Minimum)**:
   - Parity combines Structural Edge MSE (65%), Pixel Diff (25%), and Color Histogram (10%).
   - Score < 90.0% automatically rejects the build.
5. **Regression Locking**:
   - Once approved, seal all modified files using `bun mimera lock -c <component-id> -f <files...>`.

---

## Step-by-Step Workflow

### Step 1: Initialize Project & Reconnaissance
```bash
# Initialize session with reference URL
bun mimera init --reference <target-url> --host gemini-cli --mode high-fidelity

# Capture multi-viewport evidence pack and download assets into public/
bun mimera capture
```

### Step 2: Extract Design DNA & Tokens
```bash
# Extract typography hierarchy, rhythm unit, and color tokens
bun mimera analyze
```

### Step 3: Implement Component
- Build the component in `src/components/` or `app/` using React, Tailwind CSS arbitrary values (`bg-[#hex]`, `p-[18px]`), and Motion.
- Connect self-hosted fonts in `index.html` or root CSS.

### Step 4: Run Visual Simulation & Parity Audit
```bash
# Run automated side-by-side dual-viewport audit
bun mimera simulate --reference <target-url> --target http://localhost:5173/ --threshold 90
```

### Step 5: Review & Seal Regression Lock
```bash
# Multi-reviewer inspection
bun mimera review --component <component-id>

# Seal approved code
bun mimera lock --component <component-id> -f src/components/<Component>.tsx
```
