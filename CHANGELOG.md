# Changelog

## v1.0.0 — 2026-03-19

First stable release. `@effectorhq/core` is the shared kernel for the effectorHQ ecosystem.

### Added
- **TOML parser** — `parseEffectorToml()` reads `effector.toml` with object-based permissions model
- **SKILL.md parser** — `parseSkillFile()` splits YAML frontmatter from markdown body
- **Schema validator** — `validateManifest()` validates against effector-spec
- **Type checker** — `checkTypeCompatibility()` with 36 standard types, alias resolution, structural subtyping
- **Cross-runtime compiler** — `compile(def, target)` with 4 targets:
  - `mcp` — MCP tool schema (JSON-RPC 2.0), ready for Claude / Cursor / Windsurf
  - `openai-agents` — OpenAI Agents `FunctionTool` definition
  - `langchain` — LangChain `StructuredTool` Python class
  - `json` — Raw Effector IR for custom pipelines
- **Custom compile targets** — `registerTarget(name, fn)` for extending to any runtime
- **Fluent API** — `Effector.fromDir(path).validate().compile('mcp')`
- **CLI** — `npx @effectorhq/core validate/compile/types/init`
- **End-to-end examples** — `examples/compile-to-{mcp,openai-agents,langchain,json}/`
- **Zero dependencies** — only Node.js built-ins; works everywhere Node ≥ 18 runs
- MIT LICENSE, `.gitignore`, `bugs.url`

### Changed
- Standardized `engines.node` to `>=18`

### Fixed
- Self-referencing relative path in `conformance.test.js`
