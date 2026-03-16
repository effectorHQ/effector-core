import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { compile, listTargets, registerTarget, unregisterTarget } from '../src/compiler-targets.js';

const SAMPLE_DEF = {
  name: 'test-tool',
  version: '0.1.0',
  type: 'skill',
  description: 'A test tool for custom target testing',
  interface: { input: 'String', output: 'Markdown', context: [] },
  permissions: { network: false, subprocess: false, envRead: [], envWrite: [], filesystem: false },
};

describe('Custom compile targets', () => {
  afterEach(() => {
    unregisterTarget('crewai');
    unregisterTarget('autogen');
  });

  it('registerTarget adds a custom target', () => {
    registerTarget('crewai', (def) => JSON.stringify({ tool: def.name }), {
      description: 'CrewAI tool definition',
      format: 'json',
    });

    const targets = listTargets();
    const crewai = targets.find(t => t.name === 'crewai');
    assert.ok(crewai, 'crewai should appear in listTargets');
    assert.equal(crewai.description, 'CrewAI tool definition');
  });

  it('compile uses custom target', () => {
    registerTarget('crewai', (def) => JSON.stringify({ name: def.name, type: 'crewai' }));

    const output = compile(SAMPLE_DEF, 'crewai');
    const parsed = JSON.parse(output);
    assert.equal(parsed.name, 'test-tool');
    assert.equal(parsed.type, 'crewai');
  });

  it('unregisterTarget removes a custom target', () => {
    registerTarget('autogen', (def) => def.name);
    assert.ok(unregisterTarget('autogen'));
    assert.ok(!unregisterTarget('autogen'), 'second unregister should return false');
  });

  it('custom targets take precedence over built-in on name collision', () => {
    registerTarget('json', (def) => 'custom-json');
    const output = compile(SAMPLE_DEF, 'json');
    assert.equal(output, 'custom-json');
    unregisterTarget('json');
  });

  it('throws EffectorError for unknown target', () => {
    assert.throws(
      () => compile(SAMPLE_DEF, 'nonexistent'),
      (err) => err.code === 'EFFECTOR_COMPILE_TARGET_UNKNOWN',
    );
  });

  it('listTargets includes both built-in and custom', () => {
    registerTarget('crewai', (def) => '');
    const targets = listTargets();
    assert.ok(targets.length >= 5, 'should have at least 5 targets (4 built-in + 1 custom)');
    assert.ok(targets.find(t => t.name === 'mcp'), 'should still have mcp');
    assert.ok(targets.find(t => t.name === 'crewai'), 'should have crewai');
  });
});
