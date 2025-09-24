import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { UserInputSchema } from "../schemas/user.schema.js";
import { userService } from "../services/user.service.js";

export default function createUserTool(server: McpServer) {
  server.tool(
    "create-user",
    "Create a new user in the database",
    UserInputSchema.shape,
    {
      title: "Create User",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (params) => {
      const parsed = UserInputSchema.parse(params);
      const id = await userService.create(parsed);
      return {
        content: [{ type: "text", text: `User ${id} created successfully` }],
      };
    }
  );
}
