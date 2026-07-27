import { createHash } from "node:crypto";
import {
  BrowserDomEvidencePayloadSchema,
  type BrowserDomEvidencePayload,
} from "@mimera/browser-lab";
import {
  ComponentSpecSchema,
  TrustedScopeSchema,
  type ComponentSpec,
  type EvidenceEnvelope,
  type ReferenceSession,
  type TrustedScope,
} from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  DesignDnaEvidencePayloadSchema,
  PageDecompositionEvidencePayloadSchema,
  type DesignDna,
  type PageComponentHypothesis,
  type PageDecomposition,
} from "@mimera/design-dna";
import {
  ProjectProfileSchema,
  type ProjectProfile,
} from "@mimera/project-inspector";
import { z } from "zod";

const ProjectProfileEvidencePayloadSchema = z.object({
  kind: z.literal("project-profile"),
  profile: ProjectProfileSchema,
});

export const ComponentSpecEvidencePayloadSchema = z.object({
  schemaVersion: z.literal("1"),
  kind: z.literal("component-spec"),
  generatedAt: z.string().datetime({ offset: true }),
  data: ComponentSpecSchema,
  writeScope: TrustedScopeSchema,
});
export type ComponentSpecEvidencePayload = z.infer<typeof ComponentSpecEvidencePayloadSchema>;

export class ComponentSpecificationStateError extends Error {
  readonly status: ReferenceSession["status"];

  constructor(status: ReferenceSession["status"]) {
    super(`Component specification requires PAGE_DECOMPOSED, current status is ${status}`);
    this.name = "ComponentSpecificationStateError";
    this.status = status;
  }
}

export class ComponentNotFoundError extends Error {
  readonly componentId: string;

  constructor(componentId: string) {
    super(`Component ${componentId} is not present in the page decomposition`);
    this.name = "ComponentNotFoundError";
    this.componentId = componentId;
  }
}

export class ComponentSpecificationEvidenceMissingError extends Error {
  constructor(message = "Required design or project evidence is missing") {
    super(message);
    this.name = "ComponentSpecificationEvidenceMissingError";
  }
}

export class StoredComponentSpecificationMissingError extends Error {
  constructor(componentId: string) {
    super(`The session is COMPONENT_SPECIFIED but no stored specification exists for ${componentId}`);
    this.name = "StoredComponentSpecificationMissingError";
  }
}

export interface ComponentSpecificationServiceOptions {
  now?: () => string;
}

export interface SpecifyComponentInput {
  componentId: string;
}

export interface ComponentSpecificationOutput {
  session: ReferenceSession;
  spec: ComponentSpec;
  writeScope: TrustedScope;
}

interface AnalysisEvidence {
  dna: DesignDna;
  dnaEvidenceId: string;
  decomposition: PageDecomposition;
  decompositionEvidenceId: string;
  profile: ProjectProfile;
  profileEvidenceId: string;
  viewportPayloads: BrowserDomEvidencePayload[];
}

function canonicalize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && typeof item !== "function" && typeof item !== "symbol")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "component";
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("") || "Component";
}

function pageId(sourceUrl: string): string {
  const pathname = new URL(sourceUrl).pathname.replace(/^\/+|\/+$/g, "");
  return pathname ? slug(pathname) : "home";
}

function readAnalysisEvidence(project: MimeraProject): AnalysisEvidence {
  let dna: DesignDna | undefined;
  let dnaEvidenceId: string | undefined;
  let decomposition: PageDecomposition | undefined;
  let decompositionEvidenceId: string | undefined;
  let profile: ProjectProfile | undefined;
  let profileEvidenceId: string | undefined;
  const viewportPayloads: BrowserDomEvidencePayload[] = [];

  for (const item of project.listEvidence<unknown>()) {
    const dnaPayload = DesignDnaEvidencePayloadSchema.safeParse(item.payload);
    if (dnaPayload.success) {
      dna = dnaPayload.data.data;
      dnaEvidenceId = item.id;
    }

    const decompositionPayload = PageDecompositionEvidencePayloadSchema.safeParse(item.payload);
    if (decompositionPayload.success) {
      decomposition = decompositionPayload.data.data;
      decompositionEvidenceId = item.id;
    }

    const profilePayload = ProjectProfileEvidencePayloadSchema.safeParse(item.payload);
    if (profilePayload.success) {
      profile = profilePayload.data.profile;
      profileEvidenceId = item.id;
    }

    const browserPayload = BrowserDomEvidencePayloadSchema.safeParse(item.payload);
    if (browserPayload.success) viewportPayloads.push(browserPayload.data);
  }

  if (!dna || !dnaEvidenceId || !decomposition || !decompositionEvidenceId) {
    throw new ComponentSpecificationEvidenceMissingError("Design analysis evidence is missing");
  }
  if (!profile || !profileEvidenceId) {
    throw new ComponentSpecificationEvidenceMissingError("Project profile evidence is missing");
  }
  if (viewportPayloads.length === 0) {
    throw new ComponentSpecificationEvidenceMissingError("Viewport DOM evidence is missing");
  }

  return {
    dna,
    dnaEvidenceId,
    decomposition,
    decompositionEvidenceId,
    profile,
    profileEvidenceId,
    viewportPayloads,
  };
}

