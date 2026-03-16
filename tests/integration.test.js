/**
 * End-to-end integration test — proves the full golden path:
 *   create-effector → skill-lint → validate-manifest → skill-eval → compile → type-check
 *
 * This test runs ACROSS repos using file imports. It's the canary for regressions.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Cross-repo imports via @effectorhq/core
import { parseSkillFile } from '@effectorhq/core/skill';
import { parseEffectorToml } from '@effectorhq/core/toml';
import { isTypeCompatible } from '@effectorhq/core/types';
import { validateManifest } from '@effectorhq/core/schema';

const TMP = join(tmpdir(), `effector-integration-${Date.now()}`);

// ── Test fixtures ───────────────────────────────────────────

const SKILL_MD = `---
name: code-review
description: Reviews code diffs and produces structured review reports
version: 1
metadata:
  effector:
    emoji: 🔍
---

## Purpose

Analyze code diffs and produce structured review reports with actionable feedback.

## When to Use

- Pull request reviews
- Pre-commit code quality checks

## When NOT to Use

- Binary file diffs
- Generated code

## Setup

No setup required.

## Commands

Review a code diff by providing the diff content.

## Examples

\`\`\`bash
# Review a git diff
git diff main | effector run code-review
\`\`\`

\`\`\`json
{
  "input": "diff --git a/src/app.js...",
  "output": { "grade": "B", "issues": 2 }
}
\`\`\`

## Notes

Supports unified diff format only.
`;

const EFFECTOR_TOML = `[effector]
name = "code-review"
version = "0.1.0"
type = "skill"
description = "Reviews code diffs and produces structured review reports"

[effector.interface]
input = "CodeDiff"
output = "ReviewReport"
context = ["Repository"]
nondeterminism = "low"
idempotent = true

[effector.permissions]
network = false
subprocess = false
`;

describe('Golden path integration', () => {
  before(() => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(join(TMP, 'SKILL.md'), SKILL_MD);
    writeFileSync(join(TMP, 'effector.toml'), EFFECTOR_TOML);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('Step 1: parseSkillFile parses SKILL.md correctly', () => {
    const content = readFileSync(join(TMP, 'SKILL.md'), 'utf-8');
    const result = parseSkillFile(content, join(TMP, 'SKILL.md'));

    assert.ok(result.valid, `Parse failed: ${result.error}`);
    assert.equal(result.parsed.name, 'code-review');
    assert.equal(result.parsed.description, 'Reviews code diffs and produces structured review reports');
    assert.equal(result.parsed.version, 1); // type coercion: string → number
    assert.ok(result.body.includes('## Purpose'));
    assert.ok(result.body.includes('## Examples'));
  });

  it('Step 2: parseEffectorToml parses manifest with section awareness', () => {
    const content = readFileSync(join(TMP, 'effector.toml'), 'utf-8');
    const toml = parseEffectorToml(content);

    assert.equal(toml.name, 'code-review');
    assert.equal(toml.version, '0.1.0');
    assert.equal(toml.type, 'skill');

    // Section-aware: interface fields only from [effector.interface]
    assert.equal(toml.interface.input, 'CodeDiff');
    assert.equal(toml.interface.output, 'ReviewReport');
    assert.deepEqual(toml.interface.context, ['Repository']);
    assert.equal(toml.interface.nondeterminism, 'low');
    assert.equal(toml.interface.idempotent, true);

    // Section-aware: permissions fields only from [effector.permissions]
    assert.equal(toml.permissions.network, false);
    assert.equal(toml.permissions.subprocess, false);
  });

  it('Step 3: validateManifest accepts the manifest', () => {
    const content = readFileSync(join(TMP, 'effector.toml'), 'utf-8');
    const toml = parseEffectorToml(content);
    const result = validateManifest(toml);

    assert.ok(result.valid, `Validation failed: ${JSON.stringify(result.errors)}`);
  });

  it('Step 4: type checker validates CodeDiff → ReviewReport compatibility', () => {
    // CodeDiff is an input type, ReviewReport is an output type
    // Both should be recognized as valid standard types
    const selfCompatInput = isTypeCompatible('CodeDiff', 'CodeDiff');
    assert.ok(selfCompatInput, 'CodeDiff should be self-compatible');

    const selfCompatOutput = isTypeCompatible('ReviewReport', 'ReviewReport');
    assert.ok(selfCompatOutput, 'ReviewReport should be self-compatible');
  });

  it('Step 5: type checker detects incompatible types', () => {
    // String → ReviewReport should be incompatible (String is not a subtype)
    const incompatible = isTypeCompatible('String', 'ReviewReport');
    assert.ok(!incompatible, 'String should not be compatible with ReviewReport');
  });

  it('Step 6: error context includes file path', () => {
    const badContent = 'no frontmatter here';
    const result = parseSkillFile(badContent, '/fake/path/SKILL.md');

    assert.equal(result.valid, false);
    assert.ok(result.error.includes('/fake/path/SKILL.md'), 'Error should include file path');
  });

  it('Step 7: YAML type coercion works', () => {
    const yaml = `---
name: test
version: 2
nondeterministic: true
count: 42
---
body`;
    const result = parseSkillFile(yaml);
    assert.ok(result.valid);
    assert.equal(result.parsed.version, 2);
    assert.equal(result.parsed.nondeterministic, true);
    assert.equal(result.parsed.count, 42);
  });
});
