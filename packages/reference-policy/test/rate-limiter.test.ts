import { expect, test } from "bun:test";
import { OriginRateLimiter } from "../src/index.ts";

test("spaces requests to the same origin without delaying other origins", async () => {
  let now = 1_000;
  const waits: number[] = [];
  const limiter = new OriginRateLimiter({
    minimumIntervalMs: 250,
    now: () => now,
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
      now += milliseconds;
    },
  });

  await limiter.acquire("https://example.com");
  await limiter.acquire("https://other.example");
  await limiter.acquire("https://example.com");

  expect(waits).toEqual([250]);
});
