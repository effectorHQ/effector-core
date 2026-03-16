# @effectorhq/core

[![npm version](https://img.shields.io/npm/v/@effectorhq/core.svg)](https://www.npmjs.com/package/@effectorhq/core)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#zero-dependencies)
[![Tests](https://img.shields.io/badge/tests-102%20passing-brightgreen.svg)](#)

**The standard toolkit for typed AI agent tool interoperability.**

Parse, validate, type-check, and compile AI agent tool definitions — zero dependencies, 36 built-in types, 4+ compile targets.

---

## Install

```bash
npm install @effectorhq/core
```

## Quick Start

### Fluent API

```js
import { Effector } from '@effectorhq/core';

const result = Effector
  .fromDir('./my-skill')
  .validate()
  .checkTypes()
  .compile('mcp');

console.log(result); // MCP tool schema, ready to use
```

### CLI

```bash
# Scaffold a new skill
npx @effectorhq/core init

# Validate
npx @effectorhq/core validate .

# Compile to MCP
npx @effectorhq/core compile . -t mcp

# List all 36 standard types
npx @effectorhq/core types
```

### Individual Modules

```js
// Tree-shakeable subpath imports
import { parseEffectorToml } from '@effectorhq/core/toml';
import { parseSkillFile } from '@effectorhq/core/skill';
import { checkTypeCompatibility } from '@effectorhq/core/types';
import { validateManifest } from '@effectorhq/core/schema';
import { compile, registerTarget } from '@effectorhq/core/compile';
```

---

## What It Does

**Effector** adds a typed interface layer to AI agent tools. It's a sidecar manifest — your tool keeps running exactly as before.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ effector.toml │────▶│   validate   │────▶│   compile    │
│   SKILL.md   │     │  type-check  │     │  mcp/openai/ │
└──────────────┘     └──────────────┘     │  langchain   │
                                          └──────────────┘
```

### The Problem

Every AI framework defines capabilities differently. MCP tools accept untyped JSON. LangChain tools only work in Python. There's no way to answer _"Can these two tools compose?"_ until something breaks at runtime.

### The Solution

Drop an `effector.toml` next to your tool:

```toml
[effector]
name = "code-review"
version = "0.1.0"
type = "skill"
description = "Automated code review on pull request diffs"

[effector.interface]
input = "CodeDiff"
output = "ReviewReport"
context = ["Repository"]

[effector.permissions]
network = false
subprocess = false
```

Now your tool has:
- **Type-safe interfaces** — input/output/context from 36 standard types
- **Static composition checking** — verify tool chains before execution
- **Cross-runtime portability** — compile to MCP, OpenAI, LangChain, or JSON
- **Security auditing** — declared permissions vs actual behavior

---

## API Reference

### `@effectorhq/core` (barrel)

| Export | Description |
|--------|-------------|
| `Effector` | Fluent builder: `.fromDir()` → `.validate()` → `.compile()` |
| `parseEffectorToml(content)` | Parse effector.toml → `EffectorDef` |
| `parseSkillFile(content, filePath?)` | Parse SKILL.md → `ParsedSkill` |
| `checkTypeCompatibility(out, in)` | Check type compatibility → `TypeCheckResult` |
| `isTypeCompatible(out, in)` | Graph adapter → `{ precision }` or `null` |
| `isKnownType(name)` | Check if type exists in catalog |
| `validateManifest(def)` | Validate manifest → `{ valid, errors, warnings }` |
| `compile(def, target)` | Compile to runtime target → string |
| `registerTarget(name, fn)` | Register a custom compile target |
| `EffectorError` | Structured error with `code`, `context`, `suggestion` |

### Subpath Imports

| Path | Exports |
|------|---------|
| `@effectorhq/core/toml` | `parseEffectorToml`, `loadRegistryAsMap`, `loadRegistryAsArray` |
| `@effectorhq/core/skill` | `parseSkillFile`, `parseYaml`, `extractMetadata` |
| `@effectorhq/core/types` | `checkTypeCompatibility`, `isTypeCompatible`, `isKnownType`, `resolveAlias`, `getSupertypes`, `getSubtypes`, `setCatalog` |
| `@effectorhq/core/schema` | `validateManifest`, `validateTypeNames` |
| `@effectorhq/core/compile` | `compile`, `listTargets`, `registerTarget`, `unregisterTarget` |
| `@effectorhq/core/errors` | `EffectorError`, error code constants |

---

## Type System

36 standard types across three roles, grounded in real-world usage from 13,000+ analyzed tools:

| Role | Types | Examples |
|------|-------|----------|
| **Input** (15) | What tools accept | `String`, `CodeDiff`, `URL`, `JSON`, `ImageRef` |
| **Output** (14) | What tools return | `Markdown`, `ReviewReport`, `TestResult`, `LintReport` |
| **Context** (11) | What tools need | `GitHubCredentials`, `Repository`, `Docker`, `Kubernetes` |

### Compatibility Rules

```
1. Exact match           → precision 1.0
2. Alias resolution      → precision 0.95  (PlainText → String)
3. Subtype relation      → precision 0.9   (SecurityReport → ReviewReport)
4. Wildcard matching     → precision 0.8   (*Report matches ReviewReport)
5. Structural subtyping  → precision varies
6. Otherwise             → incompatible
```

---

## Compile Targets

| Target | Format | Description |
|--------|--------|-------------|
| `mcp` | JSON | MCP tool schema (JSON-RPC 2.0) |
| `openai-agents` | JSON | OpenAI Agents FunctionTool definition |
| `langchain` | Python | LangChain StructuredTool class |
| `json` | JSON | Raw Effector IR (passthrough) |

### Custom Targets

```js
import { registerTarget, compile } from '@effectorhq/core';

registerTarget('crewai', (def) => {
  return JSON.stringify({
    name: def.name,
    description: def.description,
    expected_output: `A ${def.interface?.output} from ${def.interface?.input}`,
  }, null, 2);
}, { description: 'CrewAI agent tool', format: 'json' });

compile(myDef, 'crewai'); // works!
```

---

## CLI

```
@effectorhq/core v1.0.0

USAGE
  effector-core <command> [dir] [options]

COMMANDS
  validate [dir]           Parse and validate effector.toml + SKILL.md
  compile  [dir] -t <tgt>  Compile to a runtime target
  check-types [dir]        Validate types against the 36-type catalog
  types                    List all standard types
  init                     Scaffold effector.toml + SKILL.md

OPTIONS
  -t, --target <target>    Compile target: mcp, openai-agents, langchain, json
  -h, --help               Show help
  -v, --version            Show version
```

---

## Zero Dependencies

This package uses only Node.js built-ins (`fs`, `path`, `url`, `util`). Every parser, validator, and compiler is implemented from scratch in ~1200 lines of code.

Why?
- **No supply chain risk** — nothing to audit
- **Fast installs** — no dependency tree
- **No version conflicts** — works everywhere Node 18+ runs
- **Small footprint** — the entire package is under 50KB

---

## TypeScript

Full TypeScript support via handwritten `.d.ts` declarations:

```ts
import { Effector } from '@effectorhq/core';
import type { EffectorDef, TypeCheckResult, CompileTarget } from '@effectorhq/core';

const e: Effector = Effector.fromDir('./my-skill');
const result: TypeCheckResult = checkTypeCompatibility('CodeDiff', 'CodeDiff');
```

All subpath imports have proper type declarations.

---

## Examples

See the [`examples/`](./examples) directory:

- **[basic-validate](./examples/basic-validate)** — Parse and validate an effector.toml
- **[compile-mcp](./examples/compile-mcp)** — Compile a skill to MCP + OpenAI formats
- **[type-checking](./examples/type-checking)** — Check type compatibility between tools
- **[custom-target](./examples/custom-target)** — Register a custom CrewAI compile target

---

## Architecture

```
                     ┌─────────────────────┐
                     │     Effector API     │  ← Fluent builder
                     └──────────┬──────────┘
                                │
        ┌───────────┬───────────┼───────────┬────────────┐
        │           │           │           │            │
   ┌────▼───┐  ┌────▼───┐  ┌───▼────┐  ┌───▼────┐  ┌───▼────┐
   │  TOML  │  │ SKILL  │  │ Types  │  │ Schema │  │Compile │
   │ Parser │  │ Parser │  │Checker │  │  Valid  │  │Targets │
   └────────┘  └────────┘  └───┬────┘  └────────┘  └────────┘
                               │
                    ┌──────────▼──────────┐
                    │  types-catalog.json  │  ← 36 bundled types
                    └─────────────────────┘
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[MIT](./LICENSE) — effectorHQ Contributors
