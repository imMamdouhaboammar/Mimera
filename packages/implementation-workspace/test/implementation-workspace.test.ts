import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { EvidenceEnvelope } from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  ComponentSpecEvidencePayloadSchema,
  type ComponentSpecEvidencePayload,
} from "@mimera/component-spec";
import { PolicyApprovalRequiredError } from "@mimera/project-tools";
import {
  ImplementationComponentMismatchError,
  ImplementationWorkspaceService,
} from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function genericEvidence(id: string, kind: string, index: number): EvidenceEnvelope {
  return {
    id,
    payload: { kind },
    trust: "trusted-system",
    capturedAt: `2026-07-27T10:00:0${index}.000Z`,
    contentHash: index.toString(16).repeat(64).slice(0, 64),
  };
}

async function specifiedProject(): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-implementation-"));
  directories.push(root);
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: "2026-07-27T10:00:00.000Z",
  });
  await project.advance("PREFLIGHT", "preflight-service");
  await project.completeStage("PROJECT_PROFILED", [genericEvidence("profile", "project-profile", 1)], {
    actor: "project-inspector",
  });
  await project.completeStage("REFERENCE_AUTHORIZED", [genericEvidence("authorization", "reference-authorization", 2)], {
    actor: "reference-authorization-service",
  });
  await project.completeStage("REFERENCE_CAPTURED", [{
    ...genericEvidence("capture", "capture", 3),
    trust: "untrusted-reference",
    sourceUrl: "https://example.com",
  }], { actor: "reference-capture-service" });
  await project.completeStage("PAGE_DECOMPOSED", [genericEvidence("decomposition", "page-decomposition", 4)], {
    actor: "design-analysis-service",
  });

  const payload: ComponentSpecEvidencePayload = ComponentSpecEvidencePayloadSchema.parse({
    schemaVersion: "1",
    kind: "component-spec",
    generatedAt: "2026-07-27T10:00:05.000Z",
    data: {
      id: "navbar",
      pageId: "home",
      name: "navbar",
      boundaries: { selectorHints: ['[data-component="navbar"]'] },
      evidenceIds: ["decomposition"],
      responsiveContract: {
        viewports: [{ width: 390, height: 844 }, { width: 1440, height: 900 }],
        rules: ["navigation-collapses-to-menu"],
      },
      interactionContract: {
        states: ["desktop-navigation-visible", "mobile-menu-control-visible"],
        keyboardRequirements: ["Escape closes the mobile navigation"],
        pointerRequirements: ["Menu trigger toggles the mobile navigation"],
      },
      brandMapping: {
        tokenMappings: {},
        preserveExistingIdentity: true,
        notes: [],
      },
      acceptanceCriteria: [{
        id: "visual-fidelity",
        description: "Match the observed navbar geometry",
        kind: "visual",
        required: true,
      }],
      targetFiles: ["src/components/Navbar.tsx"],
      dependencies: ["react"],
      status: "specified",
    },
    writeScope: {
      targetRoot: root,
      targetFiles: ["src/components/Navbar.tsx"],
      allowedOrigins: ["https://example.com"],
      allowedCommands: ["bun --version"],
      grantedPackPermissions: [
        "evidence:read",
        "spec:read",
        "project:read",
        "project:write-scoped",
        "shell:declared-commands",
      ],
      policyVersion: "1",
    },
  });
  const hash = "a".repeat(64);
  await project.completeStage("COMPONENT_SPECIFIED", [{
    id: "component-spec-navbar",
    payload,
    trust: "trusted-system",
    capturedAt: payload.generatedAt,
    contentHash: hash,
  }], {
    actor: "component-specification-service",
    sessionPatch: { currentPageId: "home", currentComponentId: "navbar" },
  });
  return project;
}

test("opens a guarded implementation workspace and persists tool audits", async () => {
  const project = await specifiedProject();
  const service = new ImplementationWorkspaceService();
  const auditBefore = project.status().auditEventCount;

  const workspace = await service.begin(project, {
    componentId: "navbar",
    agentId: "component-builder",
  });
  const write = await workspace.tools.writeFile(
    "src/components/Navbar.tsx",
    "export function Navbar() { return null; }\n",
  );
  const command = await workspace.tools.runCommand("bun", ["--version"]);

  expect(workspace.session.status).toBe("IMPLEMENTING");
  expect(project.currentSession().status).toBe("IMPLEMENTING");
  expect(write.relativePath).toBe("src/components/Navbar.tsx");
  expect(await readFile(join(project.config.targetRoot, write.relativePath), "utf8")).toContain("Navbar");
  expect(command.exitCode).toBe(0);
  expect(project.status().auditEventCount).toBeGreaterThan(auditBefore);

  const repeated = await service.begin(project, {
    componentId: "navbar",
    agentId: "component-builder",
  });
  expect(repeated.session.version).toBe(workspace.session.version);
  project.close();
});

test("keeps out-of-scope writes behind an approval gate", async () => {
  const project = await specifiedProject();
  const workspace = await new ImplementationWorkspaceService().begin(project, {
    componentId: "navbar",
    agentId: "component-builder",
  });

  await expect(
    workspace.tools.writeFile("src/components/Hero.tsx", "export {};\n"),
  ).rejects.toBeInstanceOf(PolicyApprovalRequiredError);
  await expect(stat(join(project.config.targetRoot, "src/components/Hero.tsx"))).rejects.toMatchObject({
    code: "ENOENT",
  });
  project.close();
});

test("rejects a builder that requests a different component", async () => {
  const project = await specifiedProject();

  await expect(
    new ImplementationWorkspaceService().begin(project, {
      componentId: "hero",
      agentId: "component-builder",
    }),
  ).rejects.toBeInstanceOf(ImplementationComponentMismatchError);
  expect(project.currentSession().status).toBe("COMPONENT_SPECIFIED");
  project.close();
});
