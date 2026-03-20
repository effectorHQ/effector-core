/**
 * Tests for src/guard.js — Runtime type guards
 *
 * Uses actual type catalog fields:
 *   CodeDiff: required ["files"], optional ["baseBranch", "headBranch", "repository"]
 *   ReviewReport: required ["findings", "severity", "summary"], optional ["score"]
 *   Notification: required ["message"], optional ["channel", "level", "attachments"]
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAgainstType, createGuard, guardCall } from '../src/guard.js';

// ─── validateAgainstType ────────────────────────────────────

describe('validateAgainstType', () => {
  it('validates a CodeDiff with all required fields', () => {
    const data = { files: [{ path: 'src/foo.js', diff: '+line' }] };
    const result = validateAgainstType(data, 'CodeDiff');

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.ok(result.metadata.requiredFields.includes('files'));
  });

  it('rejects a CodeDiff missing required fields', () => {
    const data = { baseBranch: 'main' }; // missing 'files'
    const result = validateAgainstType(data, 'CodeDiff');

    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('missing required field'));
    assert.ok(result.metadata.missingFields.includes('files'));
  });

  it('validates a ReviewReport with all required fields', () => {
    const data = { findings: [], severity: 'low', summary: 'Looks good' };
    const result = validateAgainstType(data, 'ReviewReport');

    assert.equal(result.valid, true);
  });

  it('rejects a ReviewReport missing required fields', () => {
    const data = { summary: 'Partial' }; // missing findings and severity
    const result = validateAgainstType(data, 'ReviewReport');

    assert.equal(result.valid, false);
    assert.ok(result.metadata.missingFields.includes('findings'));
    assert.ok(result.metadata.missingFields.includes('severity'));
  });

  it('rejects null data', () => {
    const result = validateAgainstType(null, 'CodeDiff');
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('null'));
  });

  it('allows primitive types for string data', () => {
    const result = validateAgainstType('hello world', 'String');
    assert.equal(result.valid, true);
  });

  it('warns for unknown types but still passes', () => {
    const result = validateAgainstType({ foo: 1 }, 'UnknownCustomType');
    assert.equal(result.valid, true);
    assert.ok(result.warnings[0].includes('not in catalog'));
  });

  it('validates Notification with message field', () => {
    const data = { message: 'Deploy complete' };
    const result = validateAgainstType(data, 'Notification');
    assert.equal(result.valid, true);
  });

  it('rejects Notification without message field', () => {
    const data = { channel: '#general' }; // message is required
    const result = validateAgainstType(data, 'Notification');
    assert.equal(result.valid, false);
    assert.ok(result.metadata.missingFields.includes('message'));
  });
});

// ─── createGuard ────────────────────────────────────────────

describe('createGuard', () => {
  it('creates a guard that validates input', () => {
    const guard = createGuard({ input: 'CodeDiff', output: 'ReviewReport' });
    const result = guard.validateInput({ files: [{ path: 'a.js' }] });
    assert.equal(result.valid, true);
  });

  it('throws EffectorError for invalid input (default onError=throw)', () => {
    const guard = createGuard({ input: 'CodeDiff', output: 'ReviewReport' });
    assert.throws(
      () => guard.validateInput({ baseBranch: 'main' }), // missing files
      (err) => err.name === 'EffectorError' && err.code === 'EFFECTOR_VALIDATION_ERROR'
    );
  });

  it('logs instead of throwing when onError=log', () => {
    const guard = createGuard(
      { input: 'CodeDiff' },
      { onError: 'log' }
    );
    // Should not throw
    const result = guard.validateInput({ baseBranch: 'main' });
    assert.equal(result.valid, false);
  });

  it('validates context availability', () => {
    const guard = createGuard({ input: 'String', context: ['Repository', 'GitBranch'] });
    const result = guard.validateContext({ Repository: {}, GitBranch: 'main' });
    assert.equal(result.valid, true);
  });

  it('rejects missing context', () => {
    const guard = createGuard({ input: 'String', context: ['Repository', 'GitBranch'] });
    assert.throws(
      () => guard.validateContext({ Repository: {} }), // missing GitBranch
      (err) => err.name === 'EffectorError'
    );
  });

  it('skips validation when type is not declared', () => {
    const guard = createGuard({}); // no input/output
    const result = guard.validateInput({ anything: true });
    assert.equal(result.valid, true);
  });
});

// ─── guardCall ──────────────────────────────────────────────

describe('guardCall', () => {
  it('wraps an async function with I/O validation', async () => {
    const mockTool = async (input) => ({
      findings: [{ line: 1, text: 'Good' }],
      severity: 'low',
      summary: 'LGTM',
    });

    const safe = guardCall(mockTool, { input: 'CodeDiff', output: 'ReviewReport' });
    const result = await safe({ files: [{ path: 'a.js' }] });

    assert.deepEqual(result.findings, [{ line: 1, text: 'Good' }]);
  });

  it('throws on invalid input before calling the function', async () => {
    let called = false;
    const mockTool = async () => { called = true; return {}; };

    const safe = guardCall(mockTool, { input: 'CodeDiff' });

    await assert.rejects(
      () => safe({ baseBranch: 'main' }), // missing files
      (err) => err.name === 'EffectorError'
    );
    assert.equal(called, false, 'Function should not be called on invalid input');
  });

  it('throws on invalid output after calling the function', async () => {
    const mockTool = async () => ({ partial: true }); // missing ReviewReport fields

    const safe = guardCall(mockTool, { input: 'String', output: 'ReviewReport' });

    await assert.rejects(
      () => safe('hello'),
      (err) => err.name === 'EffectorError'
    );
  });
});
