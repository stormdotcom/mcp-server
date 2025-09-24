import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { userService } from "../services/user.service.js";

export default function deleteUserByNameTool(server: McpServer) {
  server.tool(
    "delete-user-by-name",
    "Delete all users that match the given name (case-insensitive)",
    { name: z.string() },
    {
      title: "Delete User(s) by Name",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ name }) => {
      const deletedCount = await userService.deleteByName(name);
      const message =
        deletedCount > 0
          ? `Deleted ${deletedCount} user(s) named "${name}".`
          : `No user found with name "${name}"`;
      return {
        content: [{ type: "text", text: message }],
      };
    }
  );
}
