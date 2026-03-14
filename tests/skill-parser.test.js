import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseSkillFile, parseYaml, extractMetadata } from '../src/skill-parser.js';

const sampleSkill = `---
name: code-review
description: Reviews pull request diffs
metadata:
  effector:
    emoji: "\uD83D\uDD0D"
    requires:
      network: false
    install:
      - pip install pylint
tags:
  - code
  - review
---

# Commands

## /review

Reviews the current PR diff and provides feedback.
`;

describe('parseSkillFile', () => {
  it('parses frontmatter and body', () => {
    const result = parseSkillFile(sampleSkill);
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
    assert.ok(result.frontmatter.includes('code-review'));
    assert.ok(result.body.includes('# Commands'));
  });

  it('parses nested objects', () => {
    const result = parseSkillFile(sampleSkill);
    assert.equal(result.parsed.name, 'code-review');
    assert.ok(result.parsed.metadata);
    assert.ok(result.parsed.metadata.effector);
  });

  it('parses arrays', () => {
    const result = parseSkillFile(sampleSkill);
    assert.deepEqual(result.parsed.tags, ['code', 'review']);
  });

  it('rejects content without frontmatter', () => {
    const result = parseSkillFile('# Just a markdown file');
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('---'));
  });

  it('rejects unclosed frontmatter', () => {
    const result = parseSkillFile('---\nname: test\nno closing delimiter');
    assert.equal(result.valid, false);
  });
});

describe('parseYaml', () => {
  it('parses key-value pairs', () => {
    const result = parseYaml('name: test\nversion: 1.0.0');
    assert.equal(result.name, 'test');
    assert.equal(result.version, '1.0.0');
  });

  it('handles quoted values', () => {
    const result = parseYaml('name: "hello world"');
    assert.equal(result.name, 'hello world');
  });

  it('handles block scalars', () => {
    const result = parseYaml('content: |\n  line1\n  line2');
    assert.ok(result.content.includes('line1'));
    assert.ok(result.content.includes('line2'));
  });
});

describe('extractMetadata', () => {
  it('extracts name and description', () => {
    const result = parseSkillFile(sampleSkill);
    const meta = extractMetadata(result.parsed);
    assert.equal(meta.name, 'code-review');
    assert.ok(meta.description.includes('Reviews'));
  });
});
