import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as resources from "./resources/index.js";
import * as tools from "./tools/index.js";
import * as prompts from "./prompts/index.js";

export function buildServer() {
  const server = new McpServer({
    name: "mcp-server-test",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  });

  resources.register(server);
  tools.register(server);
  prompts.register(server);

  return server;
}
