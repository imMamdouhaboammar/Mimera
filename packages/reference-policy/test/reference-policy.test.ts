import { describe, expect, test } from "bun:test";
import {
  NavigationDeniedError,
  ReferencePolicy,
  parseRobotsTxt,
} from "../src/index.ts";

describe("ReferencePolicy navigation", () => {
  test("allows an authorized public origin", async () => {
    const policy = new ReferencePolicy({
      allowedOrigins: ["https://example.com"],
      resolveHost: async () => ["93.184.216.34"],
    });

    await expect(policy.assertNavigation("https://example.com/docs")).resolves.toBeUndefined();
  });

  test("denies origins outside the authorization scope", async () => {
    const policy = new ReferencePolicy({
      allowedOrigins: ["https://example.com"],
      resolveHost: async () => ["93.184.216.34"],
    });

    await expect(policy.assertNavigation("https://other.example/path")).rejects.toMatchObject({
      reasonCode: "ORIGIN_NOT_ALLOWED",
    });
  });

  test("denies private IP literals", async () => {
    const policy = new ReferencePolicy({
      allowedOrigins: ["http://127.0.0.1:3000"],
      resolveHost: async () => ["127.0.0.1"],
    });

    await expect(policy.assertNavigation("http://127.0.0.1:3000")).rejects.toBeInstanceOf(
      NavigationDeniedError,
    );
  });

  test("denies public hostnames that resolve to private addresses", async () => {
    const policy = new ReferencePolicy({
      allowedOrigins: ["https://reference.example"],
      resolveHost: async () => ["10.0.0.8"],
    });

    await expect(policy.assertNavigation("https://reference.example")).rejects.toMatchObject({
      reasonCode: "PRIVATE_NETWORK_BLOCKED",
    });
  });

  test("can explicitly allow loopback only for local fixtures", async () => {
    const policy = new ReferencePolicy({
      allowedOrigins: ["http://127.0.0.1:3000"],
      allowLoopback: true,
      allowHttp: true,
      resolveHost: async () => ["127.0.0.1"],
    });

    await expect(policy.assertNavigation("http://127.0.0.1:3000")).resolves.toBeUndefined();
  });
});

describe("robots.txt policy", () => {
  const rules = parseRobotsTxt(`
User-agent: MimeraBot
Disallow: /private
Allow: /private/public

User-agent: *
Disallow: /blocked-for-all
`);

  test("uses the most specific matching path rule", () => {
    expect(rules.isAllowed("MimeraBot", "/private/page")).toBe(false);
    expect(rules.isAllowed("MimeraBot", "/private/public/example")).toBe(true);
  });

  test("falls back to wildcard user-agent rules", () => {
    expect(rules.isAllowed("OtherBot", "/blocked-for-all/page")).toBe(false);
    expect(rules.isAllowed("OtherBot", "/public")).toBe(true);
  });
});
