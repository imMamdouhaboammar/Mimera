import { isIP } from "node:net";

function parseIpv4(address: string): number[] | null {
  if (isIP(address) !== 4) return null;
  return address.split(".").map(Number);
}

export function isPrivateOrReservedAddress(address: string): boolean {
  const ipv4 = parseIpv4(address);
  if (ipv4) {
    const [a = 0, b = 0] = ipv4;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }

  if (isIP(address) !== 6) return true;
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("::ffff:")) {
    return isPrivateOrReservedAddress(normalized.slice("::ffff:".length));
  }
  return false;
}
