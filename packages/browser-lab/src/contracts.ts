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
