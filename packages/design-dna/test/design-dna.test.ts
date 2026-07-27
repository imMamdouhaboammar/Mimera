import { describe, expect, test } from "bun:test";
import type {
  DomNodeEvidence,
  DomSnapshot,
  ViewportProfile,
} from "@mimera/browser-lab";
import {
  DesignDnaExtractor,
  type ViewportDomEvidence,
} from "../src/index.ts";

const desktop: ViewportProfile = { id: "desktop", width: 1440, height: 900, isMobile: false };
const mobile: ViewportProfile = { id: "mobile", width: 390, height: 844, isMobile: true };

function node(
  overrides: Partial<DomNodeEvidence> & Pick<DomNodeEvidence, "tag" | "domPath" | "visible">,
): DomNodeEvidence {
  const { tag, domPath, visible, ...rest } = overrides;
  return {
    tag,
    domPath,
    visible,
    classes: [],
    text: "",
    rect: { x: 0, y: 0, width: 100, height: 40 },
    styles: {
      display: "block",
      position: "static",
      color: "rgb(22, 22, 22)",
      backgroundColor: "rgba(0, 0, 0, 0)",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      fontWeight: "400",
      lineHeight: "24px",
      gap: "0px",
      padding: "0px",
      margin: "0px",
      borderRadius: "0px",
    },
    ...rest,
  };
}

function snapshot(viewport: ViewportProfile): DomSnapshot {
  const isDesktop = viewport.id === "desktop";
  return {
    title: "Fixture",
    url: "https://example.com",
    lang: "en",
    direction: "ltr",
    bodyScrollHeight: 1400,
    nodes: [
      node({
        tag: "header",
        dataComponent: "navbar",
        nearestComponent: "navbar",
        domPath: 'body > header[data-component="navbar"]',
        visible: true,
        rect: { x: 0, y: 0, width: viewport.width, height: isDesktop ? 72 : 60 },
        styles: {
          display: "block",
          position: "sticky",
          color: "rgb(22, 22, 22)",
          backgroundColor: "rgb(247, 245, 239)",
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "24px",
          gap: "0px",
          padding: isDesktop ? "0px 24px" : "0px 16px",
          margin: "0px",
          borderRadius: "0px",
        },
      }),
      node({
        tag: "nav",
        id: "main-nav",
        nearestComponent: "navbar",
        domPath: 'header[data-component="navbar"] > nav#main-nav',
        visible: isDesktop,
        styles: {
          display: isDesktop ? "flex" : "none",
          position: "static",
          color: "rgb(22, 22, 22)",
          backgroundColor: "rgba(0, 0, 0, 0)",
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "24px",
          gap: "24px",
          padding: "0px",
          margin: "0px",
          borderRadius: "0px",
        },
      }),
      node({
        tag: "button",
        ariaLabel: "Open menu",
        nearestComponent: "navbar",
        domPath: 'header[data-component="navbar"] > button',
        visible: !isDesktop,
        rect: { x: viewport.width - 60, y: 8, width: 44, height: 44 },
        styles: {
          display: isDesktop ? "none" : "grid",
          position: "static",
          color: "rgb(22, 22, 22)",
          backgroundColor: "rgba(0, 0, 0, 0)",
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "24px",
          gap: "0px",
          padding: "0px",
          margin: "0px",
          borderRadius: "12px",
        },
      }),
      node({
        tag: "main",
        domPath: "body > main",
        visible: true,
        rect: { x: 0, y: isDesktop ? 72 : 60, width: viewport.width, height: 1200 },
        styles: {
          display: "block",
          position: "static",
          color: "rgb(22, 22, 22)",
          backgroundColor: "rgb(247, 245, 239)",
          fontFamily: "Arial, sans-serif",
          fontSize: isDesktop ? "104px" : "52px",
          fontWeight: "700",
          lineHeight: isDesktop ? "96px" : "48px",
          gap: "0px",
          padding: "80px 24px",
          margin: "0px",
          borderRadius: "0px",
        },
      }),
    ],
  };
}

const evidence: ViewportDomEvidence[] = [
  { evidenceId: "dom-desktop", viewport: desktop, dom: snapshot(desktop) },
  { evidenceId: "dom-mobile", viewport: mobile, dom: snapshot(mobile) },
];

describe("DesignDnaExtractor", () => {
  test("extracts visual systems and responsive behavior from observed DOM evidence", () => {
    const result = new DesignDnaExtractor({ now: () => "2026-07-27T10:00:00.000Z" }).extract(evidence);

    expect(result.dna.signature.rhythmUnitPx).toBe(8);
    expect(result.dna.signature.cornerLanguage).toBe("soft");
    expect(result.dna.palette[0]?.value).toBe("rgb(22, 22, 22)");
    expect(result.dna.typography.some((sample) => sample.fontSizePx === 104)).toBe(true);
    expect(result.dna.responsiveRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "hidden-on-mobile", identity: "id:main-nav" }),
        expect.objectContaining({ type: "mobile-only", identity: "aria:Open menu" }),
        expect.objectContaining({ type: "navigation-collapses-to-menu" }),
      ]),
    );
    expect(result.decomposition.components.map((component) => component.id)).toEqual(["navbar", "main"]);
  });

  test("is deterministic regardless of viewport evidence input order", () => {
    const extractor = new DesignDnaExtractor({ now: () => "2026-07-27T10:00:00.000Z" });
    expect(extractor.extract([...evidence].reverse())).toEqual(extractor.extract(evidence));
  });
});
