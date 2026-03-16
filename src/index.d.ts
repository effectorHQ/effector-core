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
