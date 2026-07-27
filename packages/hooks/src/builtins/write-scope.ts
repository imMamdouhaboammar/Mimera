import { realpath } from "node:fs/promises";
import path from "node:path";
import type { HookDecision } from "@mimera/contracts";
import { defineHook } from "../registry.ts";

function lexicalCandidate(targetRoot: string, requestedPath: string): string {
  return path.resolve(targetRoot, requestedPath);
}

function isInsideRoot(targetRoot: string, candidate: string): boolean {
  const relative = path.relative(targetRoot, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function canonicalizeWithMissingTail(candidate: string): Promise<string> {
  const missingSegments: string[] = [];
  let cursor = candidate;
  while (true) {
    try {
      const existing = await realpath(cursor);
      return path.resolve(existing, ...missingSegments);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      missingSegments.unshift(path.basename(cursor));
      cursor = parent;
    }
  }
}

export function createWriteScopeHook() {
  return defineHook({
    id: "builtin.write-scope",
    phases: ["pre-tool-call"],
    operations: ["project.write-patch", "project.write-file", "project.delete-file"],
    layer: "platform-safety",
    priority: 10,
    async run(context): Promise<HookDecision> {
      const input = context.input as { path?: unknown };
      if (typeof input?.path !== "string" || input.path.trim() === "") {
        return { kind: "deny", reasonCode: "WRITE_PATH_INVALID", message: "A valid write path is required" };
      }
      if (!context.trustedScope.grantedPackPermissions.includes("project:write-scoped")) {
        return { kind: "deny", reasonCode: "WRITE_PERMISSION_MISSING", message: "Scoped project write permission is missing" };
      }

      const lexicalRoot = path.resolve(context.trustedScope.targetRoot);
      const lexicalPath = lexicalCandidate(lexicalRoot, input.path);
      if (!isInsideRoot(lexicalRoot, lexicalPath)) {
        return { kind: "deny", reasonCode: "WRITE_OUTSIDE_TARGET_ROOT", message: "Write target escapes the project root" };
      }

      const canonicalRoot = await canonicalizeWithMissingTail(lexicalRoot);
      const canonicalPath = await canonicalizeWithMissingTail(lexicalPath);
      if (!isInsideRoot(canonicalRoot, canonicalPath)) {
        return {
          kind: "deny",
          reasonCode: "WRITE_SYMLINK_ESCAPE",
          message: "Write target resolves through a symlink outside the project root",
        };
      }

      const allowed = context.trustedScope.targetFiles.some((targetFile) => {
        const declared = lexicalCandidate(lexicalRoot, targetFile);
        return declared === lexicalPath;
      });
      if (!allowed) {
        return {
          kind: "ask",
          reasonCode: "WRITE_OUTSIDE_COMPONENT_SCOPE",
          message: "The file is inside the project but outside the approved component scope",
          requiredApproval: {
            kind: "write-outside-scope",
            scope: path.relative(lexicalRoot, lexicalPath),
            reason: "The active Component Spec does not declare this file",
          },
        };
      }

      return { kind: "allow", reasonCode: "WRITE_SCOPE_ALLOWED", message: "Write target is approved" };
    },
  });
}
