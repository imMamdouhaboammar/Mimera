/**
 * Deterministic generator checks. These ARE NOT browser, Shopify, reference-parity,
 * or agent-routing evaluations. See tests/browser.spec.ts for browser behavior.
 */
import { generateStorefrontHtml, generateTokensCss, generateStoreAppJs } from "./generate-storefront";
import { strict as assert } from "node:assert";

type Check = { name: string; run: () => void };
const html = generateStorefrontHtml("EVAL LUXE", "scheme-1");
const css = generateTokensCss();
const js = generateStoreAppJs();

const checks: Check[] = [
  { name: "Generated JavaScript is syntactically executable", run: () => {
      assert.doesNotThrow(() => new Function(js));
      assert.ok(!js.includes(" as any"), "TypeScript assertions leaked into browser JavaScript");
    } },
  { name: "Output HTML includes semantic navigation and product story sections", run: () => {
      assert.match(html, /<header\b/);
      assert.match(html, /<nav\b/);
      assert.match(html, /<lookbook-carousel\b/);
      assert.match(html, /data-hotspot="true"/);
    } },
  { name: "Cart drawer exposes a dialog and dismiss action", run: () => {
      assert.match(html, /<bag-drawer[^>]+role="dialog"[^>]+aria-modal="true"/);
      assert.match(js, /class BagDrawer extends HTMLElement/);
      assert.match(js, /Escape/);
      assert.match(js, /document\.activeElement/);
    } },
  { name: "Reduced-motion and touch protections exist", run: () => {
      assert.match(js, /prefers-reduced-motion: reduce/);
      assert.match(js, /pointer: coarse/);
      assert.match(js, /lenis\?\.destroy/);
    } },
  { name: "Input HTML is escaped and invalid schemes rejected", run: () => {
      assert.ok(generateStorefrontHtml('<img src=x onerror=alert(1)>').includes('&lt;img'));
      assert.ok(!generateStorefrontHtml('<img src=x onerror=alert(1)>').includes('<img src=x onerror=alert(1)>'));
      assert.throws(() => generateStorefrontHtml("Brand","wrong-scheme"), /Invalid scheme/);
    } },
  { name: "Token output supports declared initial color scheme", run: () => {
      assert.match(css, /--colorBackground:/);
      assert.match(html, /scheme-1/);
    } }
];

let failures = 0;
for (const check of checks) {
  try { check.run(); console.log("PASS: " + check.name); }
  catch (error) { failures++; console.error("FAIL: " + check.name, error); }
}
console.log("\nGenerator checks: " + (checks.length - failures) + "/" + checks.length);
console.log("Not assessed: agent-skill routing, original Sky visual parity, Shopify commerce, real keyboard interactions.");
console.log("Run browser E2E separately: bun run test:browser");
if (failures) process.exit(1);
