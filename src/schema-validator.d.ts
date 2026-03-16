import type { EffectorDef } from './toml-parser.js';
import type { TypesCatalog } from './type-checker.js';

/**
 * Result of manifest validation.
 */
export interface ValidationResult {
  /** Whether the manifest is valid (no errors) */
  valid: boolean;
  /** Blocking errors */
  errors: string[];
  /** Non-blocking warnings */
  warnings: string[];
}

/**
 * Result of type name validation.
 */
export interface TypeValidationResult {
  /** Warnings for unknown type names */
  warnings: string[];
}

/**
 * Validate an effector manifest against the Effector spec.
 * Checks required fields, name pattern, semver, type enum, description length.
 */
export function validateManifest(manifest: EffectorDef): ValidationResult;

/**
 * Validate type names in a manifest against the types catalog.
 */
export function validateTypeNames(
  manifest: EffectorDef,
  typesCatalog: TypesCatalog
): TypeValidationResult;
