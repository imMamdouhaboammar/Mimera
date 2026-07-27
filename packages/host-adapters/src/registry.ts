import type { HostKind } from "@mimera/contracts";
import type { HostAdapter } from "./contracts.ts";

export class HostAdapterNotFoundError extends Error {
  readonly host: HostKind;

  constructor(host: HostKind) {
    super(`Mimera host adapter is not registered: ${host}`);
    this.name = "HostAdapterNotFoundError";
    this.host = host;
  }
}

export class DuplicateHostAdapterError extends Error {
  readonly host: HostKind;

  constructor(host: HostKind) {
    super(`Duplicate Mimera host adapter: ${host}`);
    this.name = "DuplicateHostAdapterError";
    this.host = host;
  }
}

export class HostAdapterRegistry {
  readonly #adapters = new Map<HostKind, HostAdapter>();

  constructor(adapters: readonly HostAdapter[]) {
    for (const adapter of adapters) {
      if (this.#adapters.has(adapter.host)) throw new DuplicateHostAdapterError(adapter.host);
      this.#adapters.set(adapter.host, adapter);
    }
  }

  get(host: HostKind): HostAdapter {
    const adapter = this.#adapters.get(host);
    if (!adapter) throw new HostAdapterNotFoundError(host);
    return adapter;
  }

  list(): HostAdapter[] {
    return [...this.#adapters.values()].sort((left, right) => left.host.localeCompare(right.host));
  }
}
