# @effectorhq/core

[![Status: Alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Shared kernel for the effector ecosystem.**

---

## Why

Before `@effectorhq/core`, every tool in the ecosystem had its own copy of:
- TOML parser (4 copies)
- SKILL.md parser (3 variants)
- Type checker (2 implementations)

This package consolidates them into one canonical implementation that all tools import.

## Modules

### `@effectorhq/core/toml` — effector.toml Parser

```js
import { parseEffectorToml, loadRegistryAsMap } from '@effectorhq/core/toml';

const def = parseEffectorToml(tomlContent);
// { name, version, type, description, interface: { input, output, context }, permissions }

const registry = loadRegistryAsMap('./skills/');
// Map<name, EffectorDef>
```

### `@effectorhq/core/skill` — SKILL.md Parser

```js
import { parseSkillFile } from '@effectorhq/core/skill';

const result = parseSkillFile(skillMdContent);
// { frontmatter, body, parsed, valid, error }
```

### `@effectorhq/core/types` — Type Checker

```js
import { checkTypeCompatibility, isTypeCompatible } from '@effectorhq/core/types';

// Full result (for validation)
checkTypeCompatibility('SecurityReport', 'ReviewReport');
// { compatible: true, precision: 0.9, reason: 'subtype-match' }

// Graph adapter (for edge weighting)
isTypeCompatible('SecurityReport', 'ReviewReport');
// { precision: 0.9 }
```

### `@effectorhq/core/schema` — Manifest Validator

```js
import { validateManifest } from '@effectorhq/core/schema';

const { valid, errors, warnings } = validateManifest(effectorDef);
```

## Consumers

| Package | What it imports |
|---------|----------------|
| effector-compose | `toml`, `types` |
| effector-graph | `toml`, `types` |
| skill-lint | `skill` |
| skill-eval | `skill` (planned) |
| openclaw-mcp | `skill` (planned) |

## License

[MIT](./LICENSE)

---

<sub>Part of <a href="https://github.com/effectorHQ">effectorHQ</a>. Tier 1 — Product Core.</sub>
