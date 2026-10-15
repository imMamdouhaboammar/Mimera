#!/usr/bin/env bun
/**
 * SkyTheme Storefront Universal CLI Entrypoint
 * Usage:
 *   bun bin/cli.js generate --name "Brand" --out ./store
 *   bun bin/cli.js validate ./store/index.html
 *   bun bin/cli.js eval
 */

import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const args = process.argv.slice(2);
const command = args[0] || "help";

if (command === "generate" || command === "new" || command === "scaffold") {
  const scriptPath = join(rootDir, "scripts", "generate-storefront.ts");
  const result = spawnSync("bun", [scriptPath, ...args.slice(1)], { stdio: "inherit" });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  process.exit(result.status ?? 1);
} else if (command === "shopify" || command === "generate:shopify") {
  const scriptPath = join(rootDir, "scripts", "generate-shopify-theme.ts");
  const result = spawnSync("bun", [scriptPath, ...args.slice(1)], { stdio: "inherit" });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  process.exit(result.status ?? 1);
} else if (command === "validate" || command === "check") {
  const scriptPath = join(rootDir, "scripts", "validate-storefront.ts");
  const result = spawnSync("bun", [scriptPath, ...args.slice(1)], { stdio: "inherit" });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  process.exit(result.status ?? 1);
} else if (command === "eval" || command === "test" || command === "benchmark") {
  const scriptPath = join(rootDir, "scripts", "run-evals.ts");
  const result = spawnSync("bun", [scriptPath, ...args.slice(1)], { stdio: "inherit" });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  process.exit(result.status ?? 1);
} else if (['tools', 'spector', 'clean-room', 'capture-motion'].includes(command)) {
  const scripts = { tools: 'support-tools.mjs', spector: 'setup-spector.mjs', 'clean-room': 'clean-room.mjs', 'capture-motion': 'capture-motion.mjs' };
  const result = spawnSync(process.execPath, [join(rootDir, 'scripts', scripts[command]), ...args.slice(1)], { stdio: 'inherit' });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  process.exit(result.status ?? 1);
} else {
  console.log(`
✨ SkyTheme Luxury Storefront CLI v1.2.1

Commands:
  generate, new     Generate a standalone HTML preview (not Shopify parity)
                    --name <brand>   Brand name (default: AURA LUXE)
                    --out <dir>      Output directory (default: ./storefront-dist)
                    --scheme <id>    Color scheme (scheme-1 to scheme-5)

  shopify            Generate a minimal OS2 Liquid starter (not parity certified)\n\n  validate, check   Validate any HTML file against SkyTheme design invariants
                    Usage: skytheme-storefront validate ./dist/index.html

  eval, benchmark   Run the behavioral evaluation benchmark suite
                    Usage: skytheme-storefront eval

  tools             Read-only doctor/plan, explicit install --apply, emit MCP config
  spector           Spector.js WebGL MCP doctor/plan/install --apply
  clean-room        Initialize or audit evidence-ledger project
  capture-motion    Sample scroll screenshots with Playwright and SHA-256

  help              Display this help menu
  `);
  process.exit(0);
}
