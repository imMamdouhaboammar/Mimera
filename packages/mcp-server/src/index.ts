import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerBrowserTools,
  type RegisterBrowserToolsOptions,
} from "./browser-tools.ts";
import { registerVisualTools } from "./visual-tools.ts";

export interface CreateMimeraMcpServerOptions extends RegisterBrowserToolsOptions {
  name?: string;
  version?: string;
}

export function createMimeraMcpServer(
  options: CreateMimeraMcpServerOptions,
): McpServer {
  const server = new McpServer({
    name: options.name ?? "mimera",
    version: options.version ?? "0.1.0",
  });
  registerBrowserTools(server, {
    targetRoot: options.targetRoot,
    ...(options.captureService ? { captureService: options.captureService } : {}),
    ...(options.openProject ? { openProject: options.openProject } : {}),
  });
  registerVisualTools(server);
  return server;
}

export * from "./browser-tools.ts";
export * from "./visual-tools.ts";
