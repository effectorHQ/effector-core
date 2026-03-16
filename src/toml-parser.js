/**
 * @module @effectorhq/core/toml
 *
 * Canonical effector.toml parser — replaces duplicated regex parsers
 * across effector-compose, effector-graph, and others.
 *
 * Zero dependencies. Regex-based extraction for the TOML subset
 * used in effector manifests.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Field Extraction ────────────────────────────────────────

/**
 * Extract a quoted string field from TOML content.
 * Matches: key = "value"
 */
function extractField(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*"(.+?)"`, 'm'));
  return match ? match[1] : null;
}

/**
 * Extract a boolean field from TOML content.
 * Matches: key = true | key = false
 */
function extractBoolField(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)`, 'm'));
  return match ? match[1] === 'true' : false;
}

/**
 * Extract an integer field from TOML content.
 * Matches: key = 123
 */
function extractIntField(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(\\d+)`, 'm'));
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract a string array from TOML content.
 * Matches: key = ["val1", "val2"]
 */
function extractArrayField(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*\\[([^\\]]*)\\]`, 'm'));
  if (!match) return [];
  return match[1]
    .split(',')
    .map(s => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

// ─── Section Extraction ──────────────────────────────────────

/**
 * Extract the content of a TOML section (text between [header] and next [header]).
 * Returns the full content if the section header is not found (for backward compat).
 *
 * @param {string} content - Full TOML file content
 * @param {string} header - Section header, e.g. "effector" or "effector.interface"
 * @returns {string} Content scoped to that section
 */
function extractSection(content, header) {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\[${escaped}\\]\\s*$`, 'm');
  const match = pattern.exec(content);
  if (!match) return '';

  const start = match.index + match[0].length;
  const nextSection = content.indexOf('\n[', start);
  return nextSection === -1 ? content.slice(start) : content.slice(start, nextSection);
}

// ─── Main Parser ─────────────────────────────────────────────

/**
 * @typedef {Object} EffectorDef
 * @property {string|null} name
 * @property {string|null} version
 * @property {string|null} type
 * @property {string|null} description
 * @property {{ input: string|null, output: string|null, context: string[], nondeterminism: string|null, idempotent: boolean|null, tokenBudget: number|null, latencyP50: number|null }} interface
 * @property {{ network: boolean, subprocess: boolean, envRead: string[], envWrite: string[], filesystem: string[] }} permissions
 */

/**
 * Parse an effector.toml file into an EffectorDef.
 * Section-aware: fields are extracted only from their correct [section].
 *
 * @param {string} content - Raw effector.toml content
 * @returns {EffectorDef}
 */
export function parseEffectorToml(content) {
  const root = extractSection(content, 'effector');
  const iface = extractSection(content, 'effector.interface');
  const perms = extractSection(content, 'effector.permissions');

  return {
    name: extractField(root, 'name'),
    version: extractField(root, 'version'),
    type: extractField(root, 'type'),
    description: extractField(root, 'description'),
    interface: {
      input: extractField(iface, 'input'),
      output: extractField(iface, 'output'),
      context: extractArrayField(iface, 'context'),
      nondeterminism: extractField(iface, 'nondeterminism'),
      idempotent: extractBoolField(iface, 'idempotent') || null,
      tokenBudget: extractIntField(iface, 'token-budget'),
      latencyP50: extractIntField(iface, 'latency-p50'),
    },
    permissions: {
      network: extractBoolField(perms, 'network'),
      subprocess: extractBoolField(perms, 'subprocess'),
      envRead: extractArrayField(perms, 'env-read'),
      envWrite: extractArrayField(perms, 'env-write'),
      filesystem: extractArrayField(perms, 'filesystem'),
    },
  };
}

// ─── Registry Loader ─────────────────────────────────────────

/**
 * Scan a directory for effector.toml files and build a registry.
 * Checks root + one level of subdirectories.
 *
 * @param {string} searchDir - Directory to scan
 * @returns {Map<string, EffectorDef>} Map of name → EffectorDef
 */
export function loadRegistryAsMap(searchDir) {
  const registry = new Map();
  for (const def of scanDirectory(searchDir)) {
    if (def.name) registry.set(def.name, def);
  }
  return registry;
}

/**
 * Scan a directory for effector.toml files and return an array.
 *
 * @param {string} searchDir - Directory to scan
 * @returns {EffectorDef[]}
 */
export function loadRegistryAsArray(searchDir) {
  return scanDirectory(searchDir);
}

/**
 * Internal scanner — yields EffectorDefs from a directory tree.
 */
function scanDirectory(searchDir) {
  const results = [];
  if (!existsSync(searchDir)) return results;

  // Check root
  const rootToml = join(searchDir, 'effector.toml');
  if (existsSync(rootToml)) {
    const def = parseEffectorToml(readFileSync(rootToml, 'utf-8'));
    if (def.name) results.push(def);
  }

  // Scan subdirectories (one level)
  try {
    const entries = readdirSync(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const tomlPath = join(searchDir, entry.name, 'effector.toml');
      if (existsSync(tomlPath)) {
        const def = parseEffectorToml(readFileSync(tomlPath, 'utf-8'));
        if (def.name) results.push(def);
      }
    }
  } catch { /* directory not readable */ }

  return results;
}
