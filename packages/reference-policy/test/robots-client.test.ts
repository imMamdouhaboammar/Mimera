import { describe, expect, test } from "bun:test";
import {
  RobotsDeniedError,
  RobotsPolicyClient,
} from "../src/index.ts";

describe("RobotsPolicyClient", () => {
  test("denies paths disallowed for MimeraBot", async () => {
    const client = new RobotsPolicyClient({
      fetch: async () => new Response("User-agent: MimeraBot\nDisallow: /private", { status: 200 }),
    });

    await expect(client.assertAllowed("https://example.com/private/page")).rejects.toBeInstanceOf(
      RobotsDeniedError,
    );
  });

  test("allows navigation when robots.txt is absent", async () => {
    const client = new RobotsPolicyClient({
      fetch: async () => new Response("not found", { status: 404 }),
    });

    await expect(client.assertAllowed("https://example.com/public")).resolves.toBeUndefined();
  });

  test("caches robots.txt by origin", async () => {
    let calls = 0;
    const client = new RobotsPolicyClient({
      fetch: async () => {
        calls += 1;
        return new Response("User-agent: *\nAllow: /", { status: 200 });
      },
    });

    await client.assertAllowed("https://example.com/one");
    await client.assertAllowed("https://example.com/two");
    expect(calls).toBe(1);
  });
});
