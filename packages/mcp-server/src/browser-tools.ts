import { isAbsolute, resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BrowserDownloadDeniedError,
  type CaptureArtifact,
  type ViewportCapture,
} from "@mimera/browser-lab";
import {
  MimeraProject,
  ProjectNotInitializedError,
} from "@mimera/core";
import {
  ReferenceCaptureService,
  ReferenceCaptureStateError,
} from "@mimera/reference-capture";
import { NavigationDeniedError, RobotsDeniedError } from "@mimera/reference-policy";
import { z } from "zod";

export const BROWSER_OPEN_REFERENCE_TOOL = "browser.open_reference" as const;

const projectCaptureTails = new Map<string, Promise<void>>();

async function serializeProjectCapture<T>(
  targetRoot: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = projectCaptureTails.get(targetRoot) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const tail = current.then(() => undefined, () => undefined);
  projectCaptureTails.set(targetRoot, tail);

  try {
    return await current;
  } finally {
    if (projectCaptureTails.get(targetRoot) === tail) {
      projectCaptureTails.delete(targetRoot);
    }
  }
}

const ViewportInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Viewport id must be lowercase and path-safe"),
  width: z.number().int().min(240).max(4096),
  height: z.number().int().min(240).max(4096),
  isMobile: z.boolean(),
  deviceScaleFactor: z.number().min(0.5).max(4).optional(),
}).strict();

const ProjectRootSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine(isAbsolute, "targetRoot must be an absolute path");

export const BrowserOpenReferenceInputSchema = z.object({
  url: z
    .string()
    .url()
    .max(4096)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "url must use HTTP or HTTPS"),
  viewports: z
    .array(ViewportInputSchema)
    .min(1)
    .max(4)
    .refine(
      (viewports) => new Set(viewports.map((viewport) => viewport.id)).size === viewports.length,
      "Viewport ids must be unique",
    ),
}).strict();

export type BrowserOpenReferenceInput = z.infer<typeof BrowserOpenReferenceInputSchema>;

const ArtifactReferenceSchema = z.object({
  path: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
}).strict();

type ArtifactReference = z.infer<typeof ArtifactReferenceSchema>;

const BrowserCaptureSummarySchema = z.object({
  viewport: ViewportInputSchema,
  finalUrl: z.string().url(),
  title: z.string(),
  artifacts: z.object({
    screenshot: ArtifactReferenceSchema,
    dom: ArtifactReferenceSchema,
    network: ArtifactReferenceSchema,
    trace: ArtifactReferenceSchema,
  }).strict(),
}).strict();

type BrowserCaptureSummary = z.infer<typeof BrowserCaptureSummarySchema>;

export const BrowserOpenReferenceSuccessSchema = z.object({
  schemaVersion: z.literal("1"),
  ok: z.literal(true),
  tool: z.literal(BROWSER_OPEN_REFERENCE_TOOL),
  captureId: z.string().uuid(),
  sessionId: z.string().uuid(),
  status: z.literal("REFERENCE_CAPTURED"),
  requestedUrl: z.string().url(),
  capturedAt: z.string().datetime({ offset: true }),
  outputDirectory: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  captures: z.array(BrowserCaptureSummarySchema).min(1).max(4),
}).strict();

export type BrowserOpenReferenceSuccess = z.infer<typeof BrowserOpenReferenceSuccessSchema>;

export const BrowserToolFailureSchema = z.object({
  schemaVersion: z.literal("1"),
  ok: z.literal(false),
  tool: z.literal(BROWSER_OPEN_REFERENCE_TOOL),
  error: z.object({
    name: z.enum([
      "NavigationDeniedError",
      "RobotsDeniedError",
      "BrowserDownloadDeniedError",
      "ReferenceCaptureStateError",
      "ProjectNotInitializedError",
      "BrowserToolError",
    ]),
    reasonCode: z.enum([
      "URL_INVALID",
      "URL_CREDENTIALS_BLOCKED",
      "PROTOCOL_BLOCKED",
      "ORIGIN_NOT_ALLOWED",
      "DNS_EMPTY",
      "PRIVATE_NETWORK_BLOCKED",
      "ROBOTS_DISALLOWED",
      "ROBOTS_UNAVAILABLE",
      "DOWNLOAD_BLOCKED",
      "REFERENCE_CAPTURE_STATE_INVALID",
      "PROJECT_NOT_INITIALIZED",
      "BROWSER_TOOL_FAILED",
    ]),
    message: z.string().min(1),
    url: z.string().url().optional(),
    status: z.string().min(1).optional(),
  }).strict(),
}).strict();

