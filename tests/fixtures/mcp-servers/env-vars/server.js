// MCP server using environment variables — for reverse compiler testing
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = process.env['GITHUB_API_URL'] || 'https://api.github.com';

const server = new McpServer({ name: "github-tools", version: "1.2.0" });

server.tool("list-repos", "List GitHub repositories for a user", {
  username: { type: "string", description: "GitHub username" }
}, async ({ username }) => {
  const res = await fetch(`${GITHUB_API_URL}/users/${username}/repos`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
});
