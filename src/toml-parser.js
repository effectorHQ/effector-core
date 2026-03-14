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

// ─── Main Parser ─────────────────────────────────────────────

/**
 * @typedef {Object} EffectorDef
 * @property {string|null} name
 * @property {string|null} version
 * @property {string|null} type
 * @property {string|null} description
 * @property {{ input: string|null, output: string|null, context: string[], nondeterminism: string|null, idempotent: boolean|null, tokenBudget: number|null, latencyP50: number|null }} interface
 * @property {{ network: boolean, subprocess: boolean }} permissions
 */

/**
 * Parse an effector.toml file into an EffectorDef.
 *
 * @param {string} content - Raw effector.toml content
 * @returns {EffectorDef}
 */
export function parseEffectorToml(content) {
  return {
    name: extractField(content, 'name'),
    version: extractField(content, 'version'),
    type: extractField(content, 'type'),
    description: extractField(content, 'description'),
    interface: {
      input: extractField(content, 'input'),
      output: extractField(content, 'output'),
      context: extractArrayField(content, 'context'),
      nondeterminism: extractField(content, 'nondeterminism'),
      idempotent: extractBoolField(content, 'idempotent') || null,
      tokenBudget: extractIntField(content, 'token-budget'),
      latencyP50: extractIntField(content, 'latency-p50'),
    },
    permissions: {
      network: extractBoolField(content, 'network'),
      subprocess: extractBoolField(content, 'subprocess'),
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