function targetFiles(component: PageComponentHypothesis, profile: ProjectProfile): string[] {
  const name = pascalCase(component.name || component.id);
  const frameworks = new Set(profile.frameworks);
  if (frameworks.has("vue")) {
    return [`src/components/${name}.test.ts`, `src/components/${name}.vue`].sort();
  }
  if (frameworks.has("svelte") || frameworks.has("sveltekit")) {
    return [`src/components/${name}.svelte`, `src/components/${name}.test.ts`].sort();
  }
  if (frameworks.has("react") || frameworks.has("next") || frameworks.has("remix")) {
    return [
      `src/components/${name}.module.css`,
      `src/components/${name}.test.tsx`,
      `src/components/${name}.tsx`,
    ].sort();
  }
  return [
    `src/components/${name}.css`,
    `src/components/${name}.test.ts`,
    `src/components/${name}.ts`,
  ].sort();
}

function allowedCommands(profile: ProjectProfile): string[] {
  const commands = new Set<string>();
  const runner = profile.packageManager === "bun" ? "bun" : profile.packageManager;
  if (profile.scripts.build) commands.add(`${runner} run build`);
  if (profile.scripts.test) {
    commands.add(profile.packageManager === "bun" ? "bun test" : `${runner} test`);
  }
  return [...commands].sort();
}

function relevantRules(component: PageComponentHypothesis, dna: DesignDna): string[] {
  const terms = new Set([
    component.id.toLowerCase(),
    component.name.toLowerCase(),
    component.kind.toLowerCase(),
  ]);
  if (component.kind === "navbar" || component.kind === "navigation") {
    terms.add("nav");
    terms.add("menu");
  }
  return [...new Set(
    dna.responsiveRules
      .filter((rule) => {
        const identity = rule.identity.toLowerCase();
        if (component.kind === "navbar" && rule.type === "navigation-collapses-to-menu") return true;
        return [...terms].some((term) => identity.includes(term));
      })
      .map((rule) => rule.type),
  )].sort();
}

function interactionStates(component: PageComponentHypothesis, rules: readonly string[]): string[] {
  if (
    (component.kind === "navbar" || component.kind === "navigation") &&
    rules.includes("navigation-collapses-to-menu")
  ) {
    return ["desktop-navigation-visible", "mobile-menu-control-visible"];
  }
  return ["default-visible"];
}

function acceptanceCriteria(component: PageComponentHypothesis): ComponentSpec["acceptanceCriteria"] {
  const criteria: ComponentSpec["acceptanceCriteria"] = [
    {
      id: "visual-fidelity",
      description: `Match the observed ${component.name} geometry, spacing, hierarchy, and visual weight at each captured viewport.`,
      kind: "visual",
      required: true,
    },
    {
      id: "responsive-behavior",
      description: "Preserve the observed transformation between desktop and mobile without horizontal overflow.",
      kind: "responsive",
      required: true,
    },
    {
      id: "accessibility",
      description: "Use semantic navigation, visible focus, keyboard-operable controls, and accurate accessible names.",
      kind: "accessibility",
      required: true,
    },
    {
      id: "code-architecture",
      description: "Keep the component modular, typed, locally scoped, and aligned with the target repository conventions.",
      kind: "code",
      required: true,
    },
    {
      id: "performance",
      description: "Do not add blocking assets or unnecessary runtime dependencies for this component.",
      kind: "performance",
      required: true,
    },
  ];
  if (component.kind === "navbar" || component.kind === "navigation") {
    criteria.splice(2, 0, {
      id: "interaction-contract",
      description: "The navigation trigger, open state, close state, Escape handling, and focus return must be testable.",
      kind: "interaction",
      required: true,
    });
  }
  return criteria;
}

