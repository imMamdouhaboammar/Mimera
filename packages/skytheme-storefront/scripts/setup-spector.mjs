#!/usr/bin/env node
/** Explicit, opt-in WebGL inspector setup. Does not modify other MCP clients. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DEFAULT_PREFIX } from './support-tools.mjs';

export const SPECTOR_REPOSITORY = 'https://github.com/BabylonJS/Spector.js.git';

export function spectorPath(prefix = DEFAULT_PREFIX) {
  return join(resolve(prefix), 'vendors', 'Spector.js');
}
export function spectorDoctor(prefix = DEFAULT_PREFIX) {
  const root = spectorPath(prefix);
  const entry = join(root, 'mcp', 'dist', 'index.js');
  let commit = null;
  if (existsSync(join(root, '.git'))) {
    const run = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 10000 });
    if (run.status === 0) commit = run.stdout.trim();
  }
  return { root, entry, cloned: existsSync(join(root, '.git')), built: existsSync(entry), commit, installedInAgent: false };
}
export function spectorPlan(prefix = DEFAULT_PREFIX) {
  const state = spectorDoctor(prefix);
  return {
    ...state,
    steps: [
      ['git', 'clone', '--depth', '1', SPECTOR_REPOSITORY, state.root],
      ['npm', 'run', 'mcp:install'],
      ['npm', 'run', 'mcp:build']
    ],
    notes: 'Runs scripts from third-party source and may download Chromium. Review upstream license, content, and commit before applying. The agent MCP registration is NOT changed automatically.'
  };
}
export function spectorInstall(prefix = DEFAULT_PREFIX, executor = spawnSync) {
  const plan = spectorPlan(prefix);
  if (plan.cloned || existsSync(plan.root)) throw new Error('Spector destination exists; inspect it manually (refusing to overwrite)');
  mkdirSync(join(resolve(prefix), 'vendors'), { recursive: true });
  const commands = plan.steps;
  for (let i = 0; i < commands.length; i++) {
    const [command, ...args] = commands[i];
    const result = executor(command, args, { cwd: i === 0 ? resolve(prefix) : plan.root, stdio: 'inherit', timeout: 600000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(command + ' failed with exit ' + (result.status ?? 'unknown'));
  }
  if (!existsSync(join(plan.root, 'mcp', 'dist', 'index.js'))) throw new Error('Spector MCP build output missing');
  return spectorDoctor(prefix);
}
export function main(argv = process.argv.slice(2)) {
  const action = argv[0] || 'plan';
  let prefix = DEFAULT_PREFIX, apply = false;
  for (let i=1;i<argv.length;i++) {
    if (argv[i] === '--prefix' && argv[i+1]) prefix=argv[++i];
    else if (argv[i] === '--apply') apply = true;
    else throw new Error('Unknown argument: ' + argv[i]);
  }
  if (action === 'doctor') console.log(JSON.stringify(spectorDoctor(prefix), null, 2));
  else if (action === 'plan') console.log(JSON.stringify(spectorPlan(prefix), null, 2));
  else if (action === 'install') {
    if (!apply) console.log(JSON.stringify({ ...spectorPlan(prefix), executed: false, next: 'Re-run install --apply only after reviewing source and commands' }, null, 2));
    else console.log(JSON.stringify(spectorInstall(prefix), null, 2));
  } else throw new Error('Usage: spector doctor|plan|install [--prefix PATH] [--apply]');
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { main(); } catch (error) { console.error("ERROR: " + error.message); process.exitCode=2; }
}
