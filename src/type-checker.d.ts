/**
 * Result of a type compatibility check.
 */
export interface TypeCheckResult {
  /** Whether the types are compatible */
  compatible: boolean;
  /** Compatibility precision: 1.0 (exact) → 0.8 (wildcard) → null (incompatible) */
  precision: number | null;
  /** The output type (display name) */
  outputType: string;
  /** The input type (display name) */
  inputType: string;
  /** Reason for the result */
  reason:
    | 'exact-match'
    | 'alias-match'
    | 'subtype-match'
    | 'wildcard-match'
    | 'structural-match'
    | 'incompatible'
    | 'structural-mismatch'
    | 'type-kind-mismatch'
    | 'missing-type';
}

/**
 * Shape of the types.json catalog.
 */
export interface TypesCatalog {
  types: {
    input: Record<string, TypeDefinition>;
    output: Record<string, TypeDefinition>;
    context: Record<string, TypeDefinition>;
  };
  subtypeRelations: SubtypeRelation[];
}

export interface TypeDefinition {
  description?: string;
  category?: string;
  fields?: {
    required?: string[];
    optional?: string[];
  };
  aliases?: string[];
  frequency?: string;
  subtypeOf?: string;
}

export interface SubtypeRelation {
  subtype: string;
  supertype: string;
  reason?: string;
}

/**
 * Check if an output type is compatible with an input type.
 * Works with both string type names and object shapes.
 */
export function checkTypeCompatibility(
  outputType: string | Record<string, unknown> | null,
  inputType: string | Record<string, unknown> | null
): TypeCheckResult;

/**
 * Check compatibility returning { precision } or null.
 * Designed as a drop-in for graph edge creation.
 */
export function isTypeCompatible(
  outputType: string | Record<string, unknown>,
  inputType: string | Record<string, unknown>
): { precision: number } | null;

/**
 * Check if a type name exists in the catalog (including aliases).
 */
export function isKnownType(name: string): boolean;

/**
 * Resolve a type name alias to its canonical form.
 */
export function resolveAlias(name: string, catalog: TypesCatalog): string;

/**
 * Get all supertypes of a type.
 */
export function getSupertypes(name: string, catalog: TypesCatalog): string[];

/**
 * Get all subtypes of a type.
 */
export function getSubtypes(name: string, catalog: TypesCatalog): string[];

/**
 * Inject a catalog directly (for testing or when types.json path is known).
 */
export function setCatalog(catalog: TypesCatalog | null): void;