export type BrowserToolFailure = z.infer<typeof BrowserToolFailureSchema>;

const BrowserOpenReferenceResultSchema = z.union([
  BrowserOpenReferenceSuccessSchema,
  BrowserToolFailureSchema,
]);

export const BrowserOpenReferenceOutputSchema = z.object({
  schemaVersion: z.literal("1"),
  ok: z.boolean(),
  tool: z.literal(BROWSER_OPEN_REFERENCE_TOOL),
  captureId: BrowserOpenReferenceSuccessSchema.shape.captureId.optional(),
  sessionId: BrowserOpenReferenceSuccessSchema.shape.sessionId.optional(),
  status: BrowserOpenReferenceSuccessSchema.shape.status.optional(),
  requestedUrl: BrowserOpenReferenceSuccessSchema.shape.requestedUrl.optional(),
  capturedAt: BrowserOpenReferenceSuccessSchema.shape.capturedAt.optional(),
  outputDirectory: BrowserOpenReferenceSuccessSchema.shape.outputDirectory.optional(),
  evidenceIds: BrowserOpenReferenceSuccessSchema.shape.evidenceIds.optional(),
  captures: BrowserOpenReferenceSuccessSchema.shape.captures.optional(),
  error: BrowserToolFailureSchema.shape.error.optional(),
}).strict();

export interface RegisterBrowserToolsOptions {
  targetRoot: string;
  captureService?: ReferenceCaptureService;
  openProject?: (targetRoot: string) => Promise<MimeraProject>;
}

function artifactReference(artifact: CaptureArtifact): ArtifactReference {
  return {
    path: artifact.path,
    contentHash: artifact.contentHash,
    sizeBytes: artifact.sizeBytes,
  };
}

function structuredContent(
  value: BrowserOpenReferenceSuccess | BrowserToolFailure,
): Record<string, unknown> {
  const validated = BrowserOpenReferenceResultSchema.parse(value);
  return { ...BrowserOpenReferenceOutputSchema.parse(validated) };
}

function captureSummary(capture: ViewportCapture): BrowserCaptureSummary {
  return {
    viewport: { ...capture.viewport },
    finalUrl: capture.finalUrl,
    title: capture.title,
    artifacts: {
      screenshot: artifactReference(capture.artifacts.screenshot),
      dom: artifactReference(capture.artifacts.dom),
      network: artifactReference(capture.artifacts.network),
      trace: artifactReference(capture.artifacts.trace),
    },
  };
}

function genericFailure(): BrowserToolFailure {
  return {
    schemaVersion: "1",
    ok: false,
    tool: BROWSER_OPEN_REFERENCE_TOOL,
    error: {
      name: "BrowserToolError",
      reasonCode: "BROWSER_TOOL_FAILED",
      message: "Browser tool failed",
    },
  };
}

