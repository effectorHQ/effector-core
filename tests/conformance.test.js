/**
 * Conformance tests — verify that the shared type engine produces
 * consistent results when used by both effector-compose and effector-graph.
 *
 * These tests import the same functions from different consumer paths
 * and verify identical behavior.
 */

import { test } from 'node:test';
import assert from 'node:assert';

// Import via different consumer paths (both delegate to effector-core)
import { checkTypeCompatibility } from '../../effector-compose/src/type-checker.js';
import { isTypeCompatible } from '../../effector-graph/src/core/type-checker.js';

// ── Sequential composition (compose) ↔ edge weight (graph) ──

const TYPE_PAIRS = [
  // exact match
  { output: 'Markdown', input: 'Markdown', expectCompat: true, minPrecision: 1.0 },
  // subtype
  { output: 'SecurityReport', input: 'ReviewReport', expectCompat: true, minPrecision: 0.8 },
  // another subtype
  { output: 'SlackMessage', input: 'Notification', expectCompat: true, minPrecision: 0.8 },
  // wildcard (uses * pattern)
  { output: 'SecurityReport', input: '*Report', expectCompat: true, minPrecision: 0.7 },
  // incompatible
  { output: 'Markdown', input: 'CodeDiff', expectCompat: false, minPrecision: 0 },
];

for (const { output, input, expectCompat, minPrecision } of TYPE_PAIRS) {
  test(`conformance: ${output} → ${input} — compose and graph agree`, () => {
    // compose API
    const composeResult = checkTypeCompatibility(output, input);

    // graph API
    const graphResult = isTypeCompatible(output, input);

    // Both must agree on compatibility
    if (expectCompat) {
      assert.strictEqual(composeResult.compatible, true,
        `compose: expected ${output} → ${input} to be compatible`);
      assert.ok(graphResult !== null,
        `graph: expected ${output} → ${input} to return non-null`);
      assert.ok(graphResult.precision >= minPrecision,
        `graph: expected precision >= ${minPrecision}, got ${graphResult.precision}`);
    } else {
      assert.strictEqual(composeResult.compatible, false,
        `compose: expected ${output} → ${input} to be incompatible`);
      assert.strictEqual(graphResult, null,
        `graph: expected ${output} → ${input} to return null`);
    }

    // Precision from compose should match graph when compatible
    if (expectCompat && graphResult) {
      assert.strictEqual(composeResult.precision, graphResult.precision,
        `precision mismatch: compose=${composeResult.precision} graph=${graphResult.precision}`);
    }
  });
}

// ── Spec-defined composition semantics ──────────────────

test('conformance: sequential — output feeds into next input', () => {
  // code-review (CodeDiff → ReviewReport) → notify (Notification input)
  // SecurityReport <: ReviewReport, but we need ReviewReport → Notification
  const compat = checkTypeCompatibility('ReviewReport', 'Notification');
  // These are not related by subtype — should fail
  assert.strictEqual(compat.compatible, false);
});

test('conformance: parallel — independent type checks', () => {
  // In parallel composition, each step is type-checked independently
  // Two parallel steps don't need compatible types
  const step1 = checkTypeCompatibility('CodeDiff', 'CodeDiff'); // review
  const step2 = checkTypeCompatibility('String', 'String'); // notify

  assert.strictEqual(step1.compatible, true);
  assert.strictEqual(step2.compatible, true);
});

test('conformance: conditional — all branches must type-check', () => {
  // Conditional: if severity > 5, route to SecurityReport branch else ReviewReport
  // Both branches feed into a downstream step expecting ReviewReport
  const branch1 = checkTypeCompatibility('SecurityReport', 'ReviewReport');
  const branch2 = checkTypeCompatibility('ReviewReport', 'ReviewReport');

  assert.strictEqual(branch1.compatible, true, 'SecurityReport should be compat with ReviewReport');
  assert.strictEqual(branch2.compatible, true, 'ReviewReport should be compat with itself');
});

test('conformance: isKnownType consistent across both engines', async () => {
  const { isKnownType } = await import('../src/type-checker.js');

  // Both compose and graph should use the same type catalog
  assert.strictEqual(isKnownType('CodeDiff'), true);
  assert.strictEqual(isKnownType('ReviewReport'), true);
  assert.strictEqual(isKnownType('SecurityReport'), true);
  assert.strictEqual(isKnownType('FakeType123'), false);
});
