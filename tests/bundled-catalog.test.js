import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isKnownType, checkTypeCompatibility, setCatalog } from '../src/type-checker.js';

describe('Bundled types catalog', () => {
  it('loads without filesystem search', () => {
    // isKnownType triggers loadCatalog() internally
    assert.ok(isKnownType('String'), 'String should be a known type');
    assert.ok(isKnownType('CodeDiff'), 'CodeDiff should be a known type');
    assert.ok(isKnownType('ReviewReport'), 'ReviewReport should be a known type');
  });

  it('contains input types', () => {
    const inputs = ['String', 'FilePath', 'URL', 'JSON', 'CodeDiff', 'CodeSnippet',
      'RepositoryRef', 'IssueRef', 'PullRequestRef', 'CommitRef', 'TextDocument',
      'DataTable', 'ImageRef'];
    for (const t of inputs) {
      assert.ok(isKnownType(t), `${t} should be a known input type`);
    }
  });

  it('contains output types', () => {
    const outputs = ['Markdown', 'ReviewReport', 'SecurityReport', 'Notification',
      'OperationStatus', 'TestResult', 'DeploymentStatus', 'LintReport', 'Summary'];
    for (const t of outputs) {
      assert.ok(isKnownType(t), `${t} should be a known output type`);
    }
  });

  it('contains context types', () => {
    const contexts = ['GitHubCredentials', 'GenericAPIKey', 'AWSCredentials',
      'SlackCredentials', 'Repository', 'Docker', 'Kubernetes'];
    for (const t of contexts) {
      assert.ok(isKnownType(t), `${t} should be a known context type`);
    }
  });

  it('resolves aliases from bundled catalog', () => {
    const result = checkTypeCompatibility('PlainText', 'String');
    assert.ok(result.compatible, 'PlainText should be compatible with String (alias)');
    assert.equal(result.precision, 0.95);
  });

  it('resolves subtype relations from bundled catalog', () => {
    const result = checkTypeCompatibility('SecurityReport', 'ReviewReport');
    assert.ok(result.compatible, 'SecurityReport should be subtype of ReviewReport');
    assert.equal(result.precision, 0.9);
  });

  it('subtypes satisfy parent required fields (Liskov Substitution)', async () => {
    // SlackMessage and DiscordMessage are subtypes of Notification.
    // Notification requires ["message"]. Subtypes MUST also have "message".
    // This test prevents the LSP violation regression.
    const catalog = JSON.parse(
      (await import('node:fs')).readFileSync(
        new URL('../src/types-catalog.json', import.meta.url), 'utf-8'
      )
    );
    const types = catalog.types;
    for (const [role, roleTypes] of Object.entries(types)) {
      for (const [name, def] of Object.entries(roleTypes)) {
        if (!def.subtypeOf) continue;
        for (const parent of def.subtypeOf) {
          // Find parent in any role
          let parentDef = null;
          for (const r of Object.values(types)) {
            if (r[parent]) { parentDef = r[parent]; break; }
          }
          if (!parentDef?.fields?.required) continue;
          const childRequired = def.fields?.required || [];
          for (const field of parentDef.fields.required) {
            assert.ok(
              childRequired.includes(field),
              `LSP violation: ${name} (subtype of ${parent}) is missing required field "${field}"`
            );
          }
        }
      }
    }
  });

  it('setCatalog() overrides the bundled catalog', () => {
    const custom = {
      types: { input: { Foo: { aliases: [] } }, output: {}, context: {} },
      subtypeRelations: [],
    };
    setCatalog(custom);
    assert.ok(isKnownType('Foo'), 'Custom type Foo should be known after setCatalog');
    assert.ok(!isKnownType('CodeDiff'), 'CodeDiff should not be known with custom catalog');

    // Restore bundled catalog for other tests
    setCatalog(null);
    // Force re-search by resetting internals — in practice consumers don't need this
  });
});
