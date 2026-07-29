import { createHash } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  EvidenceEnvelopeSchema,
  type EvidenceEnvelope,
  type HookContext,
} from "@mimera/contracts";
import {
  HookRunner,
  createUntrustedContentHook,
} from "@mimera/hooks";
import {
  OriginRateLimiter,
  ReferencePolicy,
  RobotsPolicyClient,
} from "@mimera/reference-policy";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import type {
  CaptureArtifact,
  CapturePageInput,
  DomSnapshot,
  NetworkEvidenceEvent,
  PageCaptureResult,
  ViewportCapture,
  ViewportProfile,
} from "./contracts.ts";

export interface BrowserLabOptions {
  policy: ReferencePolicy;
  robots: RobotsPolicyClient;
  rateLimiter: OriginRateLimiter;
  hookRunner?: HookRunner;
  headless?: boolean;
}

export class BrowserDownloadDeniedError extends Error {
  readonly reasonCode = "DOWNLOAD_BLOCKED" as const;
  readonly url: string;

  constructor(url: string) {
    super(`Download blocked by BrowserLab: ${url}`);
    this.name = "BrowserDownloadDeniedError";
    this.url = url;
  }
}

interface PageSafetyState {
  downloadError?: BrowserDownloadDeniedError;
  pendingCancellations: Promise<void>[];
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
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
  }, 2);
}

async function writeJsonArtifact(path: string, value: unknown): Promise<CaptureArtifact> {
  const content = `${stableJson(value)}\n`;
  await Bun.write(path, content);
  return {
    path,
    contentHash: sha256(content),
    sizeBytes: Buffer.byteLength(content),
  };
}

async function fileArtifact(path: string): Promise<CaptureArtifact> {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  return {
    path,
    contentHash: sha256(bytes),
    sizeBytes: (await stat(path)).size,
  };
}

function supportedNetworkUrl(input: string): boolean {
  const protocol = new URL(input).protocol;
  return protocol === "http:" || protocol === "https:";
}

export class BrowserLab {
  readonly #policy: ReferencePolicy;
  readonly #robots: RobotsPolicyClient;
  readonly #rateLimiter: OriginRateLimiter;
  readonly #hookRunner: HookRunner;
  readonly #headless: boolean;
  #browser: Browser | undefined;

  constructor(options: BrowserLabOptions) {
    this.#policy = options.policy;
    this.#robots = options.robots;
    this.#rateLimiter = options.rateLimiter;
    this.#hookRunner = options.hookRunner ?? new HookRunner({ hooks: [createUntrustedContentHook()] });
    this.#headless = options.headless ?? true;
  }

