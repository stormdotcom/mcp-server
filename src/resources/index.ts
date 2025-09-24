import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import usersResource from "./users.resource.js";
import userDetailsResource from "./user-details.resource.js";

export function register(server: McpServer) {
  usersResource(server);
  userDetailsResource(server);
}
