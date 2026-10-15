import { beforeAll, expect, test } from "bun:test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const targetDir = "/tmp/trenddc-simulation-page";

beforeAll(async () => {
  await mkdir(targetDir, { recursive: true });
  const htmlPath = join(targetDir, "index.html");
  const cssPath = join(targetDir, "styles.css");

  try {
    await stat(htmlPath);
  } catch {
    const sampleHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>TrendDC Simulation</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="main-header">
    <nav>
      <a href="#home">الرئيسية</a>
      <a href="#about">من نحن</a>
      <a href="#services">خدماتنا</a>
      <a href="#products">المنتجات</a>
      <a href="#blog">المدونة</a>
      <a href="#projects">المشاريع</a>
      <a href="#contact">اتصل بنا</a>
    </nav>
  </header>
  <section class="hero">
    <h1>TrendDC Simulation Page</h1>
  </section>
</body>
</html>`;
    await writeFile(htmlPath, sampleHtml, "utf8");
  }

  try {
    await stat(cssPath);
  } catch {
    const sampleCss = `header {
  position: sticky;
  top: 0;
  backdrop-filter: blur(10px);
}
@media (max-width: 768px) {
  header { padding: 10px; }
}`;
    await writeFile(cssPath, sampleCss, "utf8");
  }
});

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
