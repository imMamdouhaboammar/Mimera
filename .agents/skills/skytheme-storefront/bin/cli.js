#!/usr/bin/env bun
/**
 * SkyTheme Storefront Universal CLI Entrypoint
 * Usage:
 *   npx skytheme-storefront generate --name "Brand" --out ./store
 *   npx skytheme-storefront validate ./store/index.html
 *   npx skytheme-storefront eval
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
  process.exit(result.status ?? 0);
} else if (command === "validate" || command === "check") {
  const scriptPath = join(rootDir, "scripts", "validate-storefront.ts");
  const result = spawnSync("bun", [scriptPath, ...args.slice(1)], { stdio: "inherit" });
  process.exit(result.status ?? 0);
} else if (command === "eval" || command === "test" || command === "benchmark") {
  const scriptPath = join(rootDir, "scripts", "run-evals.ts");
  const result = spawnSync("bun", [scriptPath, ...args.slice(1)], { stdio: "inherit" });
  process.exit(result.status ?? 0);
} else {
  console.log(`
✨ SkyTheme Luxury Storefront CLI v1.1.0

Commands:
  generate, new     Scaffold a complete SkyTheme luxury storefront
                    --name <brand>   Brand name (default: AURA LUXE)
                    --out <dir>      Output directory (default: ./storefront-dist)
                    --scheme <id>    Color scheme (scheme-1 to scheme-5)

  validate, check   Validate any HTML file against SkyTheme design invariants
                    Usage: skytheme-storefront validate ./dist/index.html

  eval, benchmark   Run the behavioral evaluation benchmark suite
                    Usage: skytheme-storefront eval

  help              Display this help menu
  `);
  process.exit(0);
}
