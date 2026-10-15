#!/usr/bin/env node
/** Opt-in, isolated support-tool bootstrap. No command mutates the system without --apply. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const TOOL_PACKAGES = Object.freeze({
  rea: { package: 'rea-agents@4.1.0', binary: 'rea', role: 'Evidence-oriented investigation and scenario comparisons' },
  chrome: { package: 'chrome-devtools-mcp@latest', binary: 'chrome-devtools-mcp', role: 'Browser performance, styles and runtime observation' },
  playwright: { package: '@playwright/mcp@latest', binary: 'playwright-mcp', role: 'Controlled interactions and browser scenarios' },
  shopify: { package: '@shopify/cli@latest', binary: 'shopify', role: 'Theme Check and authenticated development-theme preview' }
});
export function packageName(specifier) {
  if (specifier.startsWith('@')) {
    const delimiter = specifier.indexOf('@', 1);
    return delimiter < 0 ? specifier : specifier.slice(0, delimiter);
  }
  return specifier.split('@')[0];
}

export const DEFAULT_PREFIX = join(homedir(), '.cache', 'skytheme-support-tools');
const ALL = Object.keys(TOOL_PACKAGES);

export function supportedNode(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return (major === 22 && minor >= 19) || (major === 24 && minor >= 11) || major >= 26;
}

export function selectTools(raw = 'rea,chrome,playwright,shopify') {
  const requested = raw.split(',').map(x => x.trim()).filter(Boolean);
  if (!requested.length || requested.some(x => !ALL.includes(x)) || new Set(requested).size !== requested.length) {
    throw new Error("Invalid --tools. Choose unique names: " + ALL.join(", "));
  }
  return requested;
}

export function makeMcpConfig(prefix = DEFAULT_PREFIX, includeSpector = null) {
  const servers = {};
  for (const name of ['rea', 'chrome', 'playwright']) {
    const spec = TOOL_PACKAGES[name];
    const executable = join(resolve(prefix), 'node_modules', '.bin', spec.binary + (process.platform === 'win32' ? '.cmd' : ''));
    const tail = name === 'rea' ? ['mcp'] : name === 'chrome' ? ['--no-usage-statistics', '--no-performance-crux', '--no-javascript-evaluation', '--no-source-maps', '--no-file-navigations'] : ['--isolated'];
    // Never trigger an unattended npm download while an MCP host starts.
    // Configuration may be emitted before installation but tools then fail closed.
    servers[name === 'chrome' ? 'chrome-devtools' : name] = { command: executable, args: tail };
  }
  if (includeSpector) {
    const root = resolve(includeSpector);
    const entry = join(root, 'mcp', 'dist', 'index.js');
    if (!existsSync(entry)) throw new Error("Spector MCP is not built: " + entry + ". See references/clean-room-toolchain.md");
    servers.spector = { command: 'node', args: [entry] };
  }
  return { mcpServers: servers };
}

export function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply' || arg === '--json') flags[arg.slice(2)] = true;
    else if (['--tools', '--prefix', '--spector-root'].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error("Missing value for " + arg);
      flags[arg.slice(2)] = args[++i];
    } else throw new Error("Unknown argument: " + arg);
  }
  return flags;
}

export function status(prefix = DEFAULT_PREFIX) {
  return {
    node: { version: process.versions.node, supported: supportedNode() },
    npmAvailable: Boolean(spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { encoding: 'utf8', timeout: 10000 }).status === 0),
    prefix: resolve(prefix),
    tools: Object.fromEntries(ALL.map(name => {
      const spec = TOOL_PACKAGES[name];
      const pkgPath = join(resolve(prefix), 'node_modules', ...packageName(spec.package).split('/'), 'package.json');
      let version = null;
      try { version = JSON.parse(readFileSync(pkgPath, 'utf8')).version; } catch { /* Not installed */ }
      return [name, { installed: Boolean(version), version, role: spec.role }];
    }))
  };
}

export function installPlan(selected, prefix = DEFAULT_PREFIX) {
  return {
    prefix: resolve(prefix),
    packages: selected.map(x => TOOL_PACKAGES[x].package),
    command: ['npm', 'install', '--prefix', resolve(prefix), '--save-exact', '--no-audit', '--no-fund', ...selected.map(x => TOOL_PACKAGES[x].package)],
    note: 'Installing npm packages executes third-party installation scripts. Review the sources first. Only --apply executes the command. Shopify login and Spector build are separate opt-in steps.'
  };
}

export function runInstall(selected, prefix = DEFAULT_PREFIX, executor = spawnSync) {
  if (!supportedNode()) throw new Error("Node " + process.versions.node + " is unsupported for REA. Use Node >=22.19, >=24.11, or >=26.");
  const { command } = installPlan(selected, prefix);
  const binary = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = executor(binary, command.slice(1), { stdio: 'inherit', timeout: 600000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("npm installation failed (exit " + (result.status ?? "unknown") + ")");
}

export function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'help';
  const flags = parseArgs(argv.slice(1));
  const prefix = flags.prefix || DEFAULT_PREFIX;
  if (command === 'help') {
    console.log('support-tools: doctor [--json] | plan [--tools rea,chrome,playwright,shopify] | install [--tools ...] --apply | mcp-config [--spector-root PATH]');
  } else if (command === 'doctor') {
    const report = status(prefix);
    console.log(flags.json ? JSON.stringify(report, null, 2) : JSON.stringify(report, null, 2) + "\nNode must meet REA requirements; not a substitute for live MCP health checks.");
  } else if (command === 'plan' || command === 'install') {
    const plan = installPlan(selectTools(flags.tools), prefix);
    if (command === 'install' && flags.apply) {
      runInstall(selectTools(flags.tools), prefix);
      console.log('Installed locally. Restart your agent after registering mcp-config; verify each MCP server using a real tool call.');
    } else {
      console.log(JSON.stringify({ ...plan, executed: false, next: 'Run install --apply after reviewing the package sources and command' }, null, 2));
    }
  } else if (command === 'mcp-config') {
    console.log(JSON.stringify(makeMcpConfig(prefix, flags['spector-root']), null, 2));
  } else throw new Error("Unknown command: " + command);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { main(); } catch (e) { console.error("ERROR: " + e.message); process.exitCode = 2; }
}
