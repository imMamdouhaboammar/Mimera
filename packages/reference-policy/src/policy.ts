import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateOrReservedAddress } from "./ip.ts";

export class NavigationDeniedError extends Error {
  readonly reasonCode: string;
  readonly url: string;

  constructor(reasonCode: string, message: string, url: string) {
    super(message);
    this.name = "NavigationDeniedError";
    this.reasonCode = reasonCode;
    this.url = url;
  }
}

export interface ReferencePolicyOptions {
  allowedOrigins: readonly string[];
  allowHttp?: boolean;
  allowLoopback?: boolean;
  resolveHost?: (hostname: string) => Promise<readonly string[]>;
}

async function defaultResolveHost(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map((entry) => entry.address);
}

function normalizeOrigin(input: string): string {
  return new URL(input).origin;
}

export class ReferencePolicy {
  readonly #allowedOrigins: Set<string>;
  readonly #allowHttp: boolean;
  readonly #allowLoopback: boolean;
  readonly #resolveHost: (hostname: string) => Promise<readonly string[]>;

  constructor(options: ReferencePolicyOptions) {
    this.#allowedOrigins = new Set(options.allowedOrigins.map(normalizeOrigin));
    this.#allowHttp = options.allowHttp ?? false;
    this.#allowLoopback = options.allowLoopback ?? false;
    this.#resolveHost = options.resolveHost ?? defaultResolveHost;
  }

  async assertNavigation(input: string): Promise<void> {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new NavigationDeniedError("URL_INVALID", "Reference URL is invalid", input);
    }

    if (url.username || url.password) {
      throw new NavigationDeniedError("URL_CREDENTIALS_BLOCKED", "Credentials in reference URLs are blocked", input);
    }
    if (url.protocol !== "https:" && !(this.#allowHttp && url.protocol === "http:")) {
      throw new NavigationDeniedError("PROTOCOL_BLOCKED", "Reference navigation requires HTTPS", input);
    }
    if (!this.#allowedOrigins.has(url.origin)) {
      throw new NavigationDeniedError("ORIGIN_NOT_ALLOWED", "Reference origin is not authorized", input);
    }

    const addresses = isIP(url.hostname) ? [url.hostname] : await this.#resolveHost(url.hostname);
    if (addresses.length === 0) {
      throw new NavigationDeniedError("DNS_EMPTY", "Reference hostname did not resolve", input);
    }
    for (const address of addresses) {
      if (isPrivateOrReservedAddress(address)) {
        const loopback = address === "::1" || address.startsWith("127.");
        if (this.#allowLoopback && loopback) continue;
        throw new NavigationDeniedError(
          "PRIVATE_NETWORK_BLOCKED",
          `Reference hostname resolves to blocked address ${address}`,
          input,
        );
      }
    }
  }
}