function knownFailure(error: unknown): BrowserToolFailure {
  if (error instanceof NavigationDeniedError) {
    const reasonCode = BrowserToolFailureSchema.shape.error.shape.reasonCode.safeParse(
      error.reasonCode,
    );
    if (!reasonCode.success) return genericFailure();
    return {
      schemaVersion: "1",
      ok: false,
      tool: BROWSER_OPEN_REFERENCE_TOOL,
      error: {
        name: "NavigationDeniedError",
        reasonCode: reasonCode.data,
        message: "Reference navigation was denied by policy",
        url: error.url,
      },
    };
  }
  if (error instanceof RobotsDeniedError) {
    const reasonCode = BrowserToolFailureSchema.shape.error.shape.reasonCode.safeParse(
      error.reasonCode,
    );
    if (!reasonCode.success) return genericFailure();
    return {
      schemaVersion: "1",
      ok: false,
      tool: BROWSER_OPEN_REFERENCE_TOOL,
      error: {
        name: "RobotsDeniedError",
        reasonCode: reasonCode.data,
        message: error.reasonCode === "ROBOTS_DISALLOWED"
          ? "Reference path is disallowed by robots.txt"
          : "robots.txt policy could not be verified",
        url: error.url,
      },
    };
  }
  if (error instanceof BrowserDownloadDeniedError) {
    return {
      schemaVersion: "1",
      ok: false,
      tool: BROWSER_OPEN_REFERENCE_TOOL,
      error: {
        name: "BrowserDownloadDeniedError",
        reasonCode: "DOWNLOAD_BLOCKED",
        message: "Reference download is blocked",
        url: error.url,
      },
    };
  }
  if (error instanceof ReferenceCaptureStateError) {
    return {
      schemaVersion: "1",
      ok: false,
      tool: BROWSER_OPEN_REFERENCE_TOOL,
      error: {
        name: "ReferenceCaptureStateError",
        reasonCode: "REFERENCE_CAPTURE_STATE_INVALID",
        message: "Reference capture is not available from the current state",
        status: error.status,
      },
    };
  }
  if (error instanceof ProjectNotInitializedError) {
    return {
      schemaVersion: "1",
      ok: false,
      tool: BROWSER_OPEN_REFERENCE_TOOL,
      error: {
        name: "ProjectNotInitializedError",
        reasonCode: "PROJECT_NOT_INITIALIZED",
        message: "Mimera project is not initialized",
      },
    };
  }
  return genericFailure();
}

export function registerBrowserTools(
  server: McpServer,
  options: RegisterBrowserToolsOptions,
): void {
  const targetRoot = resolve(ProjectRootSchema.parse(options.targetRoot));
  const captureService = options.captureService ?? new ReferenceCaptureService();
  const openProject = options.openProject ?? MimeraProject.open;

  server.registerTool(
    BROWSER_OPEN_REFERENCE_TOOL,
    {
      title: "Open authorized reference",
      description:
        "Capture an authorized reference URL through Mimera policy and return compact evidence metadata plus artifact paths.",
      inputSchema: BrowserOpenReferenceInputSchema,
      outputSchema: BrowserOpenReferenceOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => serializeProjectCapture(targetRoot, async () => {
      let project: MimeraProject | undefined;
      try {
        project = await openProject(targetRoot);
        const output = await captureService.capture(project, {
          url: input.url,
          viewports: input.viewports.map((viewport) => ({
            id: viewport.id,
            width: viewport.width,
            height: viewport.height,
            isMobile: viewport.isMobile,
            ...(viewport.deviceScaleFactor !== undefined
              ? { deviceScaleFactor: viewport.deviceScaleFactor }
              : {}),
          })),
        });
        const result: BrowserOpenReferenceSuccess = {
          schemaVersion: "1",
          ok: true,
          tool: BROWSER_OPEN_REFERENCE_TOOL,
          captureId: output.captureId,
          sessionId: output.session.id,
          status: "REFERENCE_CAPTURED",
          requestedUrl: output.capture.requestedUrl,
          capturedAt: output.capture.capturedAt,
          outputDirectory: output.outputDirectory,
          evidenceIds: output.capture.evidence.map((item) => item.id),
          captures: output.capture.captures.map(captureSummary),
        };
        return {
          content: [{
            type: "text" as const,
            text: `Reference captured: ${result.captures.length} viewport${result.captures.length === 1 ? "" : "s"}, ${result.evidenceIds.length} evidence items`,
          }],
          structuredContent: structuredContent(result),
        };
      } catch (error) {
        const result = knownFailure(error);
        return {
          content: [{
            type: "text" as const,
            text: `${result.error.reasonCode}: ${result.error.message}`,
          }],
          structuredContent: structuredContent(result),
          isError: true,
        };
      } finally {
        project?.close();
      }
    }),
  );
}
