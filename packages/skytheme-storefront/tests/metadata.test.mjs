import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('skill/package versions and documented runbook links agree', () => {
  const root = resolve(import.meta.dirname, '..');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const skill = JSON.parse(readFileSync(resolve(root, '.skills.json'), 'utf8'));
  const frontmatter = readFileSync(resolve(root, 'SKILL.md'), 'utf8').split('---')[1];
  const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
  assert.equal(pkg.version, skill.version);
  assert.match(frontmatter, new RegExp('version: ["\\x27]?' + pkg.version.replaceAll('.', '\\.') + '["\\x27]?'));
  assert.ok(readme.includes('version-' + pkg.version));
  for (const path of [...skill.references,...skill.scripts]) assert.ok(existsSync(resolve(root,path)), 'Missing skill artifact: '+path);
});
