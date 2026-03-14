import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { checkTypeCompatibility, isTypeCompatible, isKnownType } from '../src/type-checker.js';

describe('checkTypeCompatibility', () => {
  it('exact match → compatible, precision 1.0', () => {
    const r = checkTypeCompatibility('ReviewReport', 'ReviewReport');
    assert.equal(r.compatible, true);
    assert.equal(r.precision, 1.0);
    assert.equal(r.reason, 'exact-match');
  });

  it('alias match: PlainText → String', () => {
    const r = checkTypeCompatibility('PlainText', 'String');
    assert.equal(r.compatible, true);
    assert.equal(r.precision, 0.95);
    assert.equal(r.reason, 'alias-match');
  });

  it('subtype match: SecurityReport → ReviewReport', () => {
    const r = checkTypeCompatibility('SecurityReport', 'ReviewReport');
    assert.equal(r.compatible, true);
    assert.equal(r.precision, 0.9);
    assert.equal(r.reason, 'subtype-match');
  });

  it('subtype match: SlackMessage → Notification', () => {
    const r = checkTypeCompatibility('SlackMessage', 'Notification');
    assert.equal(r.compatible, true);
    assert.equal(r.precision, 0.9);
  });

  it('wildcard match: ReviewReport → *Report', () => {
    const r = checkTypeCompatibility('ReviewReport', '*Report');
    assert.equal(r.compatible, true);
    assert.equal(r.precision, 0.8);
    assert.equal(r.reason, 'wildcard-match');
  });

  it('incompatible types', () => {
    const r = checkTypeCompatibility('JSON', 'CodeDiff');
    assert.equal(r.compatible, false);
    assert.equal(r.precision, null);
    assert.equal(r.reason, 'incompatible');
  });

  it('supertype NOT compatible with subtype', () => {
    const r = checkTypeCompatibility('ReviewReport', 'SecurityReport');
    assert.equal(r.compatible, false);
  });

  it('handles null types gracefully', () => {
    const r = checkTypeCompatibility(null, 'String');
    assert.equal(r.compatible, true);
    assert.equal(r.reason, 'missing-type');
  });

  it('structural match for objects', () => {
    const r = checkTypeCompatibility(
      { findings: [], severity: 'high', extra: true },
      { findings: [], severity: 'high' }
    );
    assert.equal(r.compatible, true);
    assert.equal(r.reason, 'structural-match');
  });

  it('structural mismatch for objects', () => {
    const r = checkTypeCompatibility(
      { code: 'string' },
      { images: [], mimeType: 'png' }
    );
    assert.equal(r.compatible, false);
    assert.equal(r.reason, 'structural-mismatch');
  });
});

describe('isTypeCompatible (graph adapter)', () => {
  it('returns { precision } for compatible types', () => {
    const r = isTypeCompatible('Markdown', 'Markdown');
    assert.ok(r);
    assert.equal(r.precision, 1.0);
  });

  it('returns null for incompatible types', () => {
    const r = isTypeCompatible('JSON', 'CodeDiff');
    assert.equal(r, null);
  });

  it('returns precision for subtype', () => {
    const r = isTypeCompatible('SecurityReport', 'ReviewReport');
    assert.ok(r);
    assert.equal(r.precision, 0.9);
  });
});

describe('isKnownType', () => {
  it('recognizes standard types', () => {
    assert.equal(isKnownType('CodeDiff'), true);
    assert.equal(isKnownType('Markdown'), true);
    assert.equal(isKnownType('GitHubCredentials'), true);
  });

  it('rejects unknown types', () => {
    assert.equal(isKnownType('FooBarBaz'), false);
  });
});
