import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { User } from "../schemas/user.schema.js";
import { userService } from "../services/user.service.js";

export default function usersResource(server: McpServer) {
  server.resource(
    "users",
    "users://all",
    {
      title: "Users",
      description: "Get all users data from the database",
      mimeType: "application/json",
    },
    async (uri) => {
      const users: User[] = await userService.list();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(users),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
