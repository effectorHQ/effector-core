/**
 * Reverse Compiler — scan an MCP server project and generate effector.toml.
 *
 * Exports: reverseMCP(dir) → { toml: string, tools: object[], warnings: string[] }
 *
 * Four phases:
 *   1. Tool extraction — regex-scan .js/.ts files for MCP tool registrations
 *   2. Type mapping — heuristic map from JSON Schema → effector types
 *   3. Permission inference — scan source for network/subprocess/fs/env patterns
 *   4. TOML generation — produce a well-commented effector.toml
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';

// ─── Phase 1: Tool Extraction ─────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__']);
const SOURCE_EXTS = new Set(['.js', '.ts', '.mjs', '.mts', '.cjs', '.cts']);

function walkSourceFiles(dir) {
  const files = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(full);
      } else if (SOURCE_EXTS.has(e.name.slice(e.name.lastIndexOf('.')))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

/**
 * Extract MCP tool definitions from source code.
 * Detects three common MCP SDK patterns.
 */
function extractTools(sourceFiles) {
  const tools = [];
  const seen = new Set();

  // Pattern 1: server.tool("name", "description", { ...schema }, handler)
  // Also matches: server.tool("name", { ...schema }, handler)
  const toolCallRe = /\.tool\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]*)["'`]/g;

  // Pattern 2: { name: "...", description: "...", inputSchema: { ... } }
  const toolObjectRe = /\bname\s*:\s*["'`]([^"'`]+)["'`][^}]*?description\s*:\s*["'`]([^"'`]*)["'`]/g;

  // Pattern 3: Extract inputSchema properties (best effort)
  const propRe = /["'](\w+)["']\s*:\s*\{\s*(?:type\s*:\s*["'](\w+)["']|description)/g;

  for (const file of sourceFiles) {
    let content;
    try { content = readFileSync(file, 'utf-8'); } catch { continue; }

    // Pattern 1
    for (const m of content.matchAll(toolCallRe)) {
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const props = extractSchemaProps(content, name);
      tools.push({ name, description: m[2], props, file });
    }

    // Pattern 2 (only if not already found via pattern 1)
    for (const m of content.matchAll(toolObjectRe)) {
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const props = extractSchemaProps(content, name);
      tools.push({ name, description: m[2], props, file });
    }
  }

  return tools;
}

/**
 * Best-effort extraction of inputSchema property names and types
 * from the region near a tool name.
 */
function extractSchemaProps(content, toolName) {
  const props = [];
  // Find the tool definition region (next 500 chars after the tool name)
  const idx = content.indexOf(`"${toolName}"`);
  const idx2 = content.indexOf(`'${toolName}'`);
  const start = Math.max(0, idx >= 0 ? idx : (idx2 >= 0 ? idx2 : -1));
  if (start === 0 && idx < 0 && idx2 < 0) return props;

  const region = content.slice(start, start + 800);

  // Look for properties: propName: { type: "string" } or "propName": { type: "string" }
  const propRe = /(?:["']?(\w+)["']?)\s*:\s*\{[^}]*?type\s*:\s*["'](\w+)["']/g;
  for (const m of region.matchAll(propRe)) {
    const name = m[1];
    // Skip meta-keys that aren't actual schema properties
    if (['type', 'inputSchema', 'properties', 'content', 'required'].includes(name)) continue;
    props.push({ name, type: m[2] });
  }

  return props;
}

// ─── Phase 2: Type Mapping ────────────────────────────────

const PROP_TO_TYPE = {
  url: 'URL', href: 'URL', uri: 'URL', link: 'URL',
  path: 'FilePath', file: 'FilePath', filepath: 'FilePath', filename: 'FilePath',
  code: 'CodeSnippet', snippet: 'CodeSnippet', source: 'CodeSnippet',
  query: 'String', prompt: 'String', message: 'String', text: 'String',
  repo: 'RepositoryRef', repository: 'RepositoryRef',
  diff: 'CodeDiff', patch: 'CodeDiff',
};

function inferInputType(props) {
  if (!props || props.length === 0) return 'String';

  // Check for well-known property name combinations
  const names = new Set(props.map(p => p.name.toLowerCase()));

  if (names.has('owner') && names.has('repo')) return 'RepositoryRef';
  if (names.has('code') && names.has('language')) return 'CodeSnippet';
  if (names.has('diff') || names.has('patch')) return 'CodeDiff';
  if (names.has('url') || names.has('href')) return 'URL';
  if (names.has('path') || names.has('file') || names.has('filepath')) return 'FilePath';

  // Single property — use direct mapping
  if (props.length === 1) {
    const mapped = PROP_TO_TYPE[props[0].name.toLowerCase()];
    if (mapped) return mapped;
    if (props[0].type === 'string') return 'String';
    if (props[0].type === 'number' || props[0].type === 'integer') return 'Number';
    if (props[0].type === 'boolean') return 'Boolean';
  }

  // Multiple properties — likely JSON
  if (props.length > 2) return 'JSON';

  return 'String';
}

// ─── Phase 3: Permission Inference ─────────────────────────

const NETWORK_RE = /\b(fetch|http\.request|https\.request|axios|got\(|node-fetch|undici|request\()/;
const SUBPROCESS_RE = /\b(spawn|exec|execSync|execFile|execFileSync|child_process)\b/;
const FS_READ_RE = /\b(readFile|readFileSync|readdir|readdirSync|stat|statSync|access|accessSync|createReadStream)\b/;
const FS_WRITE_RE = /\b(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|createWriteStream|unlink|unlinkSync|rm|rmSync)\b/;
const ENV_RE = /process\.env(?:\.(\w+)|\[['"](\w+)['"]\])/g;

function inferPermissions(sourceFiles) {
  const perms = {
    network: false,
    subprocess: false,
    filesystemRead: false,
    filesystemWrite: false,
    envVars: new Set(),
  };

  for (const file of sourceFiles) {
    let content;
    try { content = readFileSync(file, 'utf-8'); } catch { continue; }

    if (NETWORK_RE.test(content)) perms.network = true;
    if (SUBPROCESS_RE.test(content)) perms.subprocess = true;
    if (FS_READ_RE.test(content)) perms.filesystemRead = true;
    if (FS_WRITE_RE.test(content)) perms.filesystemWrite = true;

    for (const m of content.matchAll(ENV_RE)) {
      const varName = m[1] || m[2];
      if (varName && varName.length > 1 && varName === varName.toUpperCase()) {
        perms.envVars.add(varName);
      }
    }
  }

  return perms;
}

// ─── Phase 4: TOML Generation ──────────────────────────────

function toKebab(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
}

function generateToml(tool, perms, packageJson) {
  const name = toKebab(tool.name);
  const desc = tool.description || `${name} MCP tool`;
  const inputType = inferInputType(tool.props);
  const version = packageJson?.version || '0.1.0';

  const fs = [];
  if (perms.filesystemRead) fs.push('"read"');
  if (perms.filesystemWrite) fs.push('"write"');
  const fsLine = fs.length > 0 ? `[${fs.join(', ')}]` : '[]';

  const envArr = [...perms.envVars].sort();
  const envLine = envArr.length > 0
    ? `[${envArr.map(v => `"${v}"`).join(', ')}]`
    : '[]';

  return `# Auto-generated by: effector-core init --from-mcp
# Review all fields — especially input/output types and permissions.

[effector]
name = "${name}"
version = "${version}"
type = "skill"
description = "${desc.replace(/"/g, '\\"')}"
license = "MIT"
tags = []
authors = []
min-spec-version = "0.2.0"

[effector.interface]
input   = "${inputType}"       # TODO: review — inferred from inputSchema properties
output  = "JSON"               # TODO: review — default; refine to a specific type
context = []

[effector.permissions]
network    = ${perms.network}
subprocess = ${perms.subprocess}
filesystem = ${fsLine}
env-read   = ${envLine}
env-write  = []
`;
}

// ─── Main Entry Point ──────────────────────────────────────

/**
 * Scan an MCP server project directory and generate effector.toml content.
 *
 * @param {string} dir - Path to the MCP server project
 * @returns {{ toml: string, tools: object[], warnings: string[] }}
 */
export function reverseMCP(dir) {
  const warnings = [];

  // Read package.json if available
  let packageJson = null;
  try {
    packageJson = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
  } catch {
    warnings.push('No package.json found — using defaults for name/version');
  }

  // Phase 1: Scan source files
  const sourceFiles = walkSourceFiles(dir);
  if (sourceFiles.length === 0) {
    warnings.push('No .js/.ts source files found in directory');
    return { toml: '', tools: [], warnings };
  }

  // Phase 2: Extract tool definitions
  const tools = extractTools(sourceFiles);
  if (tools.length === 0) {
    warnings.push('No MCP tool definitions detected. Generating a minimal manifest from package.json');
    // Generate a minimal manifest from package.json
    const name = toKebab(packageJson?.name?.replace(/^@[^/]+\//, '') || basename(dir));
    const desc = packageJson?.description || 'An MCP server tool';
    const perms = inferPermissions(sourceFiles);
    const toml = `# Auto-generated by: effector-core init --from-mcp
# No MCP tool definitions detected — this is a minimal manifest.
# Review and customize all fields.

[effector]
name = "${name}"
version = "${packageJson?.version || '0.1.0'}"
type = "skill"
description = "${desc.replace(/"/g, '\\"')}"
license = "MIT"
tags = []
authors = []
min-spec-version = "0.2.0"

[effector.interface]
input   = "String"   # TODO: set the correct input type
output  = "JSON"     # TODO: set the correct output type
context = []

[effector.permissions]
network    = ${perms.network}
subprocess = ${perms.subprocess}
env-read   = [${[...perms.envVars].sort().map(v => `"${v}"`).join(', ')}]
`;
    return { toml, tools: [], warnings };
  }

  // Phase 3: Infer permissions from all source files
  const perms = inferPermissions(sourceFiles);

  // If single tool, generate one manifest
  if (tools.length === 1) {
    const toml = generateToml(tools[0], perms, packageJson);
    return { toml, tools, warnings };
  }

  // Multiple tools — generate a multi-tool manifest
  // Use the first tool as primary, note others in comments
  warnings.push(`Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}. Generated manifest for the first tool. Consider creating separate effector.toml files for each.`);

  const primaryTool = tools[0];
  let toml = generateToml(primaryTool, perms, packageJson);
  toml += `\n# Other tools detected in this project:\n`;
  for (let i = 1; i < tools.length; i++) {
    const t = tools[i];
    toml += `#   ${t.name} — ${t.description || '(no description)'}\n`;
  }
  toml += `# Consider creating a separate effector.toml for each tool.\n`;

  return { toml, tools, warnings };
}
