import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateManifest, validateTypeNames } from '../src/schema-validator.js';

const validManifest = {
  name: 'code-review',
  version: '1.2.0',
  type: 'skill',
  description: 'Reviews code diffs and produces a structured report',
  interface: { input: 'CodeDiff', output: 'ReviewReport', context: ['GitHubCredentials'] },
};

describe('validateManifest', () => {
  it('passes for valid manifest', () => {
    const r = validateManifest(validManifest);
    assert.equal(r.valid, true);
    assert.equal(r.errors.length, 0);
  });

  it('fails for missing required fields', () => {
    const r = validateManifest({ name: 'test' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.includes('version')));
    assert.ok(r.errors.some(e => e.includes('type')));
  });

  it('fails for invalid name pattern', () => {
    const r = validateManifest({ ...validManifest, name: 'UPPER_CASE' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.includes('kebab-case')));
  });

  it('fails for invalid semver', () => {
    const r = validateManifest({ ...validManifest, version: 'not-semver' });
    assert.equal(r.valid, false);
  });

  it('fails for invalid type', () => {
    const r = validateManifest({ ...validManifest, type: 'invalid-type' });
    assert.equal(r.valid, false);
  });

  it('fails for too-short description', () => {
    const r = validateManifest({ ...validManifest, description: 'short' });
    assert.equal(r.valid, false);
  });

  it('warns when interface is missing (non-workspace)', () => {
    const r = validateManifest({ ...validManifest, interface: {} });
    assert.ok(r.warnings.length > 0);
  });

  it('no interface warning for workspace type', () => {
    const r = validateManifest({ ...validManifest, type: 'workspace', interface: {} });
    assert.equal(r.warnings.length, 0);
  });
});

describe('validateTypeNames', () => {
  const catalog = {
    types: {
      input: { CodeDiff: { category: 'code', fields: { required: [] }, description: 'test' } },
      output: { ReviewReport: { category: 'analysis', fields: { required: [] }, description: 'test' } },
      context: { GitHubCredentials: { category: 'credentials', fields: { required: [] }, description: 'test' } },
    },
    subtypeRelations: [],
  };

  it('no warnings for known types', () => {
    const r = validateTypeNames(validManifest, catalog);
    assert.equal(r.warnings.length, 0);
  });

  it('warns for unknown input type', () => {
    const m = { ...validManifest, interface: { ...validManifest.interface, input: 'UnknownType' } };
    const r = validateTypeNames(m, catalog);
    assert.ok(r.warnings.some(w => w.includes('UnknownType')));
  });

  it('warns for unknown context type', () => {
    const m = { ...validManifest, interface: { ...validManifest.interface, context: ['UnknownCtx'] } };
    const r = validateTypeNames(m, catalog);
    assert.ok(r.warnings.some(w => w.includes('UnknownCtx')));
  });
});
