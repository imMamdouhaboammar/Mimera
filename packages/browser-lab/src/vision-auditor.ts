import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { z } from "zod";
import {
  calculateVisualParity,
  createDiffOverlayBuffer,
  decodePng,
  encodePng,
  type VisualParityResult,
} from "@mimera/visual-tools";

export const AuditViewportSchema = z.object({
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type AuditViewport = z.infer<typeof AuditViewportSchema>;

export const DEFAULT_AUDIT_VIEWPORTS: AuditViewport[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

export const VisionAuditSectionResultSchema = z.object({
  sectionIndex: z.number().int().nonnegative(),
  scrollOffset: z.number().int().nonnegative(),
  viewport: z.string().min(1),
  referenceScreenshotPath: z.string().min(1),
  targetScreenshotPath: z.string().min(1),
  diffOverlayPath: z.string().min(1),
  parity: z.custom<VisualParityResult>(),
  status: z.enum(["pass", "fail"]),
});
export type VisionAuditSectionResult = z.infer<typeof VisionAuditSectionResultSchema>;

export const VisionAuditReportSchema = z.object({
  schemaVersion: z.literal("1"),
  referenceUrl: z.string().min(1),
  targetUrl: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  threshold: z.number().min(0).max(100),
  status: z.enum(["pass", "fail"]),
  sections: z.array(VisionAuditSectionResultSchema),
  auditedAt: z.string().datetime({ offset: true }),
});
export type VisionAuditReport = z.infer<typeof VisionAuditReportSchema>;

export interface RunVisionAuditOptions {
  referenceUrl: string;
  targetUrl: string;
  outputDir: string;
  viewports?: AuditViewport[];
  scrollSteps?: number[]; // default: [0, 700, 1400, 2100, 2800]
  threshold?: number;     // default: 90.0
  normalizeVideos?: boolean; // default: true
  timeoutMs?: number;    // default: 30000
}

export class PlaywrightVisionAuditor {
  async runAudit(options: RunVisionAuditOptions): Promise<VisionAuditReport> {
    const outputDir = options.outputDir;
    await mkdir(outputDir, { recursive: true });

    const viewports = options.viewports ?? DEFAULT_AUDIT_VIEWPORTS;
    const scrollSteps = options.scrollSteps ?? [0, 700, 1400, 2100, 2800];
    const threshold = options.threshold ?? 90.0;
    const normalizeVideos = options.normalizeVideos ?? true;
    const timeoutMs = options.timeoutMs ?? 30_000;

    const browser: Browser = await chromium.launch({ headless: true });
    const sections: VisionAuditSectionResult[] = [];

    try {
      for (const vp of viewports) {
        const pageRef = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        const pageTgt = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

        try {
          await Promise.all([
            pageRef.goto(options.referenceUrl, { waitUntil: "load", timeout: timeoutMs }),
            pageTgt.goto(options.targetUrl, { waitUntil: "load", timeout: timeoutMs }),
          ]);

          if (normalizeVideos) {
            const normalizeFn = `
              document.querySelectorAll('iframe, video, canvas').forEach(el => {
                el.style.opacity = '0.3';
              });
            `;
            await Promise.all([
              pageRef.evaluate(normalizeFn).catch(() => {}),
              pageTgt.evaluate(normalizeFn).catch(() => {}),
            ]);
          }

          let sectionIdx = 0;
          for (const scrollY of scrollSteps) {
            await Promise.all([
              pageRef.evaluate(`window.scrollTo(0, ${scrollY})`),
              pageTgt.evaluate(`window.scrollTo(0, ${scrollY})`),
            ]);

            // Brief stabilization pause
            await new Promise((r) => setTimeout(r, 100));

            const [refBuf, tgtBuf] = await Promise.all([
              pageRef.screenshot({ type: "png" }),
              pageTgt.screenshot({ type: "png" }),
            ]);

            const refImage = decodePng(new Uint8Array(refBuf));
            const tgtImage = decodePng(new Uint8Array(tgtBuf));

            const parity = calculateVisualParity(refImage, tgtImage, { threshold });
            const overlay = createDiffOverlayBuffer(refImage, tgtImage, "diff-highlight");
            const overlayPng = encodePng(overlay.image);

            const prefix = `${vp.name}_sec${sectionIdx}_y${scrollY}`;
            const refPath = join(outputDir, `${prefix}_ref.png`);
            const tgtPath = join(outputDir, `${prefix}_tgt.png`);
            const overlayPath = join(outputDir, `${prefix}_diff.png`);

            await Promise.all([
              writeFile(refPath, refBuf),
              writeFile(tgtPath, tgtBuf),
              writeFile(overlayPath, overlayPng),
            ]);

            sections.push({
              sectionIndex: sectionIdx,
              scrollOffset: scrollY,
              viewport: vp.name,
              referenceScreenshotPath: refPath,
              targetScreenshotPath: tgtPath,
              diffOverlayPath: overlayPath,
              parity,
              status: parity.status,
            });

            sectionIdx++;
          }
        } finally {
          await Promise.all([pageRef.close().catch(() => {}), pageTgt.close().catch(() => {})]);
        }
      }
    } finally {
      await browser.close().catch(() => {});
    }

    const totalScore = sections.reduce((acc, s) => acc + s.parity.overallScore, 0);
    const overallScore = sections.length > 0 ? Math.round((totalScore / sections.length) * 100) / 100 : 0;
    const status = overallScore >= threshold ? "pass" : "fail";

    const report: VisionAuditReport = {
      schemaVersion: "1",
      referenceUrl: options.referenceUrl,
      targetUrl: options.targetUrl,
      overallScore,
      threshold,
      status,
      sections,
      auditedAt: new Date().toISOString(),
    };

    const reportPath = join(outputDir, "vision-audit-report.json");
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

    return VisionAuditReportSchema.parse(report);
  }
}
