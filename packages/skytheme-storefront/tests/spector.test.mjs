import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spectorPath, spectorDoctor, spectorPlan, spectorInstall, SPECTOR_REPOSITORY } from '../scripts/setup-spector.mjs';
import { makeMcpConfig } from '../scripts/support-tools.mjs';

test('Spector installer identifies canonical upstream and is opt-in', () => {
  const root = mkdtempSync(join(tmpdir(), 'spector-'));
  try {
    const plan = spectorPlan(root);
    assert.equal(plan.steps[0][0], 'git');
    assert.ok(plan.steps[0].includes(SPECTOR_REPOSITORY));
    assert.equal(plan.built, false);
    assert.equal(spectorDoctor(root).cloned, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('Spector registration is available only when built', () => {
  const root = mkdtempSync(join(tmpdir(), 'spector-'));
  try {
    const dir = spectorPath(root);
    mkdirSync(join(dir, 'mcp','dist'), { recursive: true });
    writeFileSync(join(dir, 'mcp','dist','index.js'), '//test');
    assert.equal(spectorDoctor(root).built, true);
    const config = makeMcpConfig(root, dir);
    assert.equal(config.mcpServers.spector.command, 'node');
    assert.equal(config.mcpServers.spector.args[0], join(dir, 'mcp','dist','index.js'));
    assert.throws(() => spectorInstall(root, () => { throw new Error('must not clone'); }), /exists/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
