/**
 * Tests for src/compiler-targets.js
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { compile, listTargets } from '../src/compiler-targets.js';

const SAMPLE_DEF = {
  name: 'linear',
  version: '1.0.0',
  type: 'skill',
  description: 'Manage Linear issues via GraphQL API',
  interface: {
    input: 'String',
    output: 'JSON',
    context: ['GenericAPIKey'],
  },
  permissions: {
    network: true,
    subprocess: false,
    envRead: ['LINEAR_API_KEY'],
  },
  skillContent: '## Purpose\nManage Linear issues.\n\n## Commands\ncurl https://api.linear.app/graphql',
};

// ── listTargets ──────────────────────────────────────────

test('listTargets: returns all 4 targets', () => {
  const targets = listTargets();
  assert.strictEqual(targets.length, 4);
  const names = targets.map(t => t.name);
  assert.ok(names.includes('mcp'));
  assert.ok(names.includes('openai-agents'));
  assert.ok(names.includes('langchain'));
  assert.ok(names.includes('json'));
});

// ── MCP target ───────────────────────────────────────────

test('compile: MCP target produces valid tool schema', () => {
  const output = compile(SAMPLE_DEF, 'mcp');
  const tool = JSON.parse(output);

  assert.strictEqual(tool.name, 'linear');
  assert.strictEqual(tool.description, 'Manage Linear issues via GraphQL API');
  assert.strictEqual(tool.inputSchema.type, 'object');
  assert.ok(tool.inputSchema.properties.LINEAR_API_KEY);
  assert.deepStrictEqual(tool.inputSchema.required, ['LINEAR_API_KEY']);
  assert.strictEqual(tool._interface.input, 'String');
  assert.strictEqual(tool._interface.output, 'JSON');
});

test('compile: MCP target handles no env vars', () => {
  const def = { ...SAMPLE_DEF, permissions: {} };
  const output = compile(def, 'mcp');
  const tool = JSON.parse(output);

  assert.deepStrictEqual(tool.inputSchema.properties, {});
  assert.strictEqual(tool.inputSchema.required, undefined);
});

// ── OpenAI Agents target ─────────────────────────────────

test('compile: OpenAI Agents target produces FunctionTool definition', () => {
  const output = compile(SAMPLE_DEF, 'openai-agents');
  const tool = JSON.parse(output);

  assert.strictEqual(tool.type, 'function');
  assert.strictEqual(tool.function.name, 'linear');
  assert.strictEqual(tool.function.description, 'Manage Linear issues via GraphQL API');
  assert.ok(tool.function.parameters.properties.LINEAR_API_KEY);
  assert.deepStrictEqual(tool.function.parameters.required, ['LINEAR_API_KEY']);
});

test('compile: OpenAI Agents target includes skill content', () => {
  const output = compile(SAMPLE_DEF, 'openai-agents');
  const tool = JSON.parse(output);

  assert.ok(tool._effector);
  assert.ok(tool._effector.skillContent.includes('Manage Linear'));
  assert.strictEqual(tool._effector.interface.input, 'String');
});

// ── LangChain target ─────────────────────────────────────

test('compile: LangChain target produces Python class', () => {
  const output = compile(SAMPLE_DEF, 'langchain');

  assert.ok(output.includes('class LinearTool(BaseTool)'));
  assert.ok(output.includes('class LinearInput(BaseModel)'));
  assert.ok(output.includes('name: str = "linear"'));
  assert.ok(output.includes('linear_api_key: str'));
  assert.ok(output.includes('from langchain.tools import BaseTool'));
});

test('compile: LangChain target with no env vars omits input class', () => {
  const def = { ...SAMPLE_DEF, name: 'simple-tool', permissions: {} };
  const output = compile(def, 'langchain');

  assert.ok(output.includes('class SimpleToolTool(BaseTool)'));
  assert.ok(!output.includes('class SimpleToolInput'));
});

// ── JSON target ──────────────────────────────────────────

test('compile: JSON target returns raw IR', () => {
  const output = compile(SAMPLE_DEF, 'json');
  const parsed = JSON.parse(output);

  assert.strictEqual(parsed.name, 'linear');
  assert.strictEqual(parsed.interface.input, 'String');
});

// ── Error handling ───────────────────────────────────────

test('compile: unknown target throws EffectorError', () => {
  assert.throws(
    () => compile(SAMPLE_DEF, 'kubernetes'),
    (err) => err.name === 'EffectorError' && err.code === 'EFFECTOR_COMPILE_TARGET_UNKNOWN'
  );
});

// ── Name normalization ───────────────────────────────────

test('compile: normalizes CamelCase names', () => {
  const def = { ...SAMPLE_DEF, name: 'EmailSender' };
  const output = compile(def, 'mcp');
  const tool = JSON.parse(output);

  assert.strictEqual(tool.name, 'email_sender');
});
