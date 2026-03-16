/**
 * @effectorhq/core — Shared kernel for the effector ecosystem.
 *
 * Re-exports all modules for convenient single-import usage:
 *   import { parseEffectorToml, parseSkillFile, checkTypeCompatibility } from '@effectorhq/core';
 *
 * Or import individual modules for tree-shaking:
 *   import { parseEffectorToml } from '@effectorhq/core/toml';
 *   import { parseSkillFile } from '@effectorhq/core/skill';
 *   import { checkTypeCompatibility } from '@effectorhq/core/types';
 *   import { validateManifest } from '@effectorhq/core/schema';
 */

// TOML parser
export {
  parseEffectorToml,
  loadRegistryAsMap,
  loadRegistryAsArray,
} from './toml-parser.js';

// SKILL.md parser
export {
  parseSkillFile,
  parseYaml,
  extractMetadata,
} from './skill-parser.js';

// Type checker
export {
  checkTypeCompatibility,
  isTypeCompatible,
  isKnownType,
  resolveAlias,
  getSupertypes,
  getSubtypes,
  setCatalog,
} from './type-checker.js';

// Schema validator
export {
  validateManifest,
  validateTypeNames,
} from './schema-validator.js';

// Compiler targets
export {
  compile,
  listTargets,
  registerTarget,
  unregisterTarget,
} from './compiler-targets.js';

// Fluent API
export { Effector } from './effector.js';

// Errors
export {
  EffectorError,
  TOML_PARSE_ERROR,
  SKILL_PARSE_ERROR,
  TYPE_UNKNOWN,
  TYPE_INCOMPATIBLE,
  VALIDATION_ERROR,
  COMPILE_TARGET_UNKNOWN,
  FILE_NOT_FOUND,
} from './errors.js';
