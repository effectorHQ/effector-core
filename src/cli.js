#!/usr/bin/env node
/**
 * @effectorhq/core CLI
 *
 * Usage:
 *   effector-core validate [dir]
 *   effector-core compile [dir] -t <target>
 *   effector-core check-types [dir]
 *   effector-core types
 *   effector-core init
 *   effector-core --help
 *   effector-core --version
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseEffectorToml } from './toml-parser.js';
import { parseSkillFile } from './skill-parser.js';
import { validateManifest } from './schema-validator.js';
import { isKnownType } from './type-checker.js';
import { compile, listTargets } from './compiler-targets.js';

// ─── Colors (with NO_COLOR support) ───────────────────────

const NO_COLOR = process.env.NO_COLOR !== undefined;
const c = {
  red: (s) => NO_COLOR ? s : `\x1b[31m${s}\x1b[0m`,
  green: (s) => NO_COLOR ? s : `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => NO_COLOR ? s : `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => NO_COLOR ? s : `\x1b[36m${s}\x1b[0m`,
  bold: (s) => NO_COLOR ? s : `\x1b[1m${s}\x1b[0m`,
  dim: (s) => NO_COLOR ? s : `\x1b[2m${s}\x1b[0m`,
};

// ─── Version ──────────────────────────────────────────────

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

// ─── Help ─────────────────────────────────────────────────

function showHelp() {
  console.log(`
${c.bold('@effectorhq/core')} ${c.dim(`v${getVersion()}`)}
The standard toolkit for typed AI agent tool interoperability.

${c.bold('USAGE')}
  effector-core <command> [dir] [options]

${c.bold('COMMANDS')}
  ${c.cyan('validate')} [dir]           Parse and validate effector.toml + SKILL.md
  ${c.cyan('compile')}  [dir] -t <tgt>  Compile to a runtime target
  ${c.cyan('check-types')} [dir]        Validate types against the 36-type catalog
  ${c.cyan('types')}                    List all standard types
  ${c.cyan('init')}                     Scaffold effector.toml + SKILL.md

${c.bold('OPTIONS')}
  -t, --target <target>    Compile target: mcp, openai-agents, langchain, json
  -h, --help               Show this help
  -v, --version            Show version

${c.bold('EXAMPLES')}
  ${c.dim('$')} effector-core validate ./my-skill
  ${c.dim('$')} effector-core compile ./my-skill -t mcp
  ${c.dim('$')} effector-core types
  ${c.dim('$')} npx @effectorhq/core init
`);
}

// ─── Commands ─────────────────────────────────────────────

function cmdValidate(dir) {
  dir = resolve(dir || '.');
  let hasErrors = false;

  // Parse effector.toml
  const tomlPath = join(dir, 'effector.toml');
  if (existsSync(tomlPath)) {
    const content = readFileSync(tomlPath, 'utf-8');
    const def = parseEffectorToml(content);
    console.log(c.bold('effector.toml'));
    console.log(`  name: ${c.cyan(def.name || '(missing)')}`);
    console.log(`  version: ${def.version || '(missing)'}`);
    console.log(`  type: ${def.type || '(missing)'}`);

    if (def.interface) {
      console.log(`  interface: ${def.interface.input || '*'} → ${def.interface.output || '*'}`);
    }

    const result = validateManifest(def);
    if (result.errors.length > 0) {
      hasErrors = true;
      for (const err of result.errors) {
        console.log(`  ${c.red('✗')} ${err}`);
      }
    } else {
      console.log(`  ${c.green('✓')} Manifest valid`);
    }
    for (const warn of result.warnings) {
      console.log(`  ${c.yellow('!')} ${warn}`);
    }
  } else {
    console.log(`${c.yellow('!')} No effector.toml found in ${dir}`);
  }

  // Parse SKILL.md
  const skillPath = join(dir, 'SKILL.md');
  if (existsSync(skillPath)) {
    const content = readFileSync(skillPath, 'utf-8');
    const skill = parseSkillFile(content, skillPath);
    console.log('');
    console.log(c.bold('SKILL.md'));
    if (skill.valid) {
      console.log(`  ${c.green('✓')} Parsed successfully`);
      if (skill.parsed?.name) console.log(`  name: ${c.cyan(skill.parsed.name)}`);
      if (skill.parsed?.description) console.log(`  description: ${skill.parsed.description}`);
    } else {
      hasErrors = true;
      console.log(`  ${c.red('✗')} ${skill.error}`);
    }
  } else {
    console.log(`\n${c.yellow('!')} No SKILL.md found in ${dir}`);
  }

  process.exit(hasErrors ? 1 : 0);
}

function cmdCompile(dir, target) {
  dir = resolve(dir || '.');
  if (!target) {
    console.error(`${c.red('Error:')} --target is required. Options: ${listTargets().map(t => t.name).join(', ')}`);
    process.exit(2);
  }

  const tomlPath = join(dir, 'effector.toml');
  if (!existsSync(tomlPath)) {
    console.error(`${c.red('Error:')} No effector.toml found in ${dir}`);
    process.exit(1);
  }

  const def = parseEffectorToml(readFileSync(tomlPath, 'utf-8'));

  // Attach SKILL.md content if available
  const skillPath = join(dir, 'SKILL.md');
  if (existsSync(skillPath)) {
    const skill = parseSkillFile(readFileSync(skillPath, 'utf-8'));
    if (skill.valid) def.skillContent = skill.body;
  }

  try {
    const output = compile(def, target);
    console.log(output);
  } catch (err) {
    console.error(`${c.red('Error:')} ${err.message}`);
    if (err.suggestion) console.error(`${c.dim('Suggestion:')} ${err.suggestion}`);
    process.exit(1);
  }
}

function cmdCheckTypes(dir) {
  dir = resolve(dir || '.');
  const tomlPath = join(dir, 'effector.toml');

  if (!existsSync(tomlPath)) {
    console.error(`${c.red('Error:')} No effector.toml found in ${dir}`);
    process.exit(1);
  }

  const def = parseEffectorToml(readFileSync(tomlPath, 'utf-8'));
  const iface = def.interface;

  if (!iface) {
    console.log(`${c.yellow('!')} No [effector.interface] section found.`);
    process.exit(0);
  }

  let warnings = 0;
  const types = [
    ['input', iface.input],
    ['output', iface.output],
    ...(iface.context || []).map(t => ['context', t]),
  ];

  console.log(c.bold('Type checking against 36-type catalog'));
  for (const [role, typeName] of types) {
    if (!typeName) continue;
    if (isKnownType(typeName)) {
      console.log(`  ${c.green('✓')} ${role}: ${c.cyan(typeName)}`);
    } else {
      console.log(`  ${c.yellow('!')} ${role}: ${c.yellow(typeName)} — not in standard catalog`);
      warnings++;
    }
  }

  if (warnings === 0) {
    console.log(`\n${c.green('All types are standard.')}`);
  } else {
    console.log(`\n${c.yellow(`${warnings} unknown type(s).`)} Run ${c.cyan('effector-core types')} to see the catalog.`);
  }
}

function cmdTypes() {
  // Load bundled catalog
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(new URL('./types-catalog.json', import.meta.url), 'utf-8'));
  } catch {
    console.error(`${c.red('Error:')} Failed to load types catalog.`);
    process.exit(1);
  }

  for (const role of ['input', 'output', 'context']) {
    const types = Object.entries(catalog.types[role]);
    console.log(`\n${c.bold(role.toUpperCase())} ${c.dim(`(${types.length} types)`)}`);
    for (const [name, def] of types) {
      const aliases = def.aliases?.length ? ` ${c.dim(`(aka ${def.aliases.join(', ')})`)}` : '';
      const desc = def.description ? ` — ${def.description}` : '';
      console.log(`  ${c.cyan(name)}${aliases}${desc}`);
    }
  }

  console.log(`\n${c.bold('SUBTYPE RELATIONS')}`);
  for (const rel of catalog.subtypeRelations || []) {
    console.log(`  ${c.cyan(rel.subtype)} ${c.dim('→')} ${rel.supertype}`);
  }
}

function cmdInit() {
  if (existsSync('effector.toml')) {
    console.log(`${c.yellow('!')} effector.toml already exists. Skipping.`);
  } else {
    writeFileSync('effector.toml', `[effector]
name = "my-skill"
version = "0.1.0"
type = "skill"
description = "A new AI agent capability"

[effector.interface]
input = "String"
output = "Markdown"
context = []

[effector.permissions]
network = false
subprocess = false
`);
    console.log(`${c.green('✓')} Created effector.toml`);
  }

  if (existsSync('SKILL.md')) {
    console.log(`${c.yellow('!')} SKILL.md already exists. Skipping.`);
  } else {
    writeFileSync('SKILL.md', `---
name: my-skill
description: A new AI agent capability
version: "0.1.0"
---

# My Skill

## Instructions

Describe what this skill does and how the AI agent should execute it.

## Examples

Provide example inputs and expected outputs.
`);
    console.log(`${c.green('✓')} Created SKILL.md`);
  }

  console.log(`\n${c.bold('Next steps:')}`);
  console.log(`  1. Edit ${c.cyan('effector.toml')} with your tool's interface`);
  console.log(`  2. Edit ${c.cyan('SKILL.md')} with instructions for the AI agent`);
  console.log(`  3. Run ${c.cyan('effector-core validate .')} to verify`);
}

// ─── Main ─────────────────────────────────────────────────

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      target: { type: 'string', short: 't' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.version) {
    console.log(getVersion());
    process.exit(0);
  }

  if (values.help || positionals.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = positionals[0];
  const dir = positionals[1];

  switch (command) {
    case 'validate':
      cmdValidate(dir);
      break;
    case 'compile':
      cmdCompile(dir, values.target);
      break;
    case 'check-types':
      cmdCheckTypes(dir);
      break;
    case 'types':
      cmdTypes();
      break;
    case 'init':
      cmdInit();
      break;
    default:
      console.error(`${c.red('Unknown command:')} ${command}`);
      showHelp();
      process.exit(2);
  }
} catch (err) {
  console.error(`${c.red('Error:')} ${err.message}`);
  process.exit(1);
}
