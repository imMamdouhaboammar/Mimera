#!/usr/bin/env node
/** Observed pixel output only. No fetching/exporting JS, CSS, shaders, cookies or assets. */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { VIEWPORTS, publicReferenceUrl } from './clean-room.mjs';

export function captureDirectory(root,target,viewport,runId=randomUUID()) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(runId)) throw new Error('Invalid capture run identifier');
  return join(resolve(root), 'evidence', target, 'scroll-' + viewport + '-' + runId);
}


export function validateCaptureUrl(manifest, target, raw) {
  if (!['reference', 'implementation'].includes(target)) throw new Error('--target must be reference or implementation');
  const base = target === 'reference' ? manifest.reference.url : manifest.implementation.url;
  if (!base) throw new Error("Set " + target + " URL in run.json first");
  if (target === 'reference') publicReferenceUrl(base);
  const allowed = new URL(base), candidate = new URL(raw || base, base);
  if (!['https:', 'http:'].includes(candidate.protocol) || candidate.origin !== allowed.origin || candidate.username || candidate.password) {
    throw new Error('Capture URL must be same-origin http(s), without embedded credentials');
  }
  return candidate.href;
}
export function parsePositions(raw = '0,0.25,0.5,0.75,1') {
  if (typeof raw !== 'string' || raw.split(',').some(part => !part.trim())) throw new Error('Positions must be strictly increasing in [0,1] (max 25)');
  const xs = raw.split(',').map(Number);
  if (!xs.length || xs.length > 25 || xs.some(x => !Number.isFinite(x) || x < 0 || x > 1) || xs.some((x, i) => i > 0 && x <= xs[i - 1])) throw new Error('Positions must be strictly increasing in [0,1] (max 25)');
  return xs;
}
export function parseFlags(argv) {
  const flags = {};
  for (let i=0;i<argv.length;i++) {
    if (argv[i] === '--record-video') {
      if (flags['record-video']) throw new Error('duplicate --record-video');
      flags['record-video'] = true; continue;
    }
    if (!['--out','--url','--target','--viewport','--positions','--settle-ms'].includes(argv[i]) || !argv[i+1] || argv[i+1].startsWith('--')) throw new Error("Unknown or incomplete flag " + argv[i]);
    const name=argv[i].slice(2);
    if (Object.hasOwn(flags,name)) throw new Error('duplicate --' + name);
    flags[name] = argv[++i];
  }
  if (!flags.out) throw new Error('--out is required');
  if (flags['settle-ms'] !== undefined && (!Number.isInteger(Number(flags['settle-ms'])) || Number(flags['settle-ms']) < 0 || Number(flags['settle-ms']) > 5000)) throw new Error('--settle-ms must be 0..5000');
  return flags;
}

export async function runCapture(flags) {
  const root = resolve(flags.out);
  if (!existsSync(join(root, 'run.json'))) throw new Error('Initialize the clean-room run first');
  const manifest = JSON.parse(readFileSync(join(root, 'run.json'), 'utf8'));
  const target = flags.target || 'reference';
  const url = validateCaptureUrl(manifest, target, flags.url);
  const viewport = VIEWPORTS.find(x => x.id === (flags.viewport || 'desktop'));
  if (!viewport) throw new Error('Viewport must be mobile, tablet or desktop');
  const positions = parsePositions(flags.positions);
  const delay = flags['settle-ms'] === undefined ? 450 : Number(flags['settle-ms']);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const runId = randomUUID();
  const output = captureDirectory(root, target, viewport.id, runId);
  mkdirSync(join(root, 'evidence', target), { recursive: true });
  mkdirSync(output);
  const results = [];
  let videoRecord = null;
  try {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(flags['record-video'] ? { recordVideo: { dir: output, size: { width: viewport.width, height: viewport.height } } } : {}) });
    const page = await context.newPage();
    await page.route('**/*', route => {
      const request=route.request();
      if (request.isNavigationRequest() && new URL(request.url()).origin !== new URL(url).origin) return route.abort('blockedbyclient');
      return route.continue();
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (new URL(page.url()).origin !== new URL(url).origin) throw new Error('Reference redirected across origins; refusing screenshot');
    // Only scroll coordinates are evaluated. Never inspect or export application source.
    await page.evaluate(() => document.fonts.ready);
    for (const [idx, position] of positions.entries()) {
      const state = await page.evaluate(progress => {
        const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        window.scrollTo({ top: Math.round(max * progress), left: 0, behavior: 'instant' });
        return { maxScrollY: max };
      }, position);
      if (delay) await page.waitForTimeout(delay);
      const name = "frame-" + String(idx).padStart(2, "0") + ".png";
      const file = join(output, name);
      const pixels = await page.screenshot({ path: file, fullPage: false, animations: 'allow' });
      results.push({ path: relative(root, file), sha256: createHash('sha256').update(pixels).digest('hex'), scrollProgress: position, maxScrollY: state.maxScrollY, capturedAt: new Date().toISOString() });
    }
    await context.close();
    if (flags['record-video'] && page.video()) {
      const videoPath = await page.video().path();
      const bytes = readFileSync(videoPath);
      videoRecord = { path: relative(root, videoPath), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
    }
  } finally { await browser.close(); }
  const report = { target, url, viewport, positions, video: videoRecord, warning: 'Sampled scroll stills/video are not frame-perfect input-replay evidence. Record controlled pointer/hover/drag and WebGL scenario evidence separately.', files: results };
  const filename = join(root, 'reports', "capture-" + target + "-" + viewport.id + "-" + runId + ".json");
  mkdirSync(join(root, 'reports'), { recursive: true });
  writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
  console.log("Captured " + results.length + " frames. Report: " + filename + ". run.json gates remain PENDING.");
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { const flags = parseFlags(process.argv.slice(2)); await runCapture(flags); }
  catch (error) { console.error('ERROR: '+error.message); process.exitCode=2; }
}
