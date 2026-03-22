// Minimal MCP server with a single tool — for reverse compiler testing
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "echo-server", version: "1.0.0" });

server.tool("echo", "Echo back the input message", {
  message: { type: "string", description: "The message to echo" }
}, async ({ message }) => {
  return { content: [{ type: "text", text: message }] };
});
