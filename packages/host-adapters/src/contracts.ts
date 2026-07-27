import type { AgentRegistry } from "@mimera/agent-runtime";
import type { HostKind } from "@mimera/contracts";

export type HostAdapterTier = "native-subagents" | "core-workers" | "instructions-only";

export interface GeneratedHostFile {
  path: string;
  content: string;
  mode?: number;
}

export interface RenderHostAdapterInput {
  agents: AgentRegistry;
  version: string;
}

export interface RenderedHostAdapter {
  host: HostKind;
  tier: HostAdapterTier;
  registryHash: string;
  files: GeneratedHostFile[];
}

export interface HostAdapter {
  readonly host: HostKind;
  readonly tier: HostAdapterTier;
  render(input: RenderHostAdapterInput): RenderedHostAdapter;
}
