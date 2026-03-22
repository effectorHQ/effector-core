// MCP server with two tools and network access — for reverse compiler testing
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "api-tools", version: "0.3.0" });

server.tool("fetch-url", "Fetch content from a URL", {
  url: { type: "string", description: "The URL to fetch" }
}, async ({ url }) => {
  const res = await fetch(url);
  const text = await res.text();
  return { content: [{ type: "text", text }] };
});

server.tool("search-web", "Search the web for a query", {
  query: { type: "string", description: "Search query" },
  limit: { type: "number", description: "Max results" }
}, async ({ query, limit }) => {
  const res = await fetch(`https://api.search.example/q=${query}&limit=${limit}`);
  return { content: [{ type: "text", text: await res.text() }] };
});
