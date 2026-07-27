import type { HookLayer, MimeraHook } from "./contracts.ts";

const LAYER_ORDER: Readonly<Record<HookLayer, number>> = {
  "platform-safety": 0,
  "organization-policy": 1,
  "project-policy": 2,
  "pack-policy": 3,
  "operation-policy": 4,
};

export function orderHooks(hooks: readonly MimeraHook[]): MimeraHook[] {
  return [...hooks].sort((left, right) => {
    const layer = LAYER_ORDER[left.layer] - LAYER_ORDER[right.layer];
    if (layer !== 0) return layer;
    const priority = left.priority - right.priority;
    if (priority !== 0) return priority;
    return left.id.localeCompare(right.id);
  });
}
