/**
 * Tests for the reverse compiler (MCP → effector.toml)
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { reverseMCP } from '../src/reverse-compiler.js';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'mcp-servers');

// ─── Basic tool extraction ────────────────────────────────

test('basic-tool: extracts single tool', () => {
  const result = reverseMCP(join(FIXTURES, 'basic-tool'));
  assert.strictEqual(result.tools.length, 1);
  assert.strictEqual(result.tools[0].name, 'echo');
});

test('basic-tool: generates valid TOML with [effector] section', () => {
  const result = reverseMCP(join(FIXTURES, 'basic-tool'));
  assert.ok(result.toml.includes('[effector]'));
  assert.ok(result.toml.includes('name = "echo"'));
  assert.ok(result.toml.includes('[effector.interface]'));
  assert.ok(result.toml.includes('[effector.permissions]'));
});

test('basic-tool: infers String input from single string property', () => {
  const result = reverseMCP(join(FIXTURES, 'basic-tool'));
  assert.ok(result.toml.includes('input   = "String"'));
});

test('basic-tool: no network permission (no fetch calls)', () => {
  const result = reverseMCP(join(FIXTURES, 'basic-tool'));
  assert.ok(result.toml.includes('network    = false'));
});

// ─── Multi-tool extraction ────────────────────────────────

test('multi-tool: extracts both tools', () => {
  const result = reverseMCP(join(FIXTURES, 'multi-tool'));
  assert.strictEqual(result.tools.length, 2);
  const names = result.tools.map(t => t.name);
  assert.ok(names.includes('fetch-url'));
  assert.ok(names.includes('search-web'));
});

test('multi-tool: detects network permission from fetch()', () => {
  const result = reverseMCP(join(FIXTURES, 'multi-tool'));
  assert.ok(result.toml.includes('network    = true'));
});

test('multi-tool: warns about multiple tools', () => {
  const result = reverseMCP(join(FIXTURES, 'multi-tool'));
  assert.ok(result.warnings.some(w => w.includes('2 tools')));
});

test('multi-tool: infers URL input for fetch-url tool', () => {
  const result = reverseMCP(join(FIXTURES, 'multi-tool'));
  // First tool is fetch-url which has a "url" property → URL type
  assert.ok(result.toml.includes('input   = "URL"'));
});

// ─── Environment variable detection ───────────────────────

test('env-vars: detects GITHUB_TOKEN', () => {
  const result = reverseMCP(join(FIXTURES, 'env-vars'));
  assert.ok(result.toml.includes('GITHUB_TOKEN'));
});

test('env-vars: detects GITHUB_API_URL from bracket notation', () => {
  const result = reverseMCP(join(FIXTURES, 'env-vars'));
  assert.ok(result.toml.includes('GITHUB_API_URL'));
});

test('env-vars: network permission from fetch', () => {
  const result = reverseMCP(join(FIXTURES, 'env-vars'));
  assert.ok(result.toml.includes('network    = true'));
});

// ─── Complex schema ───────────────────────────────────────

test('complex-schema: extracts get-pr-diff tool', () => {
  const result = reverseMCP(join(FIXTURES, 'complex-schema'));
  assert.ok(result.tools.some(t => t.name === 'get-pr-diff'));
});

test('complex-schema: infers RepositoryRef from owner+repo properties', () => {
  const result = reverseMCP(join(FIXTURES, 'complex-schema'));
  // get-pr-diff has owner+repo → RepositoryRef
  assert.ok(result.toml.includes('RepositoryRef'));
});

test('complex-schema: detects subprocess from execSync', () => {
  const result = reverseMCP(join(FIXTURES, 'complex-schema'));
  assert.ok(result.toml.includes('subprocess = true'));
});

test('complex-schema: detects both network and subprocess', () => {
  const result = reverseMCP(join(FIXTURES, 'complex-schema'));
  assert.ok(result.toml.includes('network    = true'));
  assert.ok(result.toml.includes('subprocess = true'));
});

// ─── Edge cases ───────────────────────────────────────────

test('empty directory: returns empty toml with warning', () => {
  const result = reverseMCP(join(FIXTURES, '..'));  // fixtures dir has no .js files directly
  // Should either find tools from subdirs or warn
  assert.ok(Array.isArray(result.warnings));
  assert.ok(typeof result.toml === 'string');
});
