// MCP server with complex input schema — for reverse compiler testing
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "child_process";

const server = new McpServer({ name: "repo-tools", version: "2.0.0" });

server.tool("get-pr-diff", "Get the diff for a pull request", {
  owner: { type: "string", description: "Repository owner" },
  repo: { type: "string", description: "Repository name" },
  pr_number: { type: "number", description: "Pull request number" }
}, async ({ owner, repo, pr_number }) => {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}`,
    { headers: { Accept: "application/vnd.github.v3.diff" } }
  );
  return { content: [{ type: "text", text: await res.text() }] };
});

server.tool("clone-repo", "Clone a repository to local disk", {
  url: { type: "string", description: "Repository URL to clone" },
  path: { type: "string", description: "Local destination path" }
}, async ({ url, path }) => {
  execSync(`git clone ${url} ${path}`);
  return { content: [{ type: "text", text: `Cloned to ${path}` }] };
});
