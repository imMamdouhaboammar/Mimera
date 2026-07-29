import { expect, test } from "bun:test";
import {
  AllCircuitBreakersTrippedError,
  OptimizationRouter,
  CostLimitExceededError,
  type ExecutionProvider,
} from "../src/index.ts";

test("OptimizationRouter executes primary provider when healthy and within cost limit", async () => {
  const primary: ExecutionProvider<string, string> = {
    id: "primary-fast",
    name: "Fast Primary Provider",
    costPerRun: 0.001,
    execute: async (input) => `Processed: ${input}`,
  };

  const router = new OptimizationRouter<string, string>({
    providers: [primary],
    guardrails: {
      maxCostPerRun: 0.05,
      timeoutMs: 1000,
      maxConsecutiveFailures: 2,
      cooldownMs: 5000,
    },
  });

  const result = await router.execute("hello world");

  expect(result.providerId).toBe("primary-fast");
  expect(result.output).toBe("Processed: hello world");
  expect(result.cost).toBe(0.001);
  expect(result.fallbackUsed).toBe(false);
  expect(result.attempts).toBe(1);
});

test("OptimizationRouter seamlessly fails over to cheap secondary when primary fails or timeouts", async () => {
  let primaryAttempts = 0;
  const failingPrimary: ExecutionProvider<string, string> = {
    id: "primary-unstable",
    name: "Unstable Primary",
    costPerRun: 0.005,
    execute: async () => {
      primaryAttempts++;
      throw new Error("Primary API 500 internal server error");
    },
  };

  const fallbackSecondary: ExecutionProvider<string, string> = {
    id: "secondary-cheap",
    name: "Cheap Backup Provider",
    costPerRun: 0.0005,
    execute: async (input) => `Fallback: ${input}`,
  };

  const router = new OptimizationRouter<string, string>({
    providers: [failingPrimary, fallbackSecondary],
    guardrails: {
      maxCostPerRun: 0.05,
      timeoutMs: 500,
      maxConsecutiveFailures: 2,
      cooldownMs: 5000,
    },
  });

  const result = await router.execute("test-failover");

  expect(result.providerId).toBe("secondary-cheap");
  expect(result.output).toBe("Fallback: test-failover");
  expect(result.fallbackUsed).toBe(true);
  expect(result.attempts).toBe(2);
  expect(primaryAttempts).toBe(1);
});

test("OptimizationRouter trips circuit breaker after maxConsecutiveFailures and bypasses provider during cooldown", async () => {
  let primaryCalls = 0;
  const failingPrimary: ExecutionProvider<string, string> = {
    id: "primary-flaky",
    name: "Flaky Primary",
    costPerRun: 0.002,
    execute: async () => {
      primaryCalls++;
      throw new Error("Connection timeout");
    },
  };

  const fallback: ExecutionProvider<string, string> = {
    id: "backup",
    name: "Backup Provider",
    costPerRun: 0.001,
    execute: async () => "backup-ok",
  };

  const router = new OptimizationRouter<string, string>({
    providers: [failingPrimary, fallback],
    guardrails: {
      maxCostPerRun: 0.05,
      timeoutMs: 200,
      maxConsecutiveFailures: 2,
      cooldownMs: 10000,
    },
  });

  // Call 1: Primary fails, fallbacks to backup
  await router.execute("run-1");
  expect(primaryCalls).toBe(1);

  // Call 2: Primary fails 2nd time -> Circuit Breaker Trips!
  await router.execute("run-2");
  expect(primaryCalls).toBe(2);
  expect(router.getProviderHealth("primary-flaky")?.circuitBreakerTripped).toBe(true);

  // Call 3: Primary is bypassed immediately due to tripped circuit breaker
  const res3 = await router.execute("run-3");
  expect(primaryCalls).toBe(2); // primary was NOT called
  expect(res3.providerId).toBe("backup");
});

test("OptimizationRouter trips circuit breaker or throws when cost exceeds maxCostPerRun", async () => {
  const overpriced: ExecutionProvider<string, string> = {
    id: "overpriced",
    name: "Overpriced Provider",
    costPerRun: 0.10, // Exceeds 0.05 limit
    execute: async () => "expensive-output",
  };

  const cheap: ExecutionProvider<string, string> = {
    id: "cheap",
    name: "Cheap Provider",
    costPerRun: 0.01,
    execute: async () => "cheap-output",
  };

  const router = new OptimizationRouter<string, string>({
    providers: [overpriced, cheap],
    guardrails: {
      maxCostPerRun: 0.05,
      timeoutMs: 1000,
      maxConsecutiveFailures: 2,
      cooldownMs: 5000,
    },
  });

  const res = await router.execute("cost-check");
  expect(res.providerId).toBe("cheap");
  expect(res.output).toBe("cheap-output");
  expect(res.fallbackUsed).toBe(true);
});
