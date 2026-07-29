# Mimera Simulation Engine Contracts & Rules

This document defines the non-negotiable architectural rules, engine requirements, and verification gates for the **Mimera Website Cloning & Simulation Engine**.

---

## 1. Core Simulation Engine Rules

### Rule 1: Zero-Guessing Policy (Computed CSS First)
- **Requirement**: Never infer or guess CSS properties, font sizes, line heights, paddings, or margins.
- **Enforcement**: All styling tokens MUST be extracted directly from live browser DOM via `window.getComputedStyle(element)` queries using Playwright.

### Rule 2: Playwright-by-Default Computer Vision Engine
- **Requirement**: Source code generation alone is NOT proof of completion.
- **Enforcement**: The engine MUST launch headless Playwright automatically to capture side-by-side live screenshots (Original Target vs Local Clone) at 700px scroll increments across desktop (1440px) and mobile (390px) viewports.

### Rule 3: Visual Parity Threshold Gating (+90% Minimum)
- **Requirement**: Any simulation score below **+90%** (target 100%) is classified as a **FAILED BUILD**.
- **Enforcement**: Automated structural edge detection (Edge MSE + Color Histogram) evaluates visual parity. The build gate passes ONLY when score >= 90.0%.

### Rule 4: Dynamic Noise Normalization
- **Requirement**: Moving video frames (e.g., YouTube `iframe` background videos) cause false pixel diffs.
- **Enforcement**: The Playwright vision engine MUST temporarily normalize or hide dynamic iframe/canvas elements (`document.querySelectorAll('iframe').forEach(f => f.style.opacity = '0.3')`) before taking screenshots.

---

## 2. Design Tokens, Interactivity & Motion Engine Contracts

### Contract 1: Design Tokens Matrix
Every component MUST map to explicit CSS custom properties defined in `:root`:
- `--primary-green`: Primary brand accent color.
- `--primary-green-glow`: Box-shadow glow rgba token.
- `--dark-navy`: Deep background container color.
- `--header-glass-bg`: Glassmorphism backdrop color.
- `--font-arabic`: Authoritative font family stack (`DahabArabicITF`, `Alexandria`, `Cairo`).

### Contract 2: Typography Scale Hierarchy
- **Hero Title**: `80px` (`line-height: 120px`)
- **Section Headlines**: `65px` (`line-height: 1.2`)
- **Subbrand Headlines**: `56px`
- **Marquee Banners**: `102px` and `64px`
- **Footer Slogan**: `120px`

### Contract 3: Hover Interactivity & Micro-Animations
All interactive elements MUST implement smooth cubic-bezier transitions (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`):
- **Navbar Links**: `-2px` Y-axis hover lift + color transition to `--primary-green`.
- **CTA Buttons**: `-3px` Y-axis lift + `--primary-green-glow` shadow + icon rotation from `40deg` to `90deg`.
- **Service Rows**: Right padding expansion + icon scale `1.1` + arrow translation `-4px`.
- **Subbrand & Product Cards**: `-6px` Y-axis lift + green border highlight + glow shadow.
- **Portfolio Video Cards**: `-8px` Y-axis lift + play badge scale `1.2`.

### Contract 4: Infinite Motion Animations
- **Circular Rotating Text SVG**: Keyframe rotation `rotateCircle 18s linear infinite`.
- **Scrolling Background Text**: Keyframe translation `heroMarquee 30s linear infinite`.
- **Smooth Anchor Scroll**: Native smooth scrolling for all internal anchor links.

---

## 3. Playwright Vision Inspector Implementation (`tools/vision_inspector.py`)

The python vision tool enforces these rules natively:

```python
# Playwright-by-Default Vision Audit Execution
from playwright.sync_api import sync_playwright

def run_mimera_vision_audit(out_dir):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page_orig = browser.new_page(viewport={'width': 1440, 'height': 900})
        page_local = browser.new_page(viewport={'width': 1440, 'height': 900})

        page_orig.goto("https://target-site.com/", wait_until="networkidle")
        page_local.goto("http://localhost:5173/", wait_until="networkidle")

        # Normalize video noise
        page_orig.evaluate("document.querySelectorAll('iframe').forEach(f => f.style.opacity = '0.3');")
        page_local.evaluate("document.querySelectorAll('iframe').forEach(f => f.style.opacity = '0.3');")

        # Capture side-by-side screenshots and compute structural parity
        # ...
```

---

**Document Location**: `docs/MIMERA_SIMULATION_ENGINE_RULES.md` & `.agent-kernel/rules/mimera-simulation-engine.md`
