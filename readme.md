- **Node.js 22.14.0+** (22+ LTS recommended)
- A terminal + a code editor

---
# 1) What is MCP in simple terms?

A: MCP is a protocol that lets AI models interact with external tools and data through a standardized interface. It acts like a universal adapter so LLMs don’t have to hallucinate—they can fetch accurate, real-time information.

# 2) Create the project

```bash
mkdir mcp-users && cd mcp-users
npm init -y
```

---

# 3) Install dependencies

```bash
# Core
npm i @modelcontextprotocol/sdk zod

# Dev tooling
npm i -D typescript tsx @types/node

# Fake data generator (so "random user" works without an AI model)
npm i @faker-js/faker

# (Optional, very handy) MCP Inspector for testing
npm i -D @modelcontextprotocol/inspector
```

---

# 4) Set up `package.json` (scripts + ESM)

Open `package.json` and replace with this (or merge with yours):

```json
{
  "name": "mcp-users",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "inspect": "npx @modelcontextprotocol/inspector npm run dev"
  },
  "dependencies": {
    "@faker-js/faker": "^9.0.0",
    "@modelcontextprotocol/sdk": "^1.13.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@modelcontextprotocol/inspector": "^0.14.3",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.6.0"
  }
}
```

> `type: "module"` lets us use modern `import` syntax, which MCP SDK uses.

---

# 5) Add TypeScript config

Create **`tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

# 6) Create folders and a “database”

```bash
mkdir -p src data
echo "[]" > data/users.json
```

- We’ll store users in `data/users.json`.
- It starts as an empty array `[]`.

---

# 7) Write the MCP server

Create **`src/server.ts`** and paste this:

```ts
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import { faker } from "@faker-js/faker";

// =======================
// Small data layer (JSON)
// =======================
const DATA_PATH = "./data/users.json";

async function readUsers(): Promise<any[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

async function writeUsers(users: any[]) {
  await fs.writeFile(DATA_PATH, JSON.stringify(users, null, 2));
}

function nextId(users: any[]) {
  return (users.at(-1)?.id ?? 0) + 1; // safe even after deletions
}

// ==============
// Zod schemas
// ==============
const UserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  phone: z.string().min(3),
});

const UserUpdateSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(3).optional(),
});

// ======================
// Build the MCP server
// ======================
const server = new McpServer({
  name: "users-mcp",
  version: "1.0.0",
  capabilities: { resources: {}, tools: {}, prompts: {} },
});

// -------------
// Resources
// -------------
// List all users
server.resource(
  "users",
  "users://all",
  {
    description: "Get all users",
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

// Get one user by ID
server.resource(
  "user-details",
  new ResourceTemplate("users://{id}/profile", { list: undefined }),
  {
    description: "Get a single user by ID",
    title: "User Details",
    mimeType: "application/json",
  },
  async (uri, { id }) => {
    const users = await readUsers();
    const user = users.find((u) => u.id === Number(id));
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(user ?? { error: "User not found" }),
          mimeType: "application/json",
        },
      ],
    };
  }
);

// ---------
// Tools
// ---------
// Create
server.tool(
  "create-user",
  "Create a new user",
  UserInputSchema.shape, // the shape object (keys => zod types)
  {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async (params) => {
    const input = UserInputSchema.parse(params);
    const users = await readUsers();
    const id = nextId(users);
    users.push({ id, ...input });
    await writeUsers(users);
    return { content: [{ type: "text", text: `User ${id} created` }] };
  }
);

// Read (tool form)
server.tool(
  "get-user",
  "Get a user by ID",
  { id: z.number() },
  {
    title: "Get User",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async ({ id }) => {
    const users = await readUsers();
    const user = users.find((u) => u.id === id);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(user ?? { error: "User not found" }),
        },
      ],
    };
  }
);

