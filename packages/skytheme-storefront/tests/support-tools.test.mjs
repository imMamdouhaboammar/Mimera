import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TOOL_PACKAGES, selectTools, installPlan, makeMcpConfig, supportedNode, status } from '../scripts/support-tools.mjs';

test('rejects invalid tools and duplicate selections', () => {
  assert.throws(() => selectTools('rea,rm -rf /'), /Invalid/);
  assert.throws(() => selectTools('rea,rea'), /Invalid/);
  assert.deepEqual(selectTools('rea,playwright'), ['rea', 'playwright']);
});
test('requires supported Node versions for REA', () => {
  assert.equal(supportedNode('22.18.0'), false);
  assert.equal(supportedNode('22.19.0'), true);
  assert.equal(supportedNode('24.10.0'), false);
  assert.equal(supportedNode('24.11.0'), true);
  assert.equal(supportedNode('25.4.0'), false);
  assert.equal(supportedNode('26.0.0'), true);
});
test('scoped installation plan never modifies global npm packages', () => {
  const plan = installPlan(['rea', 'shopify'], '/tmp/skytheme-tooltest');
  assert.deepEqual(plan.packages, [TOOL_PACKAGES.rea.package, TOOL_PACKAGES.shopify.package]);
  assert.ok(plan.command.includes('--prefix'));
  assert.ok(!plan.command.includes('--global'));
});
test('MCP config uses isolated execution and rejects unbuilt Spector', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skytools-'));
  try {
    const conf = makeMcpConfig(dir);
    assert.deepEqual(Object.keys(conf.mcpServers), ['rea', 'chrome-devtools', 'playwright']);
    assert.ok(conf.mcpServers.rea.args.includes('mcp'));
    assert.ok(conf.mcpServers['chrome-devtools'].args.includes('--no-usage-statistics'));
    assert.ok(conf.mcpServers.playwright.args.includes('--isolated'));
    assert.throws(() => makeMcpConfig(dir, dir), /not built/);
    assert.equal(status(dir).tools.rea.installed, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
