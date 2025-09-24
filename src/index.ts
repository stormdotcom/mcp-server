import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

(async () => {
  const transport = new StdioServerTransport();
  const server = buildServer();
  await server.connect(transport);
})();
