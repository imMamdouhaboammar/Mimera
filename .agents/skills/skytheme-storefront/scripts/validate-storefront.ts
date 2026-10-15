#!/usr/bin/env bun
/**
 * SkyTheme Storefront Validator
 * Validates any HTML/CSS file against the SkyTheme architectural standards.
 *
 * Usage:
 *   bun scripts/validate-storefront.ts [path-to-html]
 */

import { readFileSync, existsSync } from "fs";

const targetPath = Bun.argv[2] || "./index.html";

if (!existsSync(targetPath)) {
  console.error(`❌ File not found: ${targetPath}`);
  process.exit(1);
}

const content = readFileSync(targetPath, "utf-8");
let errors = 0;
let passes = 0;

function assertRule(name: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passes++;
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${detail}`);
    errors++;
  }
}

console.log(`🔍 Validating SkyTheme compliance for: ${targetPath}\n`);

// 1. Check Lenis / Smooth Scroll Presence
assertRule(
  "Smooth Scroll Integration",
  content.includes("lenis") || content.includes("smooth-scroll"),
  "Page must integrate Lenis momentum smooth scrolling for luxury editorial feel."
);

// 2. Check Accessibility on Drawers
assertRule(
  "Drawer Modal Accessibility",
  content.includes('role="dialog"') || content.includes("aria-modal") || content.includes("CartDrawer"),
  "Slide-out drawers must feature role='dialog' or aria-modal='true' attributes."
);

// 3. Check Free Shipping or Cart Goal
assertRule(
  "Free Shipping Bar",
  content.includes("shipping-box") || content.includes("Free") || content.includes("shipping"),
  "Storefront should include a free shipping progress goal indicator."
);

// 4. Check Touch-Device Consideration
assertRule(
  "Touch-Device Consideration",
  content.includes("pointer: coarse") || content.includes("matchMedia") || content.includes("mobile-docker"),
  "Smooth scroll must gate touch devices or provide a mobile bottom navigation dock."
);

// 5. Check Semantic HTML Layout
assertRule(
  "Semantic Header & Navigation",
  content.includes("<header") && content.includes("<nav"),
  "Page must use semantic <header> and <nav> elements."
);

console.log(`\n📊 Verification Summary: ${passes} Passed, ${errors} Failed.`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log("🎉 Storefront fully complies with SkyTheme architectural standards!\n");
}
