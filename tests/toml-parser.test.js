import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEffectorToml, loadRegistryAsMap, loadRegistryAsArray } from '../src/toml-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', '..', 'effector-compose', 'tests', 'fixtures');

const sampleToml = `
[effector]
name = "code-review"
version = "1.2.0"
type = "skill"
description = "Reviews code diffs and produces a structured report"

[effector.interface]
input = "CodeDiff"
output = "ReviewReport"
context = ["GitHubCredentials", "Repository"]
nondeterminism = "moderate"
idempotent = true
token-budget = 4000
latency-p50 = 3000

[effector.permissions]
network = false
subprocess = false
`;

describe('parseEffectorToml', () => {
  it('extracts all [effector] fields', () => {
    const def = parseEffectorToml(sampleToml);
    assert.equal(def.name, 'code-review');
    assert.equal(def.version, '1.2.0');
    assert.equal(def.type, 'skill');
    assert.ok(def.description.startsWith('Reviews'));
  });

  it('extracts [effector.interface] fields', () => {
    const def = parseEffectorToml(sampleToml);
    assert.equal(def.interface.input, 'CodeDiff');
    assert.equal(def.interface.output, 'ReviewReport');
    assert.deepEqual(def.interface.context, ['GitHubCredentials', 'Repository']);
  });

  it('extracts cost annotations', () => {
    const def = parseEffectorToml(sampleToml);
    assert.equal(def.interface.nondeterminism, 'moderate');
    assert.equal(def.interface.tokenBudget, 4000);
    assert.equal(def.interface.latencyP50, 3000);
  });

  it('extracts [effector.permissions]', () => {
    const def = parseEffectorToml(sampleToml);
    assert.equal(def.permissions.network, false);
    assert.equal(def.permissions.subprocess, false);
  });

  it('handles missing optional fields', () => {
    const minimal = `
[effector]
name = "test"
version = "0.1.0"
type = "skill"
description = "A test skill"
`;
    const def = parseEffectorToml(minimal);
    assert.equal(def.name, 'test');
    assert.equal(def.interface.input, null);
    assert.equal(def.interface.output, null);
    assert.deepEqual(def.interface.context, []);
  });
});

describe('loadRegistryAsMap', () => {
  it('loads effectors from fixture directory', () => {
    const registry = loadRegistryAsMap(fixturesDir);
    assert.ok(registry.size >= 2);
    assert.ok(registry.has('code-review'));
    assert.ok(registry.has('slack-notify'));
  });

  it('returns empty Map for nonexistent directory', () => {
    const registry = loadRegistryAsMap('/nonexistent');
    assert.equal(registry.size, 0);
  });
});

describe('loadRegistryAsArray', () => {
  it('loads effectors as array', () => {
    const arr = loadRegistryAsArray(fixturesDir);
    assert.ok(arr.length >= 2);
    assert.ok(arr.some(d => d.name === 'code-review'));
  });
});
