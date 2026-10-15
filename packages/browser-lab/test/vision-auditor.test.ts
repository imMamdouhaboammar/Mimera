import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PlaywrightVisionAuditor } from "../src/vision-auditor.ts";

let serverRef: ReturnType<typeof Bun.serve>;
let serverTgt: ReturnType<typeof Bun.serve>;
let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mimera-vision-audit-test-"));

  serverRef = Bun.serve({
    port: 0,
    fetch() {
      return new Response(
        `<!DOCTYPE html><html><body style="margin:0; background:#001630; color:#fff; font-family:sans-serif; height:2000px;">
          <h1 style="font-size:40px; padding:20px;">Reference Header</h1>
          <div style="margin-top:700px; padding:20px; font-size:30px;">Section 1 Content</div>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    },
  });

  serverTgt = Bun.serve({
    port: 0,
    fetch() {
      return new Response(
        `<!DOCTYPE html><html><body style="margin:0; background:#001630; color:#fff; font-family:sans-serif; height:2000px;">
          <h1 style="font-size:40px; padding:20px;">Reference Header</h1>
          <div style="margin-top:700px; padding:20px; font-size:30px;">Section 1 Content</div>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    },
  });
});

afterAll(async () => {
  serverRef.stop(true);
  serverTgt.stop(true);
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

test("PlaywrightVisionAuditor conducts side-by-side multi-viewport audit and generates report", async () => {
  const auditor = new PlaywrightVisionAuditor();
  const report = await auditor.runAudit({
    referenceUrl: `http://localhost:${serverRef.port}/`,
    targetUrl: `http://localhost:${serverTgt.port}/`,
    outputDir: join(tempDir, "audit-out"),
    viewports: [{ name: "desktop", width: 800, height: 600 }],
    scrollSteps: [0, 700],
    threshold: 90.0,
  });

  expect(report.schemaVersion).toBe("1");
  expect(report.status).toBe("pass");
  expect(report.overallScore).toBeGreaterThanOrEqual(90.0);
  expect(report.sections).toHaveLength(2);
  expect(report.sections[0]!.parity.structuralEdgeScore).toBe(100);
});
