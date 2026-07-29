export class AllCircuitBreakersTrippedError extends Error {
  constructor() {
    super("All optimization providers are disabled or circuit breakers tripped");
    this.name = "AllCircuitBreakersTrippedError";
  }
}

export class CostLimitExceededError extends Error {
  readonly providerId: string;
  readonly cost: number;
  readonly maxCost: number;

  constructor(providerId: string, cost: number, maxCost: number) {
    super(`Provider '${providerId}' cost $${cost} exceeds maximum cost limit $${maxCost}`);
    this.name = "CostLimitExceededError";
    this.providerId = providerId;
    this.cost = cost;
    this.maxCost = maxCost;
  }
}

export interface ExecutionProvider<TInput, TOutput> {
  id: string;
  name: string;
  costPerRun: number;
  execute: (input: TInput, signal: AbortSignal) => Promise<TOutput>;
  calculateCost?: (input: TInput, output: TOutput) => number;
}

export interface OptimizationGuardrails {
  maxCostPerRun: number;
  timeoutMs: number;
  maxConsecutiveFailures: number;
  cooldownMs: number;
}

export interface ProviderHealth {
  providerId: string;
  consecutiveFailures: number;
  circuitBreakerTripped: boolean;
  trippedAt?: string | undefined;
  totalExecutions: number;
  totalCost: number;
}

export interface OptimizationExecutionResult<TOutput> {
  providerId: string;
  output: TOutput;
  cost: number;
  latencyMs: number;
  fallbackUsed: boolean;
  attempts: number;
}

export interface OptimizationRouterOptions<TInput, TOutput> {
  providers: ExecutionProvider<TInput, TOutput>[];
  guardrails: OptimizationGuardrails;
  now?: () => string;
}

export class OptimizationRouter<TInput, TOutput> {
  readonly #providers: ExecutionProvider<TInput, TOutput>[];
  readonly #guardrails: OptimizationGuardrails;
  readonly #healthMap = new Map<string, ProviderHealth>();
  readonly #now: () => string;

  constructor(options: OptimizationRouterOptions<TInput, TOutput>) {
    if (options.providers.length === 0) {
      throw new Error("OptimizationRouter requires at least one provider");
    }
    this.#providers = [...options.providers];
    this.#guardrails = options.guardrails;
    this.#now = options.now ?? (() => new Date().toISOString());

    for (const provider of this.#providers) {
      this.#healthMap.set(provider.id, {
        providerId: provider.id,
        consecutiveFailures: 0,
        circuitBreakerTripped: false,
        totalExecutions: 0,
        totalCost: 0,
      });
    }
  }

  getProviderHealth(providerId: string): ProviderHealth | undefined {
    const health = this.#healthMap.get(providerId);
    if (!health) return undefined;

    // Check if cooldown period has elapsed to allow half-open probe
    if (health.circuitBreakerTripped && health.trippedAt) {
      const trippedTime = new Date(health.trippedAt).getTime();
      const currentTime = new Date(this.#now()).getTime();
      if (currentTime - trippedTime >= this.#guardrails.cooldownMs) {
        health.circuitBreakerTripped = false;
        health.consecutiveFailures = 0;
        health.trippedAt = undefined;
      }
    }
    return { ...health };
  }

  async execute(input: TInput): Promise<OptimizationExecutionResult<TOutput>> {
    let attempts = 0;
    const errors: { providerId: string; error: string }[] = [];

    for (let i = 0; i < this.#providers.length; i++) {
      const provider = this.#providers[i]!;
      const health = this.getProviderHealth(provider.id);

      if (health?.circuitBreakerTripped) {
        continue;
      }

      attempts++;
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.#guardrails.timeoutMs);

      try {
        const estimatedCost = provider.costPerRun;
        if (estimatedCost > this.#guardrails.maxCostPerRun) {
          throw new CostLimitExceededError(
            provider.id,
            estimatedCost,
            this.#guardrails.maxCostPerRun,
          );
        }

        const output = await provider.execute(input, controller.signal);
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - startTime;
        const actualCost = provider.calculateCost
          ? provider.calculateCost(input, output)
          : provider.costPerRun;

        if (actualCost > this.#guardrails.maxCostPerRun) {
          throw new CostLimitExceededError(
            provider.id,
            actualCost,
            this.#guardrails.maxCostPerRun,
          );
        }

        // Record successful execution health
        const storedHealth = this.#healthMap.get(provider.id)!;
        storedHealth.consecutiveFailures = 0;
        storedHealth.totalExecutions++;
        storedHealth.totalCost += actualCost;

        return {
          providerId: provider.id,
          output,
          cost: actualCost,
          latencyMs,
          fallbackUsed: i > 0,
          attempts,
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({ providerId: provider.id, error: errorMessage });

        const storedHealth = this.#healthMap.get(provider.id)!;
        storedHealth.consecutiveFailures++;
        if (storedHealth.consecutiveFailures >= this.#guardrails.maxConsecutiveFailures) {
          storedHealth.circuitBreakerTripped = true;
          storedHealth.trippedAt = this.#now();
        }
      }
    }

    throw new AllCircuitBreakersTrippedError();
  }
}