  async capturePage(input: CapturePageInput): Promise<PageCaptureResult> {
    if (input.viewports.length === 0) throw new Error("At least one viewport is required");
    await this.#policy.assertNavigation(input.url);
    await this.#robots.assertAllowed(input.url);
    await this.#rateLimiter.acquire(input.url);
    await mkdir(input.outputDirectory, { recursive: true });

    const capturedAt = new Date().toISOString();
    const captures: ViewportCapture[] = [];
    const evidence: EvidenceEnvelope[] = [];
    for (const viewport of input.viewports) {
      const capture = await this.#captureViewport(input, viewport);
      captures.push(capture);
      evidence.push(
        await this.#ingestEvidence(input, capture.viewport, "dom", capture.dom, capture.artifacts.dom.contentHash, capturedAt),
        await this.#ingestEvidence(
          input,
          capture.viewport,
          "network",
          capture.network,
          capture.artifacts.network.contentHash,
          capturedAt,
        ),
        await this.#ingestEvidence(
          input,
          capture.viewport,
          "screenshot",
          capture.artifacts.screenshot,
          capture.artifacts.screenshot.contentHash,
          capturedAt,
        ),
        await this.#ingestEvidence(
          input,
          capture.viewport,
          "trace",
          capture.artifacts.trace,
          capture.artifacts.trace.contentHash,
          capturedAt,
        ),
      );
    }
    return { requestedUrl: input.url, capturedAt, captures, evidence };
  }

  async #captureViewport(
    input: CapturePageInput,
    viewport: ViewportProfile,
  ): Promise<ViewportCapture> {
    const browser = await this.#getBrowser();
    const directory = join(input.outputDirectory, viewport.id);
    await mkdir(directory, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      locale: "en-US",
      timezoneId: "UTC",
      colorScheme: "light",
      reducedMotion: "reduce",
      serviceWorkers: "block",
      acceptDownloads: false,
      userAgent: "MimeraBot/0.1",
    });
    const tracePath = join(directory, "trace.zip");
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    try {
      const page = await context.newPage();
      const network: NetworkEvidenceEvent[] = [];
      const safety = this.#wirePageSafety(page, network);
      await page.route("**/*", async (route) => {
        const request = route.request();
        const requestUrl = request.url();
        if (!supportedNetworkUrl(requestUrl)) {
          await route.continue();
          return;
        }
        try {
          await this.#policy.assertNavigation(requestUrl);
          await this.#rateLimiter.acquire(requestUrl);
          await route.continue();
        } catch (error) {
          network.push({
            kind: "blocked",
            url: requestUrl,
            method: request.method(),
            resourceType: request.resourceType(),
            timestamp: new Date().toISOString(),
            failureText: error instanceof Error ? error.message : "Blocked by reference policy",
          });
          await route.abort("blockedbyclient");
        }
      });

      let response;
      try {
        response = await page.goto(input.url, {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
      } catch (error) {
        await Promise.all(safety.pendingCancellations);
        if (safety.downloadError) throw safety.downloadError;
        throw error;
      }
      if (!response) throw new Error(`Navigation did not return a response for ${input.url}`);
      await this.#policy.assertNavigation(page.url());
      await page.addStyleTag({
        content: "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}",
      });
      await page.evaluate(async () => {
        if (document.fonts) await document.fonts.ready;
        const globalWithPoll = window as unknown as { pollDone?: Promise<unknown> };
        if (globalWithPoll.pollDone) await globalWithPoll.pollDone.catch(() => {});
      });
      await page.waitForTimeout(50);
      await Promise.all(safety.pendingCancellations);
      if (safety.downloadError) throw safety.downloadError;

      const dom = await this.#captureDom(page);
      const screenshotPath = join(directory, "screenshot.png");
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });
      const domArtifact = await writeJsonArtifact(join(directory, "dom.json"), dom);
      const networkArtifact = await writeJsonArtifact(join(directory, "network.json"), network);
      await context.tracing.stop({ path: tracePath });

      return {
        viewport,
        finalUrl: page.url(),
        title: await page.title(),
        dom,
        network,
        artifacts: {
          screenshot: await fileArtifact(screenshotPath),
          dom: domArtifact,
          network: networkArtifact,
          trace: await fileArtifact(tracePath),
        },
      };
    } catch (error) {
      await context.tracing.stop().catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }

  #wirePageSafety(page: Page, network: NetworkEvidenceEvent[]): PageSafetyState {
    const state: PageSafetyState = { pendingCancellations: [] };
    page.on("dialog", (dialog) => void dialog.dismiss());
    page.on("download", (download) => {
      const error = new BrowserDownloadDeniedError(download.url());
      state.downloadError ??= error;
      network.push({
        kind: "blocked",
        url: download.url(),
        resourceType: "download",
        timestamp: new Date().toISOString(),
        failureText: error.message,
      });
      state.pendingCancellations.push(download.cancel().catch(() => {}));
    });
    page.on("request", (request) => {
      network.push({
        kind: "request",
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: new Date().toISOString(),
      });
    });
    page.on("response", (response) => {
      network.push({
        kind: "response",
        url: response.url(),
        status: response.status(),
        resourceType: response.request().resourceType(),
        timestamp: new Date().toISOString(),
      });
    });
    page.on("requestfailed", (request) => {
      const failureText = request.failure()?.errorText;
      network.push({
        kind: "request-failed",
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: new Date().toISOString(),
        ...(failureText ? { failureText } : {}),
      });
    });
    return state;
  }

  async #captureDom(page: Page): Promise<DomSnapshot> {
    return page.evaluate(() => {
      const selectors = "header,nav,main,section,footer,button,a,[role],[data-component]";
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(selectors)).map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const role = element.getAttribute("role");
        const ariaLabel = element.getAttribute("aria-label");
        const dataComponent = element.getAttribute("data-component");
        const nearestComponent = element.closest<HTMLElement>("[data-component]")?.getAttribute("data-component");
        const pathParts: string[] = [];
        let cursor: HTMLElement | null = element;
        while (cursor && cursor !== document.documentElement) {
          let part = cursor.tagName.toLowerCase();
          if (cursor.id) {
            part += `#${cursor.id}`;
            pathParts.unshift(part);
            break;
          }
          const component = cursor.getAttribute("data-component");
          if (component) {
            part += `[data-component="${component}"]`;
          } else if (cursor.parentElement) {
            const siblings = Array.from(cursor.parentElement.children).filter(
              (sibling) => sibling.tagName === cursor!.tagName,
            );
            if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(cursor) + 1})`;
          }
          pathParts.unshift(part);
          cursor = cursor.parentElement;
        }
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || "1") > 0 &&
          rect.width > 0 &&
          rect.height > 0;
        return {
          tag: element.tagName.toLowerCase(),
          ...(element.id ? { id: element.id } : {}),
          classes: Array.from(element.classList),
          ...(role ? { role } : {}),
          ...(ariaLabel ? { ariaLabel } : {}),
          ...(dataComponent ? { dataComponent } : {}),
          ...(nearestComponent ? { nearestComponent } : {}),
          domPath: pathParts.join(" > "),
          text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
          visible,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          styles: {
            display: style.display,
            position: style.position,
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            gap: style.gap,
            padding: style.padding,
            margin: style.margin,
            borderRadius: style.borderRadius,
          },
        };
      });
      return {
        title: document.title,
        url: location.href,
        lang: document.documentElement.lang,
        direction: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
        bodyScrollHeight: document.body.scrollHeight,
        nodes,
      };
    });
  }

  async #ingestEvidence(
    input: CapturePageInput,
    viewport: ViewportProfile,
    kind: "dom" | "network" | "screenshot" | "trace",
    payload: unknown,
    contentHash: string,
    capturedAt: string,
  ): Promise<EvidenceEnvelope> {
    const raw: EvidenceEnvelope = {
      id: `${kind}-${viewport.id}-${crypto.randomUUID()}`,
      payload: {
        schemaVersion: "1",
        kind,
        viewport,
        data: payload,
      },
      trust: "trusted-system",
      sourceUrl: input.url,
      capturedAt,
      contentHash,
    };
    const context: HookContext = {
      sessionId: input.sessionId,
      host: input.host,
      phase: "pre-evidence-ingest",
      operation: `evidence.ingest-reference-${kind}`,
      input: raw,
      trustedScope: input.trustedScope,
      correlationId: crypto.randomUUID(),
    };
    const result = await this.#hookRunner.run(context);
    if (result.decision.kind !== "allow") {
      throw new Error(`Evidence hook rejected ${kind}: ${result.decision.reasonCode}`);
    }
    return EvidenceEnvelopeSchema.parse(result.input);
  }

  async #getBrowser(): Promise<Browser> {
    this.#browser ??= await chromium.launch({ headless: this.#headless });
    return this.#browser;
  }

  async close(): Promise<void> {
    if (!this.#browser) return;
    const browser = this.#browser;
    this.#browser = undefined;
    await browser.close();
  }
}
