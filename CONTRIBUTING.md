# Contributing to @effectorhq/core

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/effectorHQ/effector-core.git
cd effector-core
npm test  # 100+ tests, zero dependencies
```

## Guidelines

- **Zero dependencies.** All code uses only Node.js built-ins. No exceptions.
- **ES Modules only.** All files use `import`/`export`.
- **Node 18+.** We use `parseArgs`, `import.meta.url`, etc.
- **Tests required.** Every new function needs tests. Run `node --test tests/*.test.js`.
- **TypeScript declarations.** Update the corresponding `.d.ts` when changing a function signature.

## Project Structure

```
src/
  index.js              Barrel export
  toml-parser.js        effector.toml parser (section-aware)
  skill-parser.js       SKILL.md parser (YAML + Markdown)
  type-checker.js       Type compatibility engine (36 bundled types)
  schema-validator.js   Manifest validation
  compiler-targets.js   Cross-runtime compiler (MCP, OpenAI, LangChain, JSON)
  effector.js           Fluent builder API
  errors.js             Structured error types
  cli.js                CLI binary
  types-catalog.json    Bundled 36-type catalog
  *.d.ts                TypeScript declarations
```

## Adding a New Compile Target

Use the plugin system instead of modifying the built-in switch:

```js
import { registerTarget } from '@effectorhq/core';

registerTarget('my-runtime', (def) => {
  return JSON.stringify({ name: def.name, ... });
}, { description: 'My runtime format', format: 'json' });
```

If you believe a target should be built-in, open an issue first.

## Pull Request Process

1. Fork and create a branch
2. Write code + tests
3. Run `npm test` — all tests must pass
4. Run `npm run lint` — all files must parse
5. Submit PR with a clear description

## Code Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- JSDoc for all exported functions
- Descriptive variable names
