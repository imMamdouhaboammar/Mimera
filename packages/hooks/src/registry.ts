import type { HookContext } from "@mimera/contracts";
import type { MimeraHook } from "./contracts.ts";
import { orderHooks } from "./ordering.ts";

export function defineHook(hook: MimeraHook): MimeraHook {
  if (!hook.id.trim()) throw new Error("Hook id cannot be empty");
  if (hook.phases.length === 0) throw new Error(`Hook ${hook.id} must declare at least one phase`);
  if (!Number.isInteger(hook.priority)) throw new Error(`Hook ${hook.id} priority must be an integer`);
  return Object.freeze({ ...hook, phases: Object.freeze([...hook.phases]) });
}

export class HookRegistry {
  readonly #hooks: MimeraHook[];

  constructor(hooks: readonly MimeraHook[] = []) {
    const ids = new Set<string>();
    for (const hook of hooks) {
      if (ids.has(hook.id)) throw new Error(`Duplicate hook id: ${hook.id}`);
      ids.add(hook.id);
    }
    this.#hooks = orderHooks(hooks);
  }

  resolve(context: HookContext): MimeraHook[] {
    return this.#hooks.filter((hook) => {
      if (!hook.phases.includes(context.phase)) return false;
      if (!hook.operations || hook.operations.length === 0) return true;
      return hook.operations.some((operation) => {
        if (operation.endsWith("*")) {
          return context.operation.startsWith(operation.slice(0, -1));
        }
        return context.operation === operation;
      });
    });
  }
}
