import { expect, test } from "bun:test";
import { BrowserDomEvidencePayloadSchema, type BrowserDomEvidencePayload } from "../src/index.ts";

test("validates persisted DOM evidence before downstream analysis", () => {
  const payload: BrowserDomEvidencePayload = {
    schemaVersion: "1",
    kind: "dom",
    viewport: { id: "desktop", width: 1440, height: 900, isMobile: false },
    data: {
      title: "Fixture",
      url: "https://example.com",
      lang: "en",
      direction: "ltr",
      bodyScrollHeight: 1400,
      nodes: [{
        tag: "header",
        classes: [],
        domPath: "body > header",
        text: "",
        visible: true,
        rect: { x: 0, y: 0, width: 1440, height: 72 },
        styles: {
          display: "block",
          position: "sticky",
          color: "rgb(0, 0, 0)",
          backgroundColor: "rgb(255, 255, 255)",
          fontFamily: "Arial",
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "24px",
          gap: "0px",
          padding: "0px",
          margin: "0px",
          borderRadius: "0px",
        },
      }],
    },
  };

  expect(BrowserDomEvidencePayloadSchema.parse(payload)).toEqual(payload);
  expect(() => BrowserDomEvidencePayloadSchema.parse({ ...payload, data: { ...payload.data, nodes: [{ tag: "header" }] } })).toThrow();
});
