import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type {
  BrowserDomEvidencePayload,
  DomNodeEvidence,
  DomSnapshot,
  ViewportProfile,
} from "@mimera/browser-lab";
import type { EvidenceEnvelope } from "@mimera/contracts";
import { MimeraProject } from "@mimera/core";
import { DesignAnalysisService } from "@mimera/design-analysis";
import {
  DesignDnaExtractor,
  type DesignDnaEvidencePayload,
  type PageDecompositionEvidencePayload,
  type ViewportDomEvidence,
} from "@mimera/design-dna";
import { PreflightService } from "@mimera/preflight";
import { ReferenceCaptureService } from "@mimera/reference-capture";
import {
  ComponentNotFoundError,
  ComponentSpecificationService,
} from "../src/index.ts";

let server: ReturnType<typeof Bun.serve>;
let origin: string;
const directories: string[] = [];

beforeAll(() => {
  const fixture = resolve(import.meta.dir, "../../../fixtures/reference-sites/navbar/index.html");
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: MimeraBot\nAllow: /", { status: 200 });
      }
      if (url.pathname === "/") {
        return new Response(await readFile(fixture), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    },
  });
  origin = `http://${server.hostname}:${server.port}`;
});

afterAll(() => server.stop(true));
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const LOGICAL_FIXTURE_TIME = "2026-07-27T10:15:00.000Z";

function hashPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function evidence<T>(
  id: string,
  payload: T,
  trust: EvidenceEnvelope<T>["trust"],
): EvidenceEnvelope<T> {
  return {
    id,
    payload,
    trust,
    capturedAt: LOGICAL_FIXTURE_TIME,
    contentHash: hashPayload(payload),
  };
}

function fixtureNode(viewport: ViewportProfile): DomNodeEvidence {
  return {
    tag: "main",
    dataComponent: "main",
    nearestComponent: "main",
    domPath: "body > main",
    text: "Fixture content",
    visible: true,
    classes: [],
    rect: { x: 0, y: 0, width: viewport.width, height: 800 },
    styles: {
      display: "block",
      position: "static",
      color: "rgb(22, 22, 22)",
      backgroundColor: "rgb(247, 245, 239)",
      fontFamily: "Arial, sans-serif",
      fontSize: viewport.isMobile ? "40px" : "72px",
      fontWeight: "700",
      lineHeight: viewport.isMobile ? "48px" : "80px",
      gap: "0px",
      padding: viewport.isMobile ? "32px 16px" : "64px 24px",
      margin: "0px",
      borderRadius: "0px",
    },
  };
}

function fixtureSnapshot(viewport: ViewportProfile): DomSnapshot {
  return {
    title: "Fixture",
    url: origin,
    lang: "en",
    direction: "ltr",
    bodyScrollHeight: 800,
    nodes: [fixtureNode(viewport)],
  };
}

async function logicallyAnalyzedProject(): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-component-spec-logical-"));
  directories.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "component-spec-logical-fixture",
    scripts: { test: "bun test" },
    dependencies: { react: "19.0.0" },
    devDependencies: { vite: "7.0.0" },
  }));
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1\n");

  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: [origin],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
    now: LOGICAL_FIXTURE_TIME,
  });
  await new PreflightService({ now: () => LOGICAL_FIXTURE_TIME }).prepare(project);

  const viewports: ViewportProfile[] = [
    { id: "desktop", width: 1440, height: 900, isMobile: false },
    { id: "mobile", width: 390, height: 844, isMobile: true },
  ];
  const domEvidence: ViewportDomEvidence[] = viewports.map((viewport) => ({
    evidenceId: `dom-${viewport.id}`,
    viewport,
    dom: fixtureSnapshot(viewport),
  }));
  const browserEvidence: EvidenceEnvelope<BrowserDomEvidencePayload>[] = domEvidence.map((item) => {
    const payload: BrowserDomEvidencePayload = {
      schemaVersion: "1",
      kind: "dom",
      viewport: item.viewport,
      data: item.dom,
    };
    return evidence(item.evidenceId, payload, "untrusted-reference");
  });
  await project.completeStage("REFERENCE_CAPTURED", browserEvidence, {
    actor: "component-spec-test-fixture",
    now: LOGICAL_FIXTURE_TIME,
  });

  const analysis = new DesignDnaExtractor({ now: () => LOGICAL_FIXTURE_TIME }).extract(domEvidence);
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
  const analysisEvidence: EvidenceEnvelope<
    DesignDnaEvidencePayload | PageDecompositionEvidencePayload
  >[] = [
    evidence("design-dna-logical", dnaPayload, "trusted-system"),
    evidence("page-decomposition-logical", decompositionPayload, "trusted-system"),
  ];
  await project.completeStage(
    "PAGE_DECOMPOSED",
    analysisEvidence,
    {
      actor: "component-spec-test-fixture",
      now: LOGICAL_FIXTURE_TIME,
    },
  );
  return project;
}

