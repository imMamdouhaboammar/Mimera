import { z } from "zod";
import type {
  EvidenceEnvelope,
  HostKind,
  TrustedScope,
} from "@mimera/contracts";

export interface ViewportProfile {
  id: string;
  width: number;
  height: number;
  isMobile: boolean;
  deviceScaleFactor?: number;
}

export interface NetworkEvidenceEvent {
  kind: "request" | "response" | "request-failed" | "blocked";
  url: string;
  method?: string;
  status?: number;
  resourceType: string;
  timestamp: string;
  failureText?: string;
}

export interface DomNodeEvidence {
  tag: string;
  id?: string;
  classes: string[];
  role?: string;
  ariaLabel?: string;
  dataComponent?: string;
  nearestComponent?: string;
  domPath: string;
  text: string;
  visible: boolean;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styles: {
    display: string;
    position: string;
    color: string;
    backgroundColor: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    gap: string;
    padding: string;
    margin: string;
    borderRadius: string;
  };
}

export interface DomSnapshot {
  title: string;
  url: string;
  lang: string;
  direction: string;
  bodyScrollHeight: number;
  nodes: DomNodeEvidence[];
}

export interface CaptureArtifact {
  path: string;
  contentHash: string;
  sizeBytes: number;
}

export interface ViewportCapture {
  viewport: ViewportProfile;
  finalUrl: string;
  title: string;
  dom: DomSnapshot;
  network: NetworkEvidenceEvent[];
  artifacts: {
    screenshot: CaptureArtifact;
    dom: CaptureArtifact;
    network: CaptureArtifact;
    trace: CaptureArtifact;
  };
}


export interface BrowserEvidencePayload<T = unknown> {
  schemaVersion: "1";
  kind: "dom" | "network" | "screenshot" | "trace";
  viewport: ViewportProfile;
  data: T;
}

export interface PageCaptureResult {
  requestedUrl: string;
  capturedAt: string;
  captures: ViewportCapture[];
  evidence: EvidenceEnvelope[];
}

export interface CapturePageInput {
  sessionId: string;
  host: HostKind;
  trustedScope: TrustedScope;
  url: string;
  outputDirectory: string;
  viewports: ViewportProfile[];
}


export const ViewportProfileSchema = z.object({
  id: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  isMobile: z.boolean(),
  deviceScaleFactor: z.number().positive().optional(),
});

export const DomNodeEvidenceSchema = z.object({
  tag: z.string().min(1),
  id: z.string().min(1).optional(),
  classes: z.array(z.string()),
  role: z.string().min(1).optional(),
  ariaLabel: z.string().min(1).optional(),
  dataComponent: z.string().min(1).optional(),
  nearestComponent: z.string().min(1).optional(),
  domPath: z.string().min(1),
  text: z.string(),
  visible: z.boolean(),
  rect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
  }),
  styles: z.object({
    display: z.string(),
    position: z.string(),
    color: z.string(),
    backgroundColor: z.string(),
    fontFamily: z.string(),
    fontSize: z.string(),
    fontWeight: z.string(),
    lineHeight: z.string(),
    gap: z.string(),
    padding: z.string(),
    margin: z.string(),
    borderRadius: z.string(),
  }),
});

export const DomSnapshotSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  lang: z.string(),
  direction: z.string(),
  bodyScrollHeight: z.number().nonnegative(),
  nodes: z.array(DomNodeEvidenceSchema),
});

export const BrowserDomEvidencePayloadSchema = z.object({
  schemaVersion: z.literal("1"),
  kind: z.literal("dom"),
  viewport: ViewportProfileSchema,
  data: DomSnapshotSchema,
});
export type BrowserDomEvidencePayload = z.infer<typeof BrowserDomEvidencePayloadSchema>;
