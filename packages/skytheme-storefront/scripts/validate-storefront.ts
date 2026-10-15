#!/usr/bin/env bun
/** Static bundle integrity validator. Browser functionality requires Playwright tests. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
const htmlPath = resolve(Bun.argv[2] || "./storefront-dist/index.html");
if (!existsSync(htmlPath)) { console.error("HTML not found: "+htmlPath); process.exit(1); }
const dir = dirname(htmlPath);
const html = readFileSync(htmlPath,"utf8");
const checks: Array<[string,boolean]> = [];
function check(name:string,ok:boolean){checks.push([name,ok]);console.log((ok?"PASS ":"FAIL ")+name);}
const jsPath=join(dir,"js","store-app.js");
const tokensPath=join(dir,"css","theme-tokens.css");
const componentsPath=join(dir,"css","theme-components.css");
check("Index has semantic header/navigation", /<header\b/i.test(html) && /<nav\b/i.test(html));
check("Index contains proper modal semantics", /<bag-drawer[^>]*role="dialog"[^>]*aria-modal="true"/.test(html));
check("Index contains lookbook and hotspots", /<lookbook-carousel\b/.test(html) && /data-hotspot="true"/.test(html));
for (const file of [jsPath,tokensPath,componentsPath]) check("Asset exists: "+file,existsSync(file));
if (existsSync(jsPath)) {
  const js=readFileSync(jsPath,"utf8");
  let valid=true;
  try { new Function(js); } catch(error) { valid=false;console.error("Browser JavaScript parse failure:",error); }
  check("Generated JS parses as JavaScript",valid);
  check("Touch and reduced-motion gates",js.includes("pointer: coarse") && js.includes("prefers-reduced-motion: reduce"));
  check("Drawer cleanup and keyboard handlers",js.includes("disconnectedCallback") && js.includes("onKeys"));
}
const failures=checks.filter(([,ok])=>!ok).length;
console.log("Static bundle integrity: "+(checks.length-failures)+"/"+checks.length+". Not a browser or Sky parity test.");
if(failures)process.exit(1);
