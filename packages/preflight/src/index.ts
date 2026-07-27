import { createHash } from "node:crypto";
import type {
  EvidenceEnvelope,
  ReferenceSession,
} from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  ProjectProfileSchema,
  inspectProject,
  type ProjectProfile,
} from "@mimera/project-inspector";

interface ProjectProfileEvidencePayload {
  kind: "project-profile";
  profile: ProjectProfile;
}

interface ReferenceAuthorizationEvidencePayload {
  kind: "reference-authorization";
  mode: ReferenceSession["mode"];
  referenceUrls: string[];
  highFidelityAuthorization?: ReferenceSession["highFidelityAuthorization"];
}

type PreflightEvidencePayload =
  | ProjectProfileEvidencePayload
  | ReferenceAuthorizationEvidencePayload;

export class PreflightStateError extends Error {
  readonly status: ReferenceSession["status"];

  constructor(status: ReferenceSession["status"]) {
    super(`Preflight cannot run from session status ${status}`);
    this.name = "PreflightStateError";
    this.status = status;
  }
}

export class ProjectProfileEvidenceMissingError extends Error {
  constructor() {
    super("Project profile evidence is missing from the current session");
    this.name = "ProjectProfileEvidenceMissingError";
  }
}

export interface PreflightServiceOptions {
  now?: () => string;
}

export interface PreflightResult {
  session: ReferenceSession;
  profile: ProjectProfile;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      );
    }
    return item;
  });
}

function evidence<T extends PreflightEvidencePayload>(
  payload: T,
  trust: EvidenceEnvelope<T>["trust"],
  capturedAt: string,
): EvidenceEnvelope<T> {
  const serialized = stableJson(payload);
  const contentHash = createHash("sha256").update(serialized).digest("hex");
  return {
    id: `${payload.kind}-${contentHash.slice(0, 16)}`,
    payload,
    trust,
    capturedAt,
    contentHash,
  };
}

function profileFromEvidence(project: MimeraProject): ProjectProfile {
  const item = project
    .listEvidence<PreflightEvidencePayload>()
    .find((candidate) => candidate.payload.kind === "project-profile");
  if (!item || item.payload.kind !== "project-profile") {
    throw new ProjectProfileEvidenceMissingError();
  }
  return ProjectProfileSchema.parse(item.payload.profile);
}

export class PreflightService {
  readonly #now: () => string;

  constructor(options: PreflightServiceOptions = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async prepare(project: MimeraProject): Promise<PreflightResult> {
    let session = project.currentSession();
    if (session.status === "REFERENCE_AUTHORIZED") {
      return { session, profile: profileFromEvidence(project) };
    }
    if (!["CREATED", "PREFLIGHT", "PROJECT_PROFILED"].includes(session.status)) {
      throw new PreflightStateError(session.status);
    }

    if (session.status === "CREATED") {
      session = await project.advance("PREFLIGHT", "preflight-service", {
        correlationId: crypto.randomUUID(),
        now: this.#now(),
      });
    }

    let profile: ProjectProfile;
    if (session.status === "PREFLIGHT") {
      profile = await inspectProject(project.config.targetRoot, { now: this.#now() });
      session = await project.completeStage(
        "PROJECT_PROFILED",
        [
          evidence<ProjectProfileEvidencePayload>(
            { kind: "project-profile", profile },
            "trusted-system",
            this.#now(),
          ),
        ],
        {
          actor: "project-inspector",
          correlationId: crypto.randomUUID(),
          now: this.#now(),
        },
      );
    } else {
      profile = profileFromEvidence(project);
    }

    if (session.status === "PROJECT_PROFILED") {
      const authorizationPayload: ReferenceAuthorizationEvidencePayload = {
        kind: "reference-authorization",
        mode: session.mode,
        referenceUrls: [...session.referenceUrls],
        ...(session.highFidelityAuthorization
          ? { highFidelityAuthorization: session.highFidelityAuthorization }
          : {}),
      };
      session = await project.completeStage(
        "REFERENCE_AUTHORIZED",
        [evidence(authorizationPayload, "trusted-user", this.#now())],
        {
          actor: "reference-authorization-service",
          correlationId: crypto.randomUUID(),
          now: this.#now(),
        },
      );
    }

    return { session, profile };
  }
}
