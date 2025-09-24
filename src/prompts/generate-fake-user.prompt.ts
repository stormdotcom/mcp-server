import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export default function generateFakeUserPrompt(server: McpServer) {
  server.prompt(
    "generate-fake-user",
    "Generate a fake user based on a given name",
    { name: z.string() },
    ({ name }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a fake user with the name ${name}. The user should have a realistic email, address, and phone number.`,
          },
        },
      ],
    })
  );
}
