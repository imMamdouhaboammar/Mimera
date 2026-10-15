import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { status, makeMcpConfig } from '../scripts/support-tools.mjs';
import { newManifest, auditRun } from '../scripts/clean-room.mjs';
import { validateCaptureUrl, parseFlags, captureDirectory } from '../scripts/capture-motion.mjs';
import { assertFreshOutput } from '../scripts/safe-output.mjs';

test('scoped npm doctor recognizes scoped package installs', () => {
  const prefix = mkdtempSync(join(tmpdir(), 'sky-prefix-'));
  try {
    mkdirSync(join(prefix,'node_modules','@playwright','mcp'),{recursive:true});
    mkdirSync(join(prefix,'node_modules','@shopify','cli'),{recursive:true});
    writeFileSync(join(prefix,'node_modules','@playwright','mcp','package.json'),JSON.stringify({version:'0.0.123'}));
    writeFileSync(join(prefix,'node_modules','@shopify','cli','package.json'),JSON.stringify({version:'0.0.321'}));
    const result=status(prefix);
    assert.equal(result.tools.playwright.installed,true);
    assert.equal(result.tools.playwright.version,'0.0.123');
    assert.equal(result.tools.shopify.installed,true);
    assert.equal(result.tools.shopify.version,'0.0.321');
  } finally { rmSync(prefix,{recursive:true,force:true}); }
});

test('MCP clean-room config disables Chrome JavaScript/source-map access', () => {
  const flags=makeMcpConfig('/tmp/sky-tools-regression').mcpServers['chrome-devtools'].args;
  assert.ok(flags.includes('--no-javascript-evaluation'));
  assert.ok(flags.includes('--no-source-maps'));
});

test('audit cannot be bypassed by dropping required scenarios', () => {
  const root=mkdtempSync(join(tmpdir(),'sky-audit-'));
  try {
    const manifest=newManifest('https://example.com');
    manifest.reference.observedAt = new Date().toISOString();
    manifest.implementation = {url:'https://test.myshopify.com',themePath:'/tmp/theme',developmentStore:'test.myshopify.com'};
    manifest.scenarios=[];
    manifest.release={approvedBy:'reviewer',approvedAt:new Date().toISOString()};
    assert.ok(auditRun(root,manifest).missing.some(x=>x.includes('required scenario')));
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('audit rejects duplicate scenario identifiers', () => {
  const root=mkdtempSync(join(tmpdir(),'sky-audit-'));
  try {
    const manifest=newManifest('https://example.com');
    manifest.scenarios.push({...manifest.scenarios[0]});
    assert.ok(auditRun(root,manifest).missing.some(x=>x.includes('duplicate scenario')));
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('reference navigation forbids local targets and embedded credentials', () => {
  assert.throws(() => newManifest('http://127.0.0.1:8080'),/public|private|local/i);
  assert.throws(() => newManifest('http://localhost:8080'),/public|private|local/i);
  const manifest=newManifest('https://skytheme-demo.myshopify.com');
  assert.throws(() => validateCaptureUrl(manifest,'reference','https://skytheme-demo.myshopify.com@127.0.0.1'),/same-origin/i);
  manifest.reference.url='http://127.0.0.1:8080/';
  assert.throws(() => validateCaptureUrl(manifest,'reference'),/public|private|local/i);
});

test('captures require isolated output directory per run and explicit flags', () => {
  const one=captureDirectory('/tmp/run','reference','desktop','fixed-run-1');
  const two=captureDirectory('/tmp/run','reference','desktop','fixed-run-2');
  assert.notEqual(one,two);
  assert.ok(one.includes('fixed-run-1'));
  assert.throws(()=>parseFlags(['--out','./run','--record-video','--record-video']),/duplicate/i);
  assert.throws(()=>parseFlags(['--out','./run','--target','reference','--target','implementation']),/duplicate/i);
});

test('generators refuse non-empty existing destination and symlink dirs', () => {
  const dir=mkdtempSync(join(tmpdir(),'sky-output-'));
  try {
    assert.doesNotThrow(()=>assertFreshOutput(join(dir,'new-output')));
    assert.doesNotThrow(()=>assertFreshOutput(dir));
    writeFileSync(join(dir,'user-theme.liquid'),'valuable');
    assert.throws(()=>assertFreshOutput(dir),/non-empty/i);
    const link=join(dir,'symlink');
    symlinkSync(dir,link);
    assert.throws(()=>assertFreshOutput(link),/symlink/i);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
