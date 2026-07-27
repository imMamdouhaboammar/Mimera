import path from "node:path";
import type { HookDecision } from "@mimera/contracts";
import { defineHook } from "../registry.ts";

interface SpawnInput {
  command?: unknown;
  args?: unknown;
  cwd?: unknown;
}

function tokens(command: string, args: string[]): string[] {
  return [path.basename(command), ...args];
}

function matchesPrefix(actual: string[], declared: string): boolean {
  const expected = declared.trim().split(/\s+/).filter(Boolean);
  return expected.length > 0 && expected.every((token, index) => actual[index] === token);
}

function isDestructive(command: string, args: string[]): boolean {
  const executable = path.basename(command);
  if (["sudo", "doas"].includes(executable)) return true;
  if (["sh", "bash", "zsh", "fish"].includes(executable) && args[0] === "-c") return true;
  if (executable === "rm") {
    const flags = args.filter((arg) => arg.startsWith("-")).join("");
    if (flags.includes("r") && flags.includes("f")) return true;
  }
  if (executable === "git" && args[0] === "reset" && args.includes("--hard")) return true;
  if (executable === "git" && args[0] === "clean" && args.some((arg) => /f/.test(arg))) return true;
  return false;
}

function changesDependencies(command: string, args: string[]): boolean {
  const executable = path.basename(command);
  const action = args[0];
  if (executable === "bun") return ["add", "remove", "install", "update"].includes(action ?? "");
  if (executable === "npm") return ["install", "uninstall", "update"].includes(action ?? "");
  if (executable === "pnpm" || executable === "yarn") {
    return ["add", "remove", "install", "update", "upgrade"].includes(action ?? "");
  }
  if (executable === "pip" || executable === "pip3") {
    return ["install", "uninstall"].includes(action ?? "");
  }
  return false;
}

export function createCommandPolicyHook() {
  return defineHook({
    id: "builtin.command-policy",
    phases: ["pre-tool-call"],
    operations: ["runtime.spawn"],
    layer: "platform-safety",
    priority: 15,
    run(context): HookDecision {
      const input = context.input as SpawnInput;
      if (typeof input?.command !== "string" || input.command.trim() === "") {
        return { kind: "deny", reasonCode: "COMMAND_INVALID", message: "Executable is required" };
      }
      if (!Array.isArray(input.args) || !input.args.every((arg) => typeof arg === "string")) {
        return { kind: "deny", reasonCode: "COMMAND_ARGS_INVALID", message: "Command arguments must be strings" };
      }
      if (!context.trustedScope.grantedPackPermissions.includes("shell:declared-commands")) {
        return { kind: "deny", reasonCode: "COMMAND_PERMISSION_MISSING", message: "Shell permission is missing" };
      }
      if (typeof input.cwd === "string") {
        const root = path.resolve(context.trustedScope.targetRoot);
        const cwd = path.resolve(input.cwd);
        const relative = path.relative(root, cwd);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          return { kind: "deny", reasonCode: "COMMAND_CWD_OUTSIDE_ROOT", message: "Command cwd escapes the target root" };
        }
      }

      const args = input.args as string[];
      if (isDestructive(input.command, args)) {
        return { kind: "deny", reasonCode: "COMMAND_DESTRUCTIVE", message: "Destructive command is blocked" };
      }
      if (changesDependencies(input.command, args)) {
        return {
          kind: "ask",
          reasonCode: "DEPENDENCY_CHANGE_REQUIRES_APPROVAL",
          message: "Dependency changes require explicit approval",
          requiredApproval: {
            kind: "dependency-change",
            scope: tokens(input.command, args).join(" "),
            reason: "The command changes project dependencies",
          },
        };
      }

      const actual = tokens(input.command, args);
      const allowed = context.trustedScope.allowedCommands.some((declared) => matchesPrefix(actual, declared));
      if (!allowed) {
        return { kind: "deny", reasonCode: "COMMAND_NOT_ALLOWED", message: "Command is not in the active allowlist" };
      }
      return { kind: "allow", reasonCode: "COMMAND_ALLOWED", message: "Command matches the active allowlist" };
    },
  });
}
