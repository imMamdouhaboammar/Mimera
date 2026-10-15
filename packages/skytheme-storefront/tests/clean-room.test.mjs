import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initRun, newManifest, safeEvidence, auditRun } from '../scripts/clean-room.mjs';

test('rejects local paths and credential URLs', () => {
  assert.throws(() => newManifest('file:///etc/passwd'), /Reference/);
  assert.throws(() => newManifest('https://user:secret@example.com'), /Reference/);
  assert.equal(newManifest('https://example.com/').scenarios.length, 5);
});
test('creates clean room with pending gates; never overwrites a run', () => {
  const root = mkdtempSync(join(tmpdir(), 'skyroom-'));
  try {
    initRun(root, 'https://example.com/');
    const run = JSON.parse(readFileSync(join(root,'run.json'), 'utf8'));
    assert.equal(run.gates.shopifyThemeCheck.status, 'pending');
    assert.equal(auditRun(root, run).releaseReady, false);
    assert.throws(() => initRun(root, 'https://example.com/'), /already exists/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('evidence must exist inside the run and match digest', () => {
  const root = mkdtempSync(join(tmpdir(), 'skyproof-'));
  try {
    writeFileSync(join(root, 'proof.txt'), 'measured');
    const digest = createHash('sha256').update('measured').digest('hex');
    assert.equal(safeEvidence(root, { path: 'proof.txt', sha256: digest }), true);
    assert.equal(safeEvidence(root, { path: '../proof.txt', sha256: digest }), false);
    assert.equal(safeEvidence(root, { path: 'proof.txt', sha256: 'fake' }), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