function buildSpec(
  component: PageComponentHypothesis,
  analysis: AnalysisEvidence,
): ComponentSpec {
  const viewports = [...new Map(
    analysis.viewportPayloads.map((payload) => [
      `${payload.viewport.width}x${payload.viewport.height}`,
      { width: payload.viewport.width, height: payload.viewport.height },
    ]),
  ).values()].sort((left, right) => left.width - right.width || left.height - right.height);
  const rules = relevantRules(component, analysis.dna);
  const evidenceIds = [...new Set([
    analysis.profileEvidenceId,
    analysis.dnaEvidenceId,
    analysis.decompositionEvidenceId,
    ...component.evidenceIds,
  ])].sort();
  const firstEvidenceId = evidenceIds[0];
  const lastEvidenceId = evidenceIds.at(-1);

  return ComponentSpecSchema.parse({
    id: component.id,
    pageId: pageId(analysis.decomposition.sourceUrl),
    name: component.name,
    boundaries: {
      selectorHints: [...new Set([
        component.domPath,
        `[data-component="${component.id}"]`,
      ])],
      ...(firstEvidenceId ? { startEvidenceId: firstEvidenceId } : {}),
      ...(lastEvidenceId ? { endEvidenceId: lastEvidenceId } : {}),
    },
    evidenceIds,
    responsiveContract: { viewports, rules },
    interactionContract: {
      states: interactionStates(component, rules),
      keyboardRequirements:
        component.kind === "navbar" || component.kind === "navigation"
          ? [
              "Menu trigger is keyboard operable",
              "Escape closes the mobile navigation",
              "Focus returns to the menu trigger after close",
            ]
          : [],
      pointerRequirements:
        component.kind === "navbar" || component.kind === "navigation"
          ? ["Menu trigger toggles the mobile navigation"]
          : [],
    },
    brandMapping: {
      tokenMappings: {},
      preserveExistingIdentity: true,
      notes: [
        "Use the target product typography, colors, logo, imagery, and content.",
        "Adapt the reference composition and behavior without copying protected assets or text.",
      ],
    },
    acceptanceCriteria: acceptanceCriteria(component),
    targetFiles: targetFiles(component, analysis.profile),
    dependencies: [...analysis.profile.frameworks].sort(),
    status: "specified",
  });
}

function createWriteScope(
  project: MimeraProject,
  session: ReferenceSession,
  spec: ComponentSpec,
  profile: ProjectProfile,
): TrustedScope {
  return TrustedScopeSchema.parse({
    targetRoot: project.config.targetRoot,
    targetFiles: spec.targetFiles,
    allowedOrigins: [...new Set(session.referenceUrls.map((url) => new URL(url).origin))].sort(),
    allowedCommands: allowedCommands(profile),
    grantedPackPermissions: [
      "evidence:read",
      "spec:read",
      "spec:write",
      "project:read",
      "project:write-scoped",
      "shell:declared-commands",
    ],
    policyVersion: project.config.policyVersion,
  });
}

function readStoredSpecification(
  project: MimeraProject,
  componentId: string,
): ComponentSpecificationOutput {
  for (const item of project.listEvidence<unknown>()) {
    const parsed = ComponentSpecEvidencePayloadSchema.safeParse(item.payload);
    if (parsed.success && parsed.data.data.id === componentId) {
      return {
        session: project.currentSession(),
        spec: parsed.data.data,
        writeScope: parsed.data.writeScope,
      };
    }
  }
  throw new StoredComponentSpecificationMissingError(componentId);
}

export class ComponentSpecificationService {
  readonly #now: () => string;

  constructor(options: ComponentSpecificationServiceOptions = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async specify(
    project: MimeraProject,
    input: SpecifyComponentInput,
  ): Promise<ComponentSpecificationOutput> {
    const componentId = slug(input.componentId);
    const current = project.currentSession();
    if (current.status === "COMPONENT_SPECIFIED") {
      return readStoredSpecification(project, componentId);
    }
    if (current.status !== "PAGE_DECOMPOSED") {
      throw new ComponentSpecificationStateError(current.status);
    }

    const analysis = readAnalysisEvidence(project);
    const component = analysis.decomposition.components.find((candidate) => candidate.id === componentId);
    if (!component) throw new ComponentNotFoundError(componentId);

    const spec = buildSpec(component, analysis);
    const writeScope = createWriteScope(project, current, spec, analysis.profile);
    const generatedAt = this.#now();
    const payload: ComponentSpecEvidencePayload = {
      schemaVersion: "1",
      kind: "component-spec",
      generatedAt,
      data: spec,
      writeScope,
    };
    const contentHash = hash(payload);
    const evidence: EvidenceEnvelope<ComponentSpecEvidencePayload> = {
      id: `component-spec-${spec.id}-${contentHash.slice(0, 16)}`,
      payload,
      trust: "trusted-system",
      capturedAt: generatedAt,
      contentHash,
    };
    const session = await project.completeStage(
      "COMPONENT_SPECIFIED",
      [evidence],
      {
        actor: "component-specification-service",
        correlationId: crypto.randomUUID(),
        now: generatedAt,
        sessionPatch: {
          currentPageId: spec.pageId,
          currentComponentId: spec.id,
        },
      },
    );

    return { session, spec, writeScope };
  }
}
