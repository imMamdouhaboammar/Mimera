import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { chromium, type Browser, type Page } from "playwright";
import { generateStorefrontHtml, generateStoreAppJs } from "../scripts/generate-storefront.ts";

describe("skytheme-storefront browser runtime", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    const html = generateStorefrontHtml("Browser Test Store")
      .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*><\/script>/g, "")
      .replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, "");
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.addScriptTag({ content: generateStoreAppJs() });
  });

  afterEach(async () => {
    await page?.close();
  });

  test("cart drawer opens with dialog semantics, focus and close restoration", async () => {
    const open = page.locator("#cartOpenBtn");
    const drawer = page.locator("#cartDrawer");
    await open.click();
    await page.waitForFunction(() => document.getElementById("cartCloseBtn") === document.activeElement);

    expect(await drawer.evaluate(el => el.classList.contains("is-open"))).toBe(true);
    expect(await drawer.getAttribute("aria-hidden")).toBe("false");
    expect(await drawer.getAttribute("aria-modal")).toBe("true");
    expect(await page.locator("body").evaluate(el => window.getComputedStyle(el).overflow)).toBe("hidden");
    expect(await page.locator("#cartCloseBtn").evaluate(el => el === document.activeElement)).toBe(true);

    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.getElementById("cartOpenBtn") === document.activeElement);
    expect(await drawer.evaluate(el => el.classList.contains("is-open"))).toBe(false);
    expect(await open.evaluate(el => el === document.activeElement)).toBe(true);
  });

  test("cart tab key wraps focus inside the active drawer", async () => {
    await page.locator("#cartOpenBtn").click();
    await page.waitForFunction(() => document.getElementById("cartCloseBtn") === document.activeElement);

    expect(await page.locator("#cartCloseBtn").evaluate(el => el === document.activeElement)).toBe(true);
    await page.keyboard.press("Shift+Tab");
    const lastBtn = page.locator("#cartDrawer button").last();
    expect(await lastBtn.evaluate(el => el === document.activeElement)).toBe(true);
  });

  test("hotspot selection updates accessible pressed state", async () => {
    const pins = page.locator("[data-hotspot]");
    await pins.first().click();
    expect(await pins.first().getAttribute("aria-pressed")).toBe("true");
    expect(await pins.last().getAttribute("aria-pressed")).toBe("false");
    const statusText = await page.locator("#hotspotStatus").textContent();
    expect(statusText).toContain("coat");
  });

  test("lookbook custom element initializes without browser errors", async () => {
    const errors: string[] = [];
    page.on("pageerror", err => errors.push(err.message));

    await page.locator("lookbook-carousel").scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    const isRegistered = await page.evaluate(() => Boolean(customElements.get("lookbook-carousel")));
    expect(isRegistered).toBe(true);
    expect(errors).toEqual([]);
  });
});
