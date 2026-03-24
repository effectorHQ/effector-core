// Re-export all types and functions from submodules

export type {
  EffectorDef,
  EffectorInterface,
  EffectorPermissions,
} from './toml-parser.js';

export type {
  ParsedSkill,
  SkillMetadata,
} from './skill-parser.js';

export type {
  TypeCheckResult,
  TypesCatalog,
  TypeDefinition,
  SubtypeRelation,
} from './type-checker.js';

export type {
  ValidationResult,
  TypeValidationResult,
} from './schema-validator.js';

export type {
  CompileTarget,
  TargetInfo,
  CompileFn,
} from './compiler-targets.js';

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

// Runtime type guards
export type {
  ValidationResult as GuardValidationResult,
  GuardOptions,
  EffectorInterface as GuardInterface,
  Guard,
} from './guard.js';

export {
  validateAgainstType,
  createGuard,
  guardCall,
  guardMCP,
} from './guard.js';

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
  PERMISSION_DENIED,
  DISCOVERY_NO_MATCH,
} from './errors.js';
