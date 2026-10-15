#!/usr/bin/env node
/** Observation-only clean-room run manifests. No source, script, or asset harvesting. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, lstatSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { isIP } from 'node:net';

export const VIEWPORTS = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'tablet', width: 768, height: 1024 },
  { id: 'desktop', width: 1440, height: 900 }
];
const scenario = (id, route, trigger, viewport) => ({
  id, route, trigger, viewport, status: 'pending',
  referenceEvidence: [], implementationEvidence: [], comparisonEvidence: [],
  motionSpec: null, functionalTest: null
});

/** Strict public-reference policy: no local/IP targets in a browser running with developer credentials. */
export function publicReferenceUrl(referenceUrl) {
  const parsed = new URL(referenceUrl);
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password
    || !host.includes('.') || isIP(host) !== 0
    || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
    || host.endsWith('.internal') || host.endsWith('.test')) {
    throw new Error('Reference must be a public domain http(s) URL without credentials or local/private hosts');
  }
  return parsed;
}

export function newManifest(referenceUrl) {
  const parsed = publicReferenceUrl(referenceUrl);
  return {
    schemaVersion: 1,
    purpose: 'Independent observable-behavior reconstruction; not original source recovery',
    reference: { url: parsed.href, observedAt: null },
    implementation: { url: null, themePath: null, developmentStore: null },
    viewports: VIEWPORTS,
    scenarios: [
      scenario('home-scroll', '/', 'scroll scrub, pinned sections and transitions', 'desktop'),
      scenario('navigation-overlay', '/', 'hover, click, keyboard and Escape', 'desktop'),
      scenario('product-variant-cart', '/products/REPLACE_ME', 'variant selection, add to cart and drawer', 'desktop'),
      scenario('mobile-navigation', '/', 'touch, scroll and menu dismissal', 'mobile'),
      scenario('webgl-if-present', '/', 'pointer movement, camera/object motion and lifecycle if observed', 'desktop')
    ],
    gates: Object.fromEntries([
      'independentImplementation', 'licensedAssets', 'shopifyThemeCheck',
      'developmentStoreFlows', 'themeEditorReload', 'reducedMotion',
      'responsiveMotion', 'motionComparison', 'performanceAndAccessibility'
    ].map(k => [k, { status: 'pending', evidence: [] }])),
    release: { approvedBy: null, approvedAt: null }
  };
}

export function initRun(out, url) {
  const root = resolve(out);
  if (existsSync(join(root, 'run.json'))) throw new Error("Run already exists at " + root + "; refusing to overwrite evidence");
  const manifest = newManifest(url);
  for (const folder of ['evidence/reference', 'evidence/implementation', 'evidence/comparison', 'specs', 'reports']) mkdirSync(join(root, folder), { recursive: true });
  writeFileSync(join(root, 'run.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return { root, manifest };
}

export function safeEvidence(root, record) {
  if (!record || typeof record !== 'object' || typeof record.path !== 'string' || !record.sha256) return false;
  if (isAbsolute(record.path) || record.path.includes('\\')) return false;
  const base = resolve(root), file = resolve(base, record.path), rel = relative(base, file);
  if (!rel || rel === '..' || rel.startsWith(".." + sep) || isAbsolute(rel)) return false;
  try {
    const fs = lstatSync(file);
    if (fs.isSymbolicLink() || !fs.isFile() || fs.size === 0 || fs.size > 1024 * 1024 * 1024) return false;
    const realRoot = realpathSync(base), realFile = realpathSync(file);
    const inside = relative(realRoot, realFile);
    if (!inside || inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside)) return false;
    const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
    return digest === record.sha256;
  } catch { return false; }
}

export function auditRun(root, manifest) {
  const missing = [];
  if (manifest.schemaVersion !== 1) missing.push('Invalid run manifest schema version');
  if (!manifest.reference?.observedAt) missing.push('Reference timestamp is missing');
  if (!manifest.implementation?.url || !manifest.implementation?.themePath || !manifest.implementation?.developmentStore) missing.push('Live Shopify implementation details are missing');
  const baseline = newManifest('https://example.com').scenarios.map(x => x.id);
  if (!Array.isArray(manifest.scenarios) || !manifest.scenarios.length) {
    missing.push('No scenarios');
    for (const id of baseline) missing.push('required scenario missing: ' + id);
  }
  else {
    const ids = manifest.scenarios.map(x => x?.id);
    for (const id of baseline) if (!ids.includes(id)) missing.push('required scenario missing: ' + id);
    if (new Set(ids).size !== ids.length) missing.push('duplicate scenario identifier');
    for (const item of manifest.scenarios) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string') { missing.push('malformed scenario'); continue; }
    if (item.status === 'not-applicable') {
      if (item.id !== 'webgl-if-present' || !item.motionSpec || !safeEvidence(root, { path: item.motionSpec, sha256: item.motionSpecSha256 })) missing.push(item.id + ": requires hashed documented reason for not applicable");
      continue;
    }
    if (item.status !== 'verified') { missing.push(item.id + ": not verified"); continue; }
    for (const field of ['referenceEvidence', 'implementationEvidence', 'comparisonEvidence']) {
      if (!Array.isArray(item[field]) || !item[field].length || !item[field].every(rec => safeEvidence(root, rec))) missing.push(item.id + ": missing or invalid " + field + " with SHA-256 evidence");
    }
    if (typeof item.motionSpec !== 'string' || !item.motionSpec.trim()) missing.push(item.id + ": missing motion specification path");
    else if (!safeEvidence(root, { path: item.motionSpec, sha256: item.motionSpecSha256 })) missing.push(item.id + ": invalid motion spec digest");
    if (typeof item.functionalTest !== 'string' || !item.functionalTest.trim()) missing.push(item.id + ": missing functional test identifier");
    }
  }
  const required = Object.keys(newManifest('https://example.com').gates);
  for (const name of required) {
    const gate = manifest.gates?.[name];
    if (gate?.status !== 'verified' || !Array.isArray(gate?.evidence) || !gate.evidence.length || !gate.evidence.every(rec => safeEvidence(root, rec))) missing.push("gate/" + name + ": not verified with hashed evidence");
  }
  if (!manifest.release?.approvedBy || !manifest.release?.approvedAt) missing.push('Reviewer approval missing');
  return { releaseReady: missing.length === 0, missing };
}

export function main(argv = process.argv.slice(2)) {
  const cmd = argv[0];
  if (!['init', 'audit'].includes(cmd)) throw new Error('Usage: clean-room init --url https://reference --out ./workbench | audit --out ./workbench');
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    if (!['--url', '--out'].includes(argv[i]) || !argv[i + 1]) throw new Error("Invalid option: " + argv[i]);
    flags[argv[i].slice(2)] = argv[++i];
  }
  if (!flags.out) throw new Error('--out is required');
  if (cmd === 'init') {
    if (!flags.url) throw new Error('--url is required');
    const {root} = initRun(flags.out, flags.url);
    console.log("Created observation ledger: " + join(root, "run.json") + " (all claims initially PENDING)");
  } else {
    const root = resolve(flags.out);
    const result = auditRun(root, JSON.parse(readFileSync(join(root, 'run.json'), 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    if (!result.releaseReady) process.exitCode = 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { main(); } catch (error) { console.error('ERROR: ' + error.message); process.exitCode = 2; }
}
