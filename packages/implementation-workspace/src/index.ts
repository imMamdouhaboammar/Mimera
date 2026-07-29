import {
  ComponentSpecEvidencePayloadSchema,
  type ComponentSpecEvidencePayload,
} from "@mimera/component-spec";
import type {
  ComponentSpec,
  ReferenceSession,
  TrustedScope,
} from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  createCommandPolicyHook,
  createWriteScopeHook,
} from "@mimera/hooks";
import { SafeProjectTools } from "@mimera/project-tools";

export class ImplementationWorkspaceStateError extends Error {
  readonly status: ReferenceSession["status"];

  constructor(status: ReferenceSession["status"]) {
    super(`Implementation workspace requires COMPONENT_SPECIFIED or IMPLEMENTING, current status is ${status}`);
    this.name = "ImplementationWorkspaceStateError";
    this.status = status;
  }
}

export class ImplementationComponentMismatchError extends Error {
  readonly requestedComponentId: string;
  readonly activeComponentId: string | undefined;

  constructor(requestedComponentId: string, activeComponentId: string | undefined) {
    super(
      activeComponentId
        ? `Requested component ${requestedComponentId} does not match active component ${activeComponentId}`
        : `Requested component ${requestedComponentId} has no active session component`,
    );
    this.name = "ImplementationComponentMismatchError";
    this.requestedComponentId = requestedComponentId;
    this.activeComponentId = activeComponentId;
  }
}

export class ImplementationSpecificationMissingError extends Error {
  constructor(componentId: string) {
    super(`Stored component specification is missing for ${componentId}`);
    this.name = "ImplementationSpecificationMissingError";
  }
}

export class ImplementationScopeMismatchError extends Error {
  constructor() {
    super("Stored component write scope does not match the active project root");
    this.name = "ImplementationScopeMismatchError";
  }
}

export interface BeginImplementationInput {
  componentId: string;
  agentId: string;
}

export interface ImplementationWorkspace {
  session: ReferenceSession;
  spec: ComponentSpec;
  writeScope: TrustedScope;
  tools: SafeProjectTools;
}

function normalizeComponentId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findSpecification(
  project: MimeraProject,
  componentId: string,
): ComponentSpecEvidencePayload {
  for (const item of project.listEvidence<unknown>()) {
    const parsed = ComponentSpecEvidencePayloadSchema.safeParse(item.payload);
    if (parsed.success && parsed.data.data.id === componentId) return parsed.data;
  }
  throw new ImplementationSpecificationMissingError(componentId);
}

export class ImplementationWorkspaceService {
  async begin(
    project: MimeraProject,
    input: BeginImplementationInput,
  ): Promise<ImplementationWorkspace> {
    let session = project.currentSession();
    if (session.status !== "COMPONENT_SPECIFIED" && session.status !== "IMPLEMENTING") {
      throw new ImplementationWorkspaceStateError(session.status);
    }

    const componentId = normalizeComponentId(input.componentId);
    if (!componentId || session.currentComponentId !== componentId) {
      throw new ImplementationComponentMismatchError(componentId || input.componentId, session.currentComponentId);
    }

    const stored = findSpecification(project, componentId);
    if (stored.writeScope.targetRoot !== project.config.targetRoot) {
      throw new ImplementationScopeMismatchError();
    }

    if (session.status === "COMPONENT_SPECIFIED") {
      session = await project.advance("IMPLEMENTING", "implementation-workspace-service", {
        correlationId: crypto.randomUUID(),
      });
    }

    const hookRunner = project.createHookRunner([
      createWriteScopeHook(),
      createCommandPolicyHook(),
    ]);
    const tools = new SafeProjectTools({
      sessionId: session.id,
      componentId,
      agentId: input.agentId,
      host: session.host,
      trustedScope: stored.writeScope,
      hookRunner,
    });

    return {
      session,
      spec: stored.data,
      writeScope: stored.writeScope,
      tools,
    };
  }
}

export * from "./review-aggregator.ts";
