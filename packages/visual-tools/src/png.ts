import { deflateSync, inflateSync } from "node:zlib";
import type { RawRgbaImage } from "./pixel-diff.ts";

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// CRC32 table
const crcTable: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Uint8Array, offset = 0, length = buffer.length): number {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    c = crcTable[(c ^ buffer[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buffer: Uint8Array): RawRgbaImage {
  // Validate PNG signature
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      throw new Error("Invalid PNG signature");
    }
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatParts: Uint8Array[] = [];

  while (pos < buffer.length) {
    const length = view.getUint32(pos, false);
    pos += 4;
    const chunkType = String.fromCharCode(
      buffer[pos]!,
      buffer[pos + 1]!,
      buffer[pos + 2]!,
      buffer[pos + 3]!,
    );
    pos += 4;

    const data = buffer.subarray(pos, pos + length);
    pos += length;
    // Skip 4-byte CRC
    pos += 4;

    if (chunkType === "IHDR") {
      const ihdrView = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = ihdrView.getUint32(0, false);
      height = ihdrView.getUint32(4, false);
      bitDepth = data[8]!;
      colorType = data[9]!;
      if (bitDepth !== 8) {
        throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
      }
    } else if (chunkType === "IDAT") {
      idatParts.push(data);
    } else if (chunkType === "IEND") {
      break;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error("Missing or invalid IHDR chunk in PNG");
  }

  // Concatenate IDAT parts
  const totalIdatLength = idatParts.reduce((acc, part) => acc + part.length, 0);
  const idatCombined = new Uint8Array(totalIdatLength);
  let offset = 0;
  for (const part of idatParts) {
    idatCombined.set(part, offset);
    offset += part.length;
  }

  // Decompress
  const decompressed = new Uint8Array(inflateSync(idatCombined));

  let bytesPerPixel = 4;
  if (colorType === 2) bytesPerPixel = 3; // RGB
  else if (colorType === 0) bytesPerPixel = 1; // Grayscale
  else if (colorType === 4) bytesPerPixel = 2; // Grayscale + Alpha
  else if (colorType === 6) bytesPerPixel = 4; // RGBA
  else {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  const stride = width * bytesPerPixel;
  const rawRgba = new Uint8Array(width * height * 4);

  let inPos = 0;
  let prevRow: Uint8Array | null = null;

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[inPos++]!;
    const row = new Uint8Array(stride);

    for (let x = 0; x < stride; x++) {
      const filtered = decompressed[inPos++]!;
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel]! : 0;
      const up = prevRow ? prevRow[x]! : 0;
      const upLeft = prevRow && x >= bytesPerPixel ? prevRow[x - bytesPerPixel]! : 0;

      let val = 0;
      switch (filterType) {
        case 0: // None
          val = filtered;
          break;
        case 1: // Sub
          val = (filtered + left) & 0xff;
          break;
        case 2: // Up
          val = (filtered + up) & 0xff;
          break;
        case 3: // Average
          val = (filtered + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4: // Paeth
          val = (filtered + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unknown PNG scanline filter: ${filterType}`);
      }
      row[x] = val;
    }

    // Convert row to RGBA
    const outRowStart = y * width * 4;
    for (let col = 0; col < width; col++) {
      const inColStart = col * bytesPerPixel;
      const outIdx = outRowStart + col * 4;

      if (colorType === 6) {
        rawRgba[outIdx] = row[inColStart]!;
        rawRgba[outIdx + 1] = row[inColStart + 1]!;
        rawRgba[outIdx + 2] = row[inColStart + 2]!;
        rawRgba[outIdx + 3] = row[inColStart + 3]!;
      } else if (colorType === 2) {
        rawRgba[outIdx] = row[inColStart]!;
        rawRgba[outIdx + 1] = row[inColStart + 1]!;
        rawRgba[outIdx + 2] = row[inColStart + 2]!;
        rawRgba[outIdx + 3] = 255;
      } else if (colorType === 0) {
        const gray = row[inColStart]!;
        rawRgba[outIdx] = gray;
        rawRgba[outIdx + 1] = gray;
        rawRgba[outIdx + 2] = gray;
        rawRgba[outIdx + 3] = 255;
      } else if (colorType === 4) {
        const gray = row[inColStart]!;
        rawRgba[outIdx] = gray;
        rawRgba[outIdx + 1] = gray;
        rawRgba[outIdx + 2] = gray;
        rawRgba[outIdx + 3] = row[inColStart + 1]!;
      }
    }

    prevRow = row;
  }

  return { width, height, data: rawRgba };
}

function writeChunk(type: string, data: Uint8Array): Uint8Array {
  const length = data.length;
  const chunk = new Uint8Array(4 + 4 + length + 4);
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);

  view.setUint32(0, length, false);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);

  chunk.set(data, 8);

  // CRC is calculated over chunk type + data
  const crcVal = crc32(chunk.subarray(4, 8 + length));
  view.setUint32(8 + length, crcVal, false);

  return chunk;
}

export function encodePng(image: RawRgbaImage): Uint8Array {
  const { width, height, data } = image;
  const stride = width * 4;

  // Each scanline has 1 filter byte (0) + stride bytes
  const scanlines = new Uint8Array(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (1 + stride);
    scanlines[scanlineOffset] = 0; // Filter: None
    scanlines.set(data.subarray(y * stride, (y + 1) * stride), scanlineOffset + 1);
  }

  const deflatedData = new Uint8Array(deflateSync(scanlines));

  // Build IHDR data
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8; // bitDepth
  ihdrData[9] = 6; // colorType RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = writeChunk("IHDR", ihdrData);
  const idatChunk = writeChunk("IDAT", deflatedData);
  const iendChunk = writeChunk("IEND", new Uint8Array(0));

  const totalLength = PNG_SIGNATURE.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLength);

  let offset = 0;
  png.set(PNG_SIGNATURE, offset);
  offset += PNG_SIGNATURE.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);

  return png;
}
