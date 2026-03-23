# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · [Semantic Versioning](https://semver.org/)

---

## [1.0.0] — 2026-03-19

First public npm release. `@effectorhq/core` is now a fully self-contained, zero-dependency package.

### Added

**Bundled type catalog**
- `src/types-catalog.json` — 40 standard types bundled into the package
- Type checker loads the catalog via `import.meta.url` — fixes npm install breakage caused by sibling directory search

**TypeScript declarations**
- `src/toml-parser.d.ts` — `EffectorDef`, `EffectorInterface`, `EffectorPermissions`
- `src/skill-parser.d.ts` — `ParsedSkill`, `SkillMetadata`
- `src/type-checker.d.ts` — `TypeCheckResult`, `TypesCatalog`, `SubtypeRelation`
- `src/schema-validator.d.ts` — `ValidationResult`, `TypeValidationResult`
- `src/compiler-targets.d.ts` — `CompileTarget` union, `CompileFn`
- `src/effector.d.ts` — `Effector` class
- `src/errors.d.ts` — `EffectorError` class
- `src/index.d.ts` — barrel re-export of all types
- Subpath exports with `{ "types": ..., "default": ... }` for 7 subpaths; `"types"` field in `package.json`

**Structured error system** (`src/errors.js`)
- `EffectorError extends Error` with `.code`, `.context`, `.suggestion` properties
- 7 error codes: `EFFECTOR_TOML_PARSE_ERROR`, `EFFECTOR_SKILL_PARSE_ERROR`, `EFFECTOR_TYPE_UNKNOWN`, `EFFECTOR_TYPE_INCOMPATIBLE`, `EFFECTOR_VALIDATION_ERROR`, `EFFECTOR_COMPILE_TARGET_UNKNOWN`, `EFFECTOR_FILE_NOT_FOUND`

**Fluent builder API** (`src/effector.js`)
- `Effector.fromDir(path)` — reads `effector.toml` + `SKILL.md` from a directory
- `Effector.fromToml(content)` — parses raw TOML string
- `Effector.fromSkill(content)` — parses raw SKILL.md string
- `.validate()`, `.checkTypes(catalog?)`, `.compile(target)` — fully chainable
- `.toJSON()`, `.def`, `.skill`, `.errors`, `.warnings`, `.valid` — getters

**Plugin system for compile targets**
- `registerTarget(name, compileFn, options?)` — register custom compile targets at runtime
- `unregisterTarget(name)` — remove a registered target
- `listTargets()` — returns built-in + all registered custom targets

**CLI** (`src/cli.js`, registered as `npx @effectorhq/core`)
- Commands: `validate [dir]`, `compile [dir] -t <target>`, `check-types [dir]`, `types`, `init`
- ANSI colored output with `NO_COLOR` support
- Exit codes: `0` = clean, `1` = validation errors, `2` = usage error

**End-to-end examples**
- `examples/compile-to-mcp/` — compile to MCP JSON-RPC tool schema
- `examples/compile-to-openai-agents/` — compile to OpenAI Agents `FunctionTool`
- `examples/compile-to-langchain/` — compile to LangChain `StructuredTool`
- `examples/compile-to-json/` — compile to raw Effector IR
- `examples/basic-validate/`, `examples/type-checking/`, `examples/custom-target/`

**Package infrastructure**
- `CONTRIBUTING.md`
- `scripts/sync-types.js` — dev utility to sync upstream types catalog
- `"bin": { "effector-core": "./src/cli.js" }`

**Tests** — 102 total (up from 69)
- `tests/bundled-catalog.test.js` (7) — catalog loads, 40 types present, alias resolution, subtype relations, `setCatalog()` override
- `tests/cli.test.js` (7) — `--version`, `--help`, `types`, `validate`, exit codes
- `tests/custom-targets.test.js` (6) — register, compile, unregister, precedence, unknown-target error
- `tests/effector.test.js` (12) — `fromToml`, `fromSkill`, `validate`, `checkTypes`, `compile`, chain

### Changed
- `compile()` for unknown target now throws `EffectorError` instead of plain `Error`
- Type checker `loadCatalog()` uses `import.meta.url` (self-contained) instead of 3-path sibling filesystem search
- `engines.node` standardized to `>=18.0.0`
- All cross-repo `../../effector-core/src/` relative imports replaced with `@effectorhq/core/` package specifiers in consumer repos

### Fixed
- Self-referencing relative path bug in `tests/conformance.test.js`
- `compiler-targets.test.js` unknown-target assertion updated to check `EffectorError.code` instead of message string

---

## [0.5.0] — 2026-03-14

Phase E: Robustness and ecosystem readiness.

### Added
- Section-aware TOML parsing — fields correctly scoped to their `[section]` (eliminates cross-section bleed)
- YAML type coercion in skill parser — numbers, booleans, `null` parsed correctly instead of as strings
- Integration test suite (7 tests) covering the full golden path end-to-end
- CI/CD GitHub Actions workflows for all 9 Tier 1/2 repos
- `prepublishOnly` scripts and `files` fields in all consumer package.json

### Fixed
- `node --test` glob pattern: `tests/` → `tests/*.test.js` in 3 repos
- Zero duplicate parsers remaining (3 in-repo duplicates eliminated)

---

## [0.4.0] — 2026-03-12

Phase D: Standards hardening and release preparation.

### Added
- Apache 2.0 LICENSE
- `.gitignore`
- `funding` field in `package.json`

### Changed
- Consumer repos migrated from `file:../effector-core` to `"@effectorhq/core": "file:../effector-core"` with proper package specifier imports
- `@effectorhq/core` dependency added to `effector-compose`, `effector-graph`, `openclaw-mcp`, `skill-lint`, `skill-eval`, `effector-audit`

---

## [0.3.0] — 2026-03-10

Phase C: Cross-runtime compiler and golden path.

### Added
- `compile(def, target)` with 4 built-in targets: `mcp`, `openai-agents`, `langchain`, `json`
- `listTargets()` — returns available compile targets with metadata
- 16 compiler tests

---

## [0.2.0] — 2026-03-07

Phase B: Shared kernel consolidation.

### Added
- Barrel `src/index.js` — unified export surface: `parseEffectorToml`, `parseSkillFile`, `validateManifest`, `checkTypeCompatibility`, `compile`, `isKnownType`, `setCatalog`
- Schema validator connected to `effector-spec` JSON schema
- 6 consumer repos migrated to import from `@effectorhq/core`

---

## [0.1.0] — 2026-03-05

Phase A: Core IR, schema, type registry.

### Added
- `src/toml-parser.js` — section-aware TOML parser, zero dependencies
- `src/skill-parser.js` — SKILL.md YAML frontmatter parser; handles inline `[]` arrays, `-` lists, nested objects
- `src/schema-validator.js` — JSON Schema validator for `effector.toml`
- `src/type-checker.js` — `checkTypeCompatibility()`, `isKnownType()`, `setCatalog()`
- 69 initial tests
