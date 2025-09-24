import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

const DATA_PATH = "./data/users.json";

async function readUsers(): Promise<Array<any>> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

async function writeUsers(users: Array<any>) {
  await fs.writeFile(DATA_PATH, JSON.stringify(users, null, 2));
}

const server = new McpServer({
  name: "test-video",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

server.resource(
  "users",
  "users://all",
  {
    description: "Get all users data from the database",
    title: "Users",
    mimeType: "application/json",
  },
  async (uri) => {
    const users = await readUsers();
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

server.resource(
  "user-details",
  new ResourceTemplate("users://{userId}/profile", { list: undefined }),
  {
    description: "Get a user's details from the database",
    title: "User Details",
    mimeType: "application/json",
  },
  async (uri, { userId }) => {
    const users = await readUsers();
    const user = users.find((u) => u.id === parseInt(userId as string, 10));

    if (user == null) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "User not found" }),
            mimeType: "application/json",
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(user),
          mimeType: "application/json",
        },
      ],
    };
  }
);

server.tool(
  "create-user",
  "Create a new user in the database",
  {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  },
  {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async (params) => {
    try {
      const id = await createUser(params);
      return {
        content: [{ type: "text", text: `User ${id} created successfully` }],
      };
    } catch {
      return { content: [{ type: "text", text: "Failed to save user" }] };
    }
  }
);

server.tool(
  "create-random-user",
  "Create a random user with fake data",
  {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async () => {
    const res = await server.server.request(
      {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Generate fake user data. The user should have a realistic name, email, address, and phone number. Return this data as a JSON object with no other text or formatter so it can be used with JSON.parse.",
              },
            },
          ],
          maxTokens: 1024,
        },
      },
      CreateMessageResultSchema
    );

    if (res.content.type !== "text") {
      return {
        content: [{ type: "text", text: "Failed to generate user data" }],
      };
    }

    try {
      const fakeUser = JSON.parse(
        res.content.text
          .trim()
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .trim()
      );
      const id = await createUser(fakeUser);
      return {
        content: [{ type: "text", text: `User ${id} created successfully` }],
      };
    } catch {
      return {
        content: [{ type: "text", text: "Failed to generate user data" }],
      };
    }
  }
);

server.tool(
  "delete-user-by-name",
  "Delete all users that match the given name (case-insensitive)",
  {
    name: z.string(),
  },
  {
    title: "Delete User(s) by Name",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ name }) => {
    try {
      const users = await readUsers();
      const before = users.length;
      const remaining = users.filter(
        (u) => (u.name ?? "").toLowerCase() !== name.toLowerCase()
      );
      const deletedCount = before - remaining.length;

      if (deletedCount === 0) {
        return {
          content: [
            { type: "text", text: `No user found with name "${name}"` },
          ],
        };
      }

      await writeUsers(remaining);
      return {
        content: [
          {
            type: "text",
            text: `Deleted ${deletedCount} user(s) named "${name}".`,
          },
        ],
      };
    } catch {
      return { content: [{ type: "text", text: "Failed to delete user(s)" }] };
    }
  }
);

server.tool(
  "delete-user-by-id",
  "Delete a single user by their numeric ID",
  {
    id: z.number(),
  },
  {
    title: "Delete User by ID",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id }) => {
    try {
      const users = await readUsers();
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) {
        return {
          content: [{ type: "text", text: `No user found with ID ${id}` }],
        };
      }
      const [deletedUser] = users.splice(index, 1);
      await writeUsers(users);
      return {
        content: [
          {
            type: "text",
            text: `User ${
              deletedUser.name ?? deletedUser.id
            } deleted successfully`,
          },
        ],
      };
    } catch {
      return { content: [{ type: "text", text: "Failed to delete user" }] };
    }
  }
);

server.prompt(
  "generate-fake-user",
  "Generate a fake user based on a given name",
  {
    name: z.string(),
  },
  ({ name }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a fake user with the name ${name}. The user should have a realistic email, address, and phone number.`,
          },
        },
      ],
    };
  }
);

async function createUser(user: {
  name: string;
  email: string;
  address: string;
  phone: string;
}) {
  const users = await readUsers();
  const id = (users.at(-1)?.id ?? 0) + 1; // safer than length+1 if deletions happen
  users.push({ id, ...user });
  await writeUsers(users);
  return id;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
