import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { EvidenceEnvelope } from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  ComponentSpecEvidencePayloadSchema,
  type ComponentSpecEvidencePayload,
} from "@mimera/component-spec";
import {
  AGENT_DESCRIPTORS,
  AgentRegistry,
} from "@mimera/agent-runtime";
import {
  ContextCurator,
  ContextPacketEvidencePayloadSchema,
} from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function evidence(id: string, kind: string, index: number, trust: EvidenceEnvelope["trust"] = "trusted-system"): EvidenceEnvelope {
  return {
    id,
    payload: { kind },
    trust,
    capturedAt: `2026-07-27T10:00:0${index}.000Z`,
    contentHash: index.toString(16).repeat(64).slice(0, 64),
  };
}

async function specifiedProject(): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-context-curator-"));
  directories.push(root);
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  await project.advance("PREFLIGHT", "preflight-service");
  await project.completeStage("PROJECT_PROFILED", [evidence("project-profile", "project-profile", 1)], {
    actor: "project-inspector",
  });
  await project.completeStage("REFERENCE_AUTHORIZED", [evidence("reference-authorization", "reference-authorization", 2, "trusted-user")], {
    actor: "reference-authorization-service",
  });
  await project.completeStage("REFERENCE_CAPTURED", [
    evidence("dom-desktop", "dom", 3, "untrusted-reference"),
    evidence("dom-mobile", "dom", 4, "untrusted-reference"),
    evidence("screenshot-desktop", "screenshot", 5, "untrusted-reference"),
    evidence("screenshot-mobile", "screenshot", 6, "untrusted-reference"),
  ], { actor: "reference-capture-service" });
  await project.completeStage("PAGE_DECOMPOSED", [
    evidence("design-dna", "design-dna", 7),
    evidence("page-decomposition", "page-decomposition", 8),
  ], { actor: "design-analysis-service" });

  const payload: ComponentSpecEvidencePayload = ComponentSpecEvidencePayloadSchema.parse({
    schemaVersion: "1",
    kind: "component-spec",
    generatedAt: "2026-07-27T10:00:09.000Z",
    data: {
      id: "navbar",
      pageId: "home",
      name: "navbar",
      boundaries: { selectorHints: ['[data-component="navbar"]'] },
      evidenceIds: ["dom-desktop", "dom-mobile", "design-dna", "page-decomposition"],
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
        notes: ["Preserve target identity"],
      },
      acceptanceCriteria: [{
        id: "accessibility",
        description: "Use semantic navigation and keyboard access",
        kind: "accessibility",
        required: true,
      }],
      targetFiles: ["src/components/Navbar.tsx", "src/components/Navbar.test.tsx"],
      dependencies: ["react"],
      status: "specified",
    },
    writeScope: {
      targetRoot: root,
      targetFiles: ["src/components/Navbar.tsx", "src/components/Navbar.test.tsx"],
      allowedOrigins: ["https://example.com"],
      allowedCommands: ["bun test"],
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
  await project.completeStage("COMPONENT_SPECIFIED", [{
    id: "component-spec-navbar",
    payload,
    trust: "trusted-system",
    capturedAt: payload.generatedAt,
    contentHash: "a".repeat(64),
  }], {
    actor: "component-specification-service",
    sessionPatch: { currentPageId: "home", currentComponentId: "navbar" },
  });
  return project;
}

const registry = new AgentRegistry(AGENT_DESCRIPTORS);

test("creates and persists a minimal scoped builder context packet", async () => {
  const project = await specifiedProject();
  const curator = new ContextCurator({
    registry,
    now: () => "2026-07-27T10:10:00.000Z",
  });

  const result = curator.create(project, {
    agentId: "component-builder",
    assignment: "Implement the approved navbar structure and styling",
  });

  expect(result.packet.agentId).toBe("component-builder");
  expect(result.packet.componentId).toBe("navbar");
  expect(result.packet.toolGrant.profile).toBe("scoped-builder");
  expect(result.packet.toolGrant.targetFiles).toEqual([
    "src/components/Navbar.tsx",
    "src/components/Navbar.test.tsx",
  ]);
  expect(result.packet.toolGrant.allowedCommands).toEqual(["bun test"]);
  expect(result.packet.evidenceRefs).toEqual(
    expect.arrayContaining(["component-spec-navbar", "design-dna", "dom-desktop", "dom-mobile"]),
  );
  expect(result.packet.constraints).toEqual(
    expect.arrayContaining(["Write only the approved target files", "Use semantic navigation and keyboard access"]),
  );
  expect(result.packet).not.toHaveProperty("conversationHistory");
  expect(result.trustedScope.targetFiles).toEqual(result.packet.toolGrant.targetFiles);

  const stored = project.listEvidence<unknown>().map((item) =>
    ContextPacketEvidencePayloadSchema.safeParse(item.payload),
  ).find((parsed) => parsed.success);
  expect(stored?.success).toBe(true);
  project.close();
});

test("creates a read-only visual review packet without project write grants", async () => {
  const project = await specifiedProject();
  const result = new ContextCurator({ registry }).create(project, {
    agentId: "visual-reviewer",
    assignment: "Compare target and reference navbar captures",
  });

  expect(result.packet.toolGrant.profile).toBe("visual-review");
  expect(result.packet.toolGrant.targetFiles).toEqual([]);
  expect(result.packet.toolGrant.allowedCommands).toEqual([]);
  expect(result.trustedScope.grantedPackPermissions).not.toContain("project:write-scoped");
  expect(result.packet.evidenceRefs).toEqual(
    expect.arrayContaining(["screenshot-desktop", "screenshot-mobile", "design-dna"]),
  );
  project.close();
});
