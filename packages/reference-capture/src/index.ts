import { join } from "node:path";
import type { ReferenceSession, TrustedScope } from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  BrowserLab,
  type PageCaptureResult,
  type ViewportProfile,
} from "@mimera/browser-lab";
import {
  OriginRateLimiter,
  ReferencePolicy,
  RobotsPolicyClient,
  type FetchLike,
} from "@mimera/reference-policy";

export class ReferenceCaptureStateError extends Error {
  readonly status: ReferenceSession["status"];

  constructor(status: ReferenceSession["status"]) {
    super(`Reference capture requires REFERENCE_AUTHORIZED, current status is ${status}`);
    this.name = "ReferenceCaptureStateError";
    this.status = status;
  }
}

export interface ReferenceCaptureServiceOptions {
  allowHttp?: boolean;
  allowLoopback?: boolean;
  minimumIntervalMs?: number;
  robotsFetch?: FetchLike;
  headless?: boolean;
}

export interface ReferenceCaptureInput {
  url: string;
  viewports: ViewportProfile[];
}

export interface ReferenceCaptureOutput {
  captureId: string;
  outputDirectory: string;
  capture: PageCaptureResult;
  session: ReferenceSession;
}

function allowedOrigins(session: ReferenceSession): string[] {
  return [...new Set(session.referenceUrls.map((url) => new URL(url).origin))];
}

function captureScope(
  project: MimeraProject,
  origins: string[],
): TrustedScope {
  return {
    targetRoot: project.config.targetRoot,
    targetFiles: [],
    allowedOrigins: origins,
    allowedCommands: [],
    grantedPackPermissions: [
      "browser:observe",
      "network:declared-origins",
      "evidence:write",
    ],
    policyVersion: project.config.policyVersion,
  };
}

export class ReferenceCaptureService {
  readonly #options: ReferenceCaptureServiceOptions;

  constructor(options: ReferenceCaptureServiceOptions = {}) {
    this.#options = options;
  }

  async capture(
    project: MimeraProject,
    input: ReferenceCaptureInput,
  ): Promise<ReferenceCaptureOutput> {
    const current = project.currentSession();
    if (current.status !== "REFERENCE_AUTHORIZED") {
      throw new ReferenceCaptureStateError(current.status);
    }

    const origins = allowedOrigins(current);
    const policy = new ReferencePolicy({
      allowedOrigins: origins,
      allowHttp: this.#options.allowHttp ?? false,
      allowLoopback: this.#options.allowLoopback ?? false,
    });
    const robots = new RobotsPolicyClient({
      ...(this.#options.robotsFetch ? { fetch: this.#options.robotsFetch } : {}),
    });
    const rateLimiter = new OriginRateLimiter({
      minimumIntervalMs: this.#options.minimumIntervalMs ?? 500,
    });
    const lab = new BrowserLab({
      policy,
      robots,
      rateLimiter,
      headless: this.#options.headless ?? true,
    });
    const captureId = crypto.randomUUID();
    const outputDirectory = join(
      project.paths.stateDirectory,
      "evidence",
      current.id,
      captureId,
    );

    try {
      const capture = await lab.capturePage({
        sessionId: current.id,
        host: current.host,
        trustedScope: captureScope(project, origins),
        url: input.url,
        outputDirectory,
        viewports: input.viewports,
      });
      const session = await project.completeReferenceCapture(capture.evidence, {
        actor: "reference-capture-service",
        correlationId: captureId,
      });
      return {
        captureId,
        outputDirectory,
        capture,
        session,
      };
    } finally {
      await lab.close();
    }
  }
}
