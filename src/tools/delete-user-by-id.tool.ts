import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { userService } from "../services/user.service.js";

export default function deleteUserByIdTool(server: McpServer) {
  server.tool(
    "delete-user-by-id",
    "Delete a single user by their numeric ID",
    { id: z.number() },
    {
      title: "Delete User by ID",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ id }) => {
      const success = await userService.deleteById(id);
      const message = success
        ? `User ${id} deleted successfully`
        : `No user found with ID ${id}`;
      return {
        content: [{ type: "text", text: message }],
      };
    }
  );
}
