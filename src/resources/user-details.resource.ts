import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { User } from "../schemas/user.schema.js";
import { userService } from "../services/user.service.js";

export default function userDetailsResource(server: McpServer) {
  server.resource(
    "user-details",
    new ResourceTemplate("users://{userId}/profile", { list: undefined }),
    {
      title: "User Details",
      description: "Get a user's details from the database",
      mimeType: "application/json",
    },
    async (uri, { userId }) => {
      const id = parseInt(userId as string, 10);
      const user: User | null = await userService.getById(id);
      const payload = user
        ? JSON.stringify(user)
        : JSON.stringify({ error: "User not found" });
      return {
        contents: [
          {
            uri: uri.href,
            text: payload,
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
