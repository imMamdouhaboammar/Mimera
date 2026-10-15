import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MimeraProject } from "@mimera/core";
import {
  RegressionLockService,
  TestDesignerService,
} from "../src/index.ts";
import type { ComponentSpec } from "@mimera/contracts";

test("TestDesignerService generates structured component tests from spec", () => {
  const service = new TestDesignerService();
  const spec: ComponentSpec = {
    id: "hero-navbar",
    pageId: "home",
    name: "Hero Navbar",
    boundaries: { selectorHints: ["header.main-header"] },
    evidenceIds: ["ev-1"],
    responsiveContract: {
      viewports: [{ width: 1440, height: 900 }],
      rules: ["Desktop flex row, mobile hamburger"],
    },
    interactionContract: {
      states: ["hover", "active"],
      keyboardRequirements: ["Tab navigable"],
      pointerRequirements: ["Hover color transition"],
    },
    brandMapping: {
      tokenMappings: { primary: "#00cc57" },
      preserveExistingIdentity: true,
      notes: [],
    },
    acceptanceCriteria: [
      {
        id: "ac-1",
        description: "Navbar contains logo and links",
        kind: "visual",
        required: true,
      },
    ],
    targetFiles: ["src/components/Navbar.tsx"],
    dependencies: [],
    status: "specified",
  };

  const design = service.designTests({ spec });
  expect(design.componentId).toBe("hero-navbar");
  expect(design.testCases.length).toBeGreaterThanOrEqual(4);
  expect(design.generatedSourceCode).toContain("hero-navbar");
});

test("RegressionLockService seals approved component files and detects subsequent regressions", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "mimera-lock-test-"));
  try {
    const project = await MimeraProject.initialize({
      targetRoot: tempDir,
      referenceUrls: ["https://example.com"],
      host: "generic",
      mode: "structure",
      python: { enabled: false },
    });

    const fileRelPath = "Navbar.tsx";
    const fullPath = join(tempDir, fileRelPath);
    await writeFile(fullPath, "export function Navbar() { return <nav>Original</nav>; }", "utf8");

    const lockService = new RegressionLockService();
    const lock = await lockService.lockComponent(project, {
      componentId: "hero-navbar",
      files: [fileRelPath],
    });

    expect(lock.componentId).toBe("hero-navbar");
    expect(lock.files).toHaveLength(1);
    expect(lock.files[0]!.relativePath).toBe(fileRelPath);

    // Initial check should be clean
    let verifyResult = await lockService.verifyLocks(project);
    expect(verifyResult.ok).toBe(true);
    expect(verifyResult.violations).toHaveLength(0);

    // Now introduce a regression by modifying Navbar.tsx
    await writeFile(fullPath, "export function Navbar() { return <nav>Mutated</nav>; }", "utf8");

    verifyResult = await lockService.verifyLocks(project);
    expect(verifyResult.ok).toBe(false);
    expect(verifyResult.violations).toHaveLength(1);
    expect(verifyResult.violations[0]!.componentId).toBe("hero-navbar");
    expect(verifyResult.violations[0]!.reason).toBe("modified");
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});
