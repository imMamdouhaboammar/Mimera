interface RobotsRule {
  allow: boolean;
  path: string;
}

export class RobotsRules {
  readonly #groups: Map<string, RobotsRule[]>;

  constructor(groups: Map<string, RobotsRule[]>) {
    this.#groups = groups;
  }

  isAllowed(userAgent: string, pathname: string): boolean {
    const normalizedAgent = userAgent.toLowerCase();
    const rules = this.#groups.get(normalizedAgent) ?? this.#groups.get("*") ?? [];
    const matches = rules
      .filter((rule) => rule.path !== "" && pathname.startsWith(rule.path))
      .sort((left, right) => {
        const length = right.path.length - left.path.length;
        if (length !== 0) return length;
        return Number(right.allow) - Number(left.allow);
      });
    return matches[0]?.allow ?? true;
  }
}

export function parseRobotsTxt(input: string): RobotsRules {
  const groups = new Map<string, RobotsRule[]>();
  let activeAgents: string[] = [];
  let groupHasRules = false;

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (groupHasRules) {
        activeAgents = [];
        groupHasRules = false;
      }
      const agent = value.toLowerCase();
      if (agent) activeAgents.push(agent);
      continue;
    }

    if ((field === "allow" || field === "disallow") && activeAgents.length > 0) {
      groupHasRules = true;
      for (const agent of activeAgents) {
        const existing = groups.get(agent) ?? [];
        existing.push({ allow: field === "allow", path: value });
        groups.set(agent, existing);
      }
    }
  }

  return new RobotsRules(groups);
}
