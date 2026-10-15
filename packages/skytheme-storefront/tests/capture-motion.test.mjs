import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { newManifest } from '../scripts/clean-room.mjs';
import { validateCaptureUrl, parsePositions, parseFlags } from '../scripts/capture-motion.mjs';

test('capture URL is constrained to explicit reference origin', () => {
  const m = newManifest('https://skytheme-demo.myshopify.com/');
  assert.equal(validateCaptureUrl(m, 'reference', '/collections/all'), 'https://skytheme-demo.myshopify.com/collections/all');
  assert.throws(() => validateCaptureUrl(m, 'reference', 'https://different.example/'), /same-origin/);
  assert.throws(() => validateCaptureUrl(m, 'implementation', '/'), /Set implementation URL/);
});
test('positions are increasing normalized fractions', () => {
  assert.deepEqual(parsePositions(), [0,0.25,0.5,0.75,1]);
  assert.throws(() => parsePositions('0.5,0.4'), /strictly/);
  assert.throws(() => parsePositions('0,1.1'), /strictly/);
});
test('video recording is explicit rather than default', () => {
  assert.equal(parseFlags(['--out','./workbench'])['record-video'], undefined);
  assert.equal(parseFlags(['--out','./workbench','--record-video'])['record-video'], true);
});
test('rejects unexpected and excessive capture args', () => {
  assert.throws(() => parseFlags(['--out','./test','--settle-ms','9000']), /settle-ms/);
  assert.throws(() => parseFlags(['--out','./test','--cookie','secret']), /Unknown/);
});
