import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import generateFakeUserPrompt from "./generate-fake-user.prompt.js";

export function register(server: McpServer) {
  generateFakeUserPrompt(server);
}
