import { expect, test } from "bun:test";
import { decodePng, encodePng } from "../src/png.ts";
import type { RawRgbaImage } from "../src/pixel-diff.ts";

test("PNG encoder and decoder roundtrips RGBA image losslessly", () => {
  const width = 8;
  const height = 8;
  const data = new Uint8Array(width * height * 4);

  // Fill with test patterns
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = (x * 32) & 0xff;     // R
      data[idx + 1] = (y * 32) & 0xff; // G
      data[idx + 2] = 128;             // B
      data[idx + 3] = 255;             // A
    }
  }

  const original: RawRgbaImage = { width, height, data };
  const encodedPng = encodePng(original);

  expect(encodedPng[0]).toBe(0x89);
  expect(encodedPng[1]).toBe(0x50);
  expect(encodedPng[2]).toBe(0x4e);
  expect(encodedPng[3]).toBe(0x47);

  const decoded = decodePng(encodedPng);
  expect(decoded.width).toBe(width);
  expect(decoded.height).toBe(height);
  expect(decoded.data.length).toBe(original.data.length);

  for (let i = 0; i < data.length; i++) {
    expect(decoded.data[i]).toBe(original.data[i]);
  }
});
