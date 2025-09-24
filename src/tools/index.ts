import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import createUserTool from "./create-user.tool.js";
import deleteUserByIdTool from "./delete-user-by-id.tool.js";
import deleteUserByNameTool from "./delete-user-by-name.tool.js";

export function register(server: McpServer) {
  createUserTool(server);
  deleteUserByIdTool(server);
  deleteUserByNameTool(server);
}