async function analyzedProject(): Promise<MimeraProject> {
  const root = await mkdtemp(join(tmpdir(), "mimera-component-spec-"));
  directories.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "component-spec-fixture",
    scripts: { dev: "vite", test: "bun test", build: "vite build" },
    dependencies: { react: "19.0.0", "react-dom": "19.0.0" },
    devDependencies: { vite: "7.0.0", tailwindcss: "4.0.0" },
  }));
  await writeFile(join(root, "bun.lock"), "lockfileVersion = 1\n");
  const project = await MimeraProject.initialize({
    targetRoot: root,
    referenceUrls: [origin],
    host: "codex",
    mode: "structure",
    python: { enabled: false },
  });
  await new PreflightService().prepare(project);
  await new ReferenceCaptureService({
    allowHttp: true,
    allowLoopback: true,
    minimumIntervalMs: 0,
  }).capture(project, {
    url: origin,
    viewports: [
      { id: "desktop", width: 1440, height: 900, isMobile: false },
      { id: "mobile", width: 390, height: 844, isMobile: true },
    ],
  });
  await new DesignAnalysisService().analyze(project);
  return project;
}

test("creates an evidence-backed navbar specification and write scope", async () => {
  const project = await analyzedProject();
  const service = new ComponentSpecificationService({ now: () => "2026-07-27T10:20:00.000Z" });

  const result = await service.specify(project, { componentId: "navbar" });

  expect(result.session.status).toBe("COMPONENT_SPECIFIED");
  expect(result.spec.id).toBe("navbar");
  expect(result.spec.status).toBe("specified");
  expect(result.spec.targetFiles).toEqual([
    "src/components/Navbar.module.css",
    "src/components/Navbar.test.tsx",
    "src/components/Navbar.tsx",
  ]);
  expect(result.spec.responsiveContract.viewports).toEqual([
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]);
  expect(result.spec.responsiveContract.rules).toContain("navigation-collapses-to-menu");
  expect(result.spec.interactionContract.states).toEqual([
    "desktop-navigation-visible",
    "mobile-menu-control-visible",
  ]);
  expect(result.spec.acceptanceCriteria.some((criterion) => criterion.kind === "accessibility")).toBe(true);
  expect(result.writeScope.targetFiles).toEqual(result.spec.targetFiles);
  expect(result.writeScope.allowedCommands).toEqual(["bun run build", "bun test"]);
  expect(project.listEvidence()).toHaveLength(13);

  const repeated = await service.specify(project, { componentId: "navbar" });
  expect(repeated.spec).toEqual(result.spec);
  expect(project.listEvidence()).toHaveLength(13);
  project.close();
}, 30_000);

test("rejects a component id that is not in the page decomposition", async () => {
  const project = await logicallyAnalyzedProject();

  await expect(
    new ComponentSpecificationService().specify(project, { componentId: "pricing-table" }),
  ).rejects.toBeInstanceOf(ComponentNotFoundError);
  expect(project.currentSession().status).toBe("PAGE_DECOMPOSED");
  project.close();
}, 30_000);
