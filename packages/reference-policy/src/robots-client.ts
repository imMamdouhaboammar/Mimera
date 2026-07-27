import { parseRobotsTxt, type RobotsRules } from "./robots.ts";

export class RobotsDeniedError extends Error {
  readonly reasonCode: string;
  readonly url: string;

  constructor(reasonCode: string, message: string, url: string) {
    super(message);
    this.name = "RobotsDeniedError";
    this.reasonCode = reasonCode;
    this.url = url;
  }
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface RobotsPolicyClientOptions {
  fetch?: FetchLike;
  userAgent?: string;
  failClosed?: boolean;
}

export class RobotsPolicyClient {
  readonly #fetch: FetchLike;
  readonly #userAgent: string;
  readonly #failClosed: boolean;
  readonly #cache = new Map<string, Promise<RobotsRules | null>>();

  constructor(options: RobotsPolicyClientOptions = {}) {
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init));
    this.#userAgent = options.userAgent ?? "MimeraBot";
    this.#failClosed = options.failClosed ?? true;
  }

  async assertAllowed(input: string): Promise<void> {
    const url = new URL(input);
    const rules = await this.#rulesForOrigin(url.origin);
    if (!rules) return;
    if (!rules.isAllowed(this.#userAgent, url.pathname || "/")) {
      throw new RobotsDeniedError(
        "ROBOTS_DISALLOWED",
        `robots.txt disallows ${url.pathname || "/"} for ${this.#userAgent}`,
        input,
      );
    }
  }

  clear(origin?: string): void {
    if (origin) this.#cache.delete(new URL(origin).origin);
    else this.#cache.clear();
  }

  #rulesForOrigin(origin: string): Promise<RobotsRules | null> {
    const existing = this.#cache.get(origin);
    if (existing) return existing;
    const pending = this.#loadRules(origin);
    this.#cache.set(origin, pending);
    return pending;
  }

  async #loadRules(origin: string): Promise<RobotsRules | null> {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    let response: Response;
    try {
      response = await this.#fetch(robotsUrl, {
        headers: { "User-Agent": this.#userAgent },
        redirect: "error",
      });
    } catch (error) {
      if (!this.#failClosed) return null;
      throw new RobotsDeniedError(
        "ROBOTS_UNAVAILABLE",
        error instanceof Error ? error.message : "robots.txt request failed",
        robotsUrl,
      );
    }

    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) {
      if (!this.#failClosed && response.status >= 500) return null;
      throw new RobotsDeniedError(
        "ROBOTS_UNAVAILABLE",
        `robots.txt returned HTTP ${response.status}`,
        robotsUrl,
      );
    }
    return parseRobotsTxt(await response.text());
  }
}
