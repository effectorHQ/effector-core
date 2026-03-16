import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'src', 'cli.js');
const FIXTURES = join(__dirname, 'fixtures');

function run(args, opts = {}) {
  try {
    const result = execSync(`node ${CLI} ${args}`, {
      encoding: 'utf-8',
      cwd: opts.cwd || __dirname,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status };
  }
}

describe('CLI', () => {
  it('--version prints version', () => {
    const { stdout } = run('--version');
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it('--help shows usage', () => {
    const { stdout } = run('--help');
    assert.ok(stdout.includes('USAGE'));
    assert.ok(stdout.includes('validate'));
    assert.ok(stdout.includes('compile'));
  });

  it('no args shows help', () => {
    const { stdout } = run('');
    assert.ok(stdout.includes('USAGE'));
  });

  it('types lists all standard types', () => {
    const { stdout } = run('types');
    assert.ok(stdout.includes('INPUT'));
    assert.ok(stdout.includes('OUTPUT'));
    assert.ok(stdout.includes('CONTEXT'));
    assert.ok(stdout.includes('String'));
    assert.ok(stdout.includes('CodeDiff'));
    assert.ok(stdout.includes('ReviewReport'));
  });

  it('validate on non-existent dir warns', () => {
    const { stdout } = run('validate /tmp/nonexistent-effector-test-dir');
    assert.ok(stdout.includes('No effector.toml') || stdout.includes('!'));
  });

  it('unknown command exits with code 2', () => {
    const { exitCode } = run('foobar');
    assert.equal(exitCode, 2);
  });

  it('compile without --target exits with code 2', () => {
    const { exitCode } = run('compile .');
    assert.equal(exitCode, 2);
  });
});