// Update (partial)
server.tool(
  "update-user",
  "Update a user by ID (partial)",
  UserUpdateSchema.shape,
  {
    title: "Update User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async (params) => {
    const update = UserUpdateSchema.parse(params);
    const users = await readUsers();
    const idx = users.findIndex((u) => u.id === update.id);
    if (idx < 0) {
      return {
        content: [{ type: "text", text: `No user found with ID ${update.id}` }],
      };
    }
    const current = users[idx];
    const merged = {
      ...current,
      ...Object.fromEntries(
        Object.entries(update).filter(([k, v]) => k !== "id" && v !== undefined)
      ),
    };
    users[idx] = merged;
    await writeUsers(users);
    return { content: [{ type: "text", text: `User ${update.id} updated` }] };
  }
);

// Delete
server.tool(
  "delete-user",
  "Delete a user by ID",
  { id: z.number() },
  {
    title: "Delete User",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id }) => {
    const users = await readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) {
      return {
        content: [{ type: "text", text: `No user found with ID ${id}` }],
      };
    }
    const [deleted] = users.splice(idx, 1);
    await writeUsers(users);
    return {
      content: [{ type: "text", text: `Deleted user ${deleted.name ?? id}` }],
    };
  }
);

// Extra: delete by name (case-insensitive)
server.tool(
  "delete-user-by-name",
  "Delete all users matching a name (case-insensitive)",
  { name: z.string() },
  {
    title: "Delete User(s) by Name",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ name }) => {
    const users = await readUsers();
    const before = users.length;
    const remaining = users.filter(
      (u) => (u.name ?? "").toLowerCase() !== name.toLowerCase()
    );
    const deleted = before - remaining.length;
    if (deleted === 0) {
      return { content: [{ type: "text", text: `No user named "${name}"` }] };
    }
    await writeUsers(remaining);
    return {
      content: [
        { type: "text", text: `Deleted ${deleted} user(s) named "${name}"` },
      ],
    };
  }
);

// ----------
// Prompt
// ----------
server.prompt(
  "generate-fake-user",
  "A template to ask an AI to create a fake user",
  { name: z.string() },
  ({ name }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a fake user named "${name}" and return ONLY JSON with fields: name, email, address, phone.`,
        },
      },
    ],
  })
);

// ----------
// Random user tool (works offline using faker)
// ----------
server.tool(
  "create-random-user",
  "Create a random user (no AI needed)",
  {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async () => {
    const fake = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      phone: faker.phone.number(),
    };
    const users = await readUsers();
    const id = nextId(users);
    users.push({ id, ...fake });
    await writeUsers(users);
    return { content: [{ type: "text", text: `User ${id} created (random)` }] };
  }
);

// ==========
// Boot
// ==========
(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // IMPORTANT: Do not console.log here (stdout is for MCP JSON). Use console.error for debug.
})();
```

> Why no `console.log`?
> Because MCP speaks over **stdout**. If you print normal logs, the client will see garbage instead of JSON. Use `console.error` for debugging.

---

# 8) Run it

**Dev mode (TypeScript directly):**

```bash
npm run dev
```

**Build & run (compiled JS):**

```bash
npm run build
npm start
```

The process now waits for an MCP client (like the Inspector) to connect over **stdio**.

---

# 9) Test it with MCP Inspector (GUI)

```bash
npm run inspect
```

In the Inspector:

- Go to **Resources** → open `users://all` (should be `[]` at first).
- Go to **Tools**:

  - Run **create-user** with:

    ```json
    {
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "address": "10 Analytical Engine Way",
      "phone": "+1-555-1234"
    }
    ```

  - Run **get-user** with `{ "id": 1 }`.
  - Run **update-user** with `{ "id": 1, "phone": "+1-555-0000" }`.
  - Run **delete-user** with `{ "id": 1 }`.
  - Try **create-random-user** to generate fake users quickly.

---

# 10) Common gotchas (read this!)

- **Don’t log to stdout** from the server. Use `console.error` for debugging.
- Don’t use `import("./data/users.json")` to read data after writes — Node caches it. Use `fs.readFile`/`fs.writeFile` like above.
- Keep read/write paths the **same** (`./data/users.json`).
- If you change the data file by hand, make sure the JSON stays valid (no trailing commas, etc.).

---

# 11) What’s next?

- Swap the JSON file for a **real database** (only your small data layer changes).
- Add more tools/resources by copy-pasting the patterns.
- Split this one file into folders (`resources/`, `tools/`, `services/`) when it grows.

---
