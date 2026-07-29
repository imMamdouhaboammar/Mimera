import { createHash } from "node:crypto";
import {
  BrowserDomEvidencePayloadSchema,
  type BrowserDomEvidencePayload,
  type DomSnapshot,
  type ViewportProfile,
} from "@mimera/browser-lab";
import type {
  EvidenceEnvelope,
  ReferenceSession,
} from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import {
  DesignDnaEvidencePayloadSchema,
  DesignDnaExtractor,
  PageDecompositionEvidencePayloadSchema,
  type DesignAnalysisResult,
  type DesignDnaEvidencePayload,
  type PageDecompositionEvidencePayload,
  type ViewportDomEvidence,
} from "@mimera/design-dna";

export class DesignAnalysisStateError extends Error {
  readonly status: ReferenceSession["status"];

  constructor(status: ReferenceSession["status"]) {
    super(`Design analysis requires REFERENCE_CAPTURED, current status is ${status}`);
    this.name = "DesignAnalysisStateError";
    this.status = status;
  }
}

export class DesignEvidenceIncompleteError extends Error {
  readonly viewportIds: string[];

  constructor(viewportIds: readonly string[]) {
    super("Design analysis requires DOM evidence from at least two distinct viewports");
    this.name = "DesignEvidenceIncompleteError";
    this.viewportIds = [...viewportIds].sort();
  }
}

export class StoredDesignAnalysisMissingError extends Error {
  constructor() {
    super("The session is PAGE_DECOMPOSED but its persisted design analysis is missing or invalid");
    this.name = "StoredDesignAnalysisMissingError";
  }
}

export interface DesignAnalysisServiceOptions {
  now?: () => string;
}

export interface DesignAnalysisOutput {
  session: ReferenceSession;
  analysis: DesignAnalysisResult;
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

function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function analysisEvidence<T extends DesignDnaEvidencePayload | PageDecompositionEvidencePayload>(
  payload: T,
  capturedAt: string,
): EvidenceEnvelope<T> {
  const hash = contentHash(payload);
  return {
    id: `${payload.kind}-${hash.slice(0, 16)}`,
    payload,
    trust: "trusted-system",
    capturedAt,
    contentHash: hash,
  };
}


function normalizeViewport(input: BrowserDomEvidencePayload["viewport"]): ViewportProfile {
  return {
    id: input.id,
    width: input.width,
    height: input.height,
    isMobile: input.isMobile,
    ...(input.deviceScaleFactor !== undefined
      ? { deviceScaleFactor: input.deviceScaleFactor }
      : {}),
  };
}

function normalizeDom(input: BrowserDomEvidencePayload["data"]): DomSnapshot {
  return {
    title: input.title,
    url: input.url,
    lang: input.lang,
    direction: input.direction,
    bodyScrollHeight: input.bodyScrollHeight,
    nodes: input.nodes.map((node) => ({
      tag: node.tag,
      ...(node.id !== undefined ? { id: node.id } : {}),
      classes: [...node.classes],
      ...(node.role !== undefined ? { role: node.role } : {}),
      ...(node.ariaLabel !== undefined ? { ariaLabel: node.ariaLabel } : {}),
      ...(node.dataComponent !== undefined ? { dataComponent: node.dataComponent } : {}),
      ...(node.nearestComponent !== undefined
        ? { nearestComponent: node.nearestComponent }
        : {}),
      domPath: node.domPath,
      text: node.text,
      visible: node.visible,
      rect: { ...node.rect },
      styles: { ...node.styles },
    })),
  };
}

function readStoredAnalysis(project: MimeraProject): DesignAnalysisResult {
  let dna: DesignAnalysisResult["dna"] | undefined;
  let decomposition: DesignAnalysisResult["decomposition"] | undefined;

  for (const item of project.listEvidence<unknown>()) {
    const dnaPayload = DesignDnaEvidencePayloadSchema.safeParse(item.payload);
    if (dnaPayload.success) dna = dnaPayload.data.data;

    const decompositionPayload = PageDecompositionEvidencePayloadSchema.safeParse(item.payload);
    if (decompositionPayload.success) decomposition = decompositionPayload.data.data;
  }

  if (!dna || !decomposition) throw new StoredDesignAnalysisMissingError();
  return { dna, decomposition };
}

function readDomEvidence(project: MimeraProject): ViewportDomEvidence[] {
  const evidence: ViewportDomEvidence[] = [];
  for (const item of project.listEvidence<unknown>()) {
    const parsed = BrowserDomEvidencePayloadSchema.safeParse(item.payload);
    if (!parsed.success) continue;
    const payload: BrowserDomEvidencePayload = parsed.data;
    evidence.push({
      evidenceId: item.id,
      viewport: normalizeViewport(payload.viewport),
      dom: normalizeDom(payload.data),
    });
  }
  return evidence.sort(
    (left, right) => right.viewport.width - left.viewport.width || left.evidenceId.localeCompare(right.evidenceId),
  );
}

export class DesignAnalysisService {
  readonly #now: () => string;

  constructor(options: DesignAnalysisServiceOptions = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async analyze(project: MimeraProject): Promise<DesignAnalysisOutput> {
    const current = project.currentSession();
    if (current.status === "PAGE_DECOMPOSED") {
      return { session: current, analysis: readStoredAnalysis(project) };
    }
    if (current.status !== "REFERENCE_CAPTURED") {
      throw new DesignAnalysisStateError(current.status);
    }

    const domEvidence = readDomEvidence(project);
    const viewportIds = [...new Set(domEvidence.map((item) => item.viewport.id))].sort();
    if (viewportIds.length < 2) throw new DesignEvidenceIncompleteError(viewportIds);

    const capturedAt = this.#now();
    const analysis = new DesignDnaExtractor({ now: () => capturedAt }).extract(domEvidence);
    const dnaPayload: DesignDnaEvidencePayload = {
      schemaVersion: "1",
      kind: "design-dna",
      data: analysis.dna,
    };
    const decompositionPayload: PageDecompositionEvidencePayload = {
      schemaVersion: "1",
      kind: "page-decomposition",
      data: analysis.decomposition,
    };
    const analysisPack: EvidenceEnvelope<
      DesignDnaEvidencePayload | PageDecompositionEvidencePayload
    >[] = [
      analysisEvidence(dnaPayload, capturedAt),
      analysisEvidence(decompositionPayload, capturedAt),
    ];
    const session = await project.completeStage(
      "PAGE_DECOMPOSED",
      analysisPack,
      {
        actor: "design-analysis-service",
        correlationId: crypto.randomUUID(),
        now: capturedAt,
      },
    );

    return { session, analysis };
  }
}

export * from "./brand-adapter.ts";
