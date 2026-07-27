import path from "node:path";
import type { HookDecision } from "@mimera/contracts";
import { defineHook } from "../registry.ts";

function candidatePath(targetRoot: string, requestedPath: string): string {
  return path.resolve(targetRoot, requestedPath);
}

function isInsideRoot(targetRoot: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(targetRoot), candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function createWriteScopeHook() {
  return defineHook({
    id: "builtin.write-scope",
    phases: ["pre-tool-call"],
    operations: ["project.write-patch", "project.write-file", "project.delete-file"],
    layer: "platform-safety",
    priority: 10,
    run(context): HookDecision {
      const input = context.input as { path?: unknown };
      if (typeof input?.path !== "string" || input.path.trim() === "") {
        return { kind: "deny", reasonCode: "WRITE_PATH_INVALID", message: "A valid write path is required" };
      }
      if (!context.trustedScope.grantedPackPermissions.includes("project:write-scoped")) {
        return { kind: "deny", reasonCode: "WRITE_PERMISSION_MISSING", message: "Scoped project write permission is missing" };
      }

      const root = path.resolve(context.trustedScope.targetRoot);
      const candidate = candidatePath(root, input.path);
      if (!isInsideRoot(root, candidate)) {
        return { kind: "deny", reasonCode: "WRITE_OUTSIDE_TARGET_ROOT", message: "Write target escapes the project root" };
      }

      const allowed = context.trustedScope.targetFiles.some((targetFile) => {
        const declared = candidatePath(root, targetFile);
        return declared === candidate;
      });
      if (!allowed) {
        return {
          kind: "ask",
          reasonCode: "WRITE_OUTSIDE_COMPONENT_SCOPE",
          message: "The file is inside the project but outside the approved component scope",
          requiredApproval: {
            kind: "write-outside-scope",
            scope: path.relative(root, candidate),
            reason: "The active Component Spec does not declare this file",
          },
        };
      }

      return { kind: "allow", reasonCode: "WRITE_SCOPE_ALLOWED", message: "Write target is approved" };
    },
  });
}
