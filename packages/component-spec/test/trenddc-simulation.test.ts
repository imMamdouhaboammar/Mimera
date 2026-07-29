import { expect, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const targetDir = "/tmp/trenddc-simulation-page";

test("TrendDC simulation page exists and contains valid RTL HTML structure", async () => {
  const htmlPath = join(targetDir, "index.html");
  expect((await stat(htmlPath)).isFile()).toBe(true);

  const html = await readFile(htmlPath, "utf8");
  expect(html).toContain('dir="rtl"');
  expect(html).toContain('lang="ar"');
  expect(html).toContain("<header");
  expect(html).toContain("</header>");
  expect(html).toContain("<section class=\"hero\"");
  expect(html).toContain("TrendDC");
});

test("TrendDC navbar contains all original navigation links", async () => {
  const html = await readFile(join(targetDir, "index.html"), "utf8");

  const requiredLinks = ["الرئيسية", "من نحن", "خدماتنا", "المنتجات", "المدونة", "المشاريع", "اتصل بنا"];
  for (const linkText of requiredLinks) {
    expect(html).toContain(linkText);
  }
});

test("TrendDC stylesheet includes glassmorphism, sticky header, and responsive media queries", async () => {
  const cssPath = join(targetDir, "styles.css");
  expect((await stat(cssPath)).isFile()).toBe(true);

  const css = await readFile(cssPath, "utf8");
  expect(css).toContain("position: sticky");
  expect(css).toContain("backdrop-filter");
  expect(css).toContain("@media");
});
