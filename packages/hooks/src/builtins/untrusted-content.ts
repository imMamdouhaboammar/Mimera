import { defineHook } from "../registry.ts";

export function createUntrustedContentHook() {
  return defineHook({
    id: "builtin.untrusted-content",
    phases: ["pre-evidence-ingest"],
    operations: ["evidence.ingest-reference*"],
    layer: "platform-safety",
    priority: 0,
    run(context) {
      if (!context.input || typeof context.input !== "object") {
        return { kind: "deny", reasonCode: "EVIDENCE_INVALID", message: "Evidence must be an object" };
      }
      const evidence = context.input as Record<string, unknown>;
      if (evidence.trust === "untrusted-reference") {
        return { kind: "allow", reasonCode: "REFERENCE_TRUST_CONFIRMED", message: "Reference evidence is already untrusted" };
      }
      return {
        kind: "mutate",
        reasonCode: "REFERENCE_TRUST_FORCED",
        message: "Reference evidence was marked untrusted",
        updatedInput: { ...evidence, trust: "untrusted-reference" },
      };
    },
  });
}
