export interface OriginRateLimiterOptions {
  minimumIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export class OriginRateLimiter {
  readonly #minimumIntervalMs: number;
  readonly #now: () => number;
  readonly #sleep: (milliseconds: number) => Promise<void>;
  readonly #lastStartedAt = new Map<string, number>();
  readonly #queues = new Map<string, Promise<void>>();

  constructor(options: OriginRateLimiterOptions = {}) {
    this.#minimumIntervalMs = options.minimumIntervalMs ?? 500;
    this.#now = options.now ?? Date.now;
    this.#sleep = options.sleep ?? ((milliseconds) => Bun.sleep(milliseconds));
  }

  async acquire(input: string): Promise<void> {
    const origin = new URL(input).origin;
    const previous = this.#queues.get(origin) ?? Promise.resolve();
    const current = previous.then(async () => {
      const lastStartedAt = this.#lastStartedAt.get(origin);
      if (lastStartedAt !== undefined) {
        const waitMs = Math.max(0, lastStartedAt + this.#minimumIntervalMs - this.#now());
        if (waitMs > 0) await this.#sleep(waitMs);
      }
      this.#lastStartedAt.set(origin, this.#now());
    });
    this.#queues.set(origin, current);
    try {
      await current;
    } finally {
      if (this.#queues.get(origin) === current) this.#queues.delete(origin);
    }
  }
}
