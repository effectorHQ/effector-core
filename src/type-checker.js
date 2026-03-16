/**
 * @module @effectorhq/core/types
 *
 * Canonical type checker with bundled types catalog (36 standard types).
 * Replaces duplicated checkers in effector-compose and effector-graph.
 *
 * Returns a unified TypeCheckResult with both boolean compatibility
 * and a precision score (for graph edge weighting).
 *
 * Compatibility rules (in order):
 *  1. Exact match          → precision 1.0
 *  2. Alias resolution     → precision 0.95
 *  3. Subtype relation     → precision 0.9
 *  4. Wildcard matching    → precision 0.8
 *  5. Structural subtyping → precision = matched/total fields
 *  6. Otherwise            → incompatible (null precision)
 *
 * Zero dependencies. Falls back to naive comparison if types.json is unavailable.
 */

import { readFileSync } from 'node:fs';

// ─── Catalog Loading ─────────────────────────────────────────

let _catalog = null;
let _catalogSearched = false;

/**
 * Load the bundled types catalog (36 standard types across input/output/context).
 * The catalog is shipped with the package — no filesystem search needed.
 * Caches the result. Use setCatalog() to override.
 *
 * @returns {Object|null} The parsed types catalog, or null
 */
function loadCatalog() {
  if (_catalogSearched) return _catalog;
  _catalogSearched = true;

  try {
    const catalogPath = new URL('./types-catalog.json', import.meta.url);
    _catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch { /* falls back to naive comparison */ }

  return _catalog;
}

/**
 * Inject a catalog directly (for testing or when types.json path is known).
 * @param {Object} catalog - A parsed types.json object
 */
export function setCatalog(catalog) {
  _catalog = catalog;
  _catalogSearched = true;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Resolve a type name alias to its canonical form.
 */
export function resolveAlias(name, catalog) {
  if (!catalog) return name;
  for (const role of ['input', 'output', 'context']) {
    if (name in catalog.types[role]) return name;
    for (const [canonical, def] of Object.entries(catalog.types[role])) {
      if (def.aliases?.includes(name)) return canonical;
    }
  }
  return name;
}

/**
 * Get all supertypes of a type.
 */
export function getSupertypes(name, catalog) {
  if (!catalog) return [];
  return catalog.subtypeRelations
    .filter(r => r.subtype === name)
    .map(r => r.supertype);
}

/**
 * Get all subtypes of a type.
 */
export function getSubtypes(name, catalog) {
  if (!catalog) return [];
  return catalog.subtypeRelations
    .filter(r => r.supertype === name)
    .map(r => r.subtype);
}

/**
 * Check if a type name exists in the catalog.
 */
export function isKnownType(name) {
  const catalog = loadCatalog();
  if (!catalog) return false;
  for (const role of ['input', 'output', 'context']) {
    if (name in catalog.types[role]) return true;
    for (const def of Object.values(catalog.types[role])) {
      if (def.aliases?.includes(name)) return true;
    }
  }
  return false;
}

// ─── Main Type Checker ───────────────────────────────────────

/**
 * @typedef {Object} TypeCheckResult
 * @property {boolean} compatible - Whether the types are compatible
 * @property {number|null} precision - Compatibility precision (1.0 = exact, null = incompatible)
 * @property {string} outputType - The output type (display name)
 * @property {string} inputType - The input type (display name)
 * @property {string} reason - Why they are/aren't compatible
 */

/**
 * Check if an output type is compatible with an input type.
 *
 * Works with both string type names and object shapes.
 * Uses the types.json catalog for alias resolution and subtype relations.
 *
 * @param {string|Object|null} outputType
 * @param {string|Object|null} inputType
 * @returns {TypeCheckResult}
 */
export function checkTypeCompatibility(outputType, inputType) {
  if (!outputType || !inputType) {
    return {
      compatible: true,
      precision: null,
      outputType: outputType || 'unknown',
      inputType: inputType || 'unknown',
      reason: 'missing-type',
    };
  }

  // String-based name checking
  if (typeof outputType === 'string' && typeof inputType === 'string') {
    // 1. Exact match
    if (outputType === inputType) {
      return { compatible: true, precision: 1.0, outputType, inputType, reason: 'exact-match' };
    }

    const catalog = loadCatalog();

    if (catalog) {
      // 2. Alias resolution
      const outCanonical = resolveAlias(outputType, catalog);
      const inCanonical = resolveAlias(inputType, catalog);
      if (outCanonical === inCanonical) {
        return { compatible: true, precision: 0.95, outputType, inputType, reason: 'alias-match' };
      }

      // 3. Subtype relation
      const supertypes = getSupertypes(outCanonical, catalog);
      if (supertypes.includes(inCanonical)) {
        return { compatible: true, precision: 0.9, outputType, inputType, reason: 'subtype-match' };
      }
    }

    // 4. Wildcard matching
    if (inputType.includes('*')) {
      const pattern = inputType.replace('*', '');
      if (outputType.includes(pattern)) {
        return { compatible: true, precision: 0.8, outputType, inputType, reason: 'wildcard-match' };
      }
    }

    // Incompatible
    return { compatible: false, precision: null, outputType, inputType, reason: 'incompatible' };
  }

  // Object-based structural comparison
  if (typeof outputType === 'object' && typeof inputType === 'object') {
    const inputKeys = Object.keys(inputType);
    const outputKeys = Object.keys(outputType);
    const matchedKeys = inputKeys.filter(k => outputKeys.includes(k));

    if (matchedKeys.length === inputKeys.length) {
      const precision = matchedKeys.length / Math.max(outputKeys.length, 1);
      return {
        compatible: true,
        precision,
        outputType: JSON.stringify(outputType),
        inputType: JSON.stringify(inputType),
        reason: 'structural-match',
      };
    }
    return {
      compatible: false,
      precision: null,
      outputType: JSON.stringify(outputType),
      inputType: JSON.stringify(inputType),
      reason: 'structural-mismatch',
    };
  }

  // Mixed types
  return {
    compatible: false,
    precision: null,
    outputType: String(outputType),
    inputType: String(inputType),
    reason: 'type-kind-mismatch',
  };
}

/**
 * Convenience: check compatibility returning only { precision } | null.
 * For graph edge creation (drop-in replacement for effector-graph's isTypeCompatible).
 *
 * @param {string|Object} outputType
 * @param {string|Object} inputType
 * @returns {{ precision: number } | null}
 */
export function isTypeCompatible(outputType, inputType) {
  const result = checkTypeCompatibility(outputType, inputType);
  if (result.compatible && result.precision !== null) {
    return { precision: result.precision };
  }
  return result.compatible ? { precision: 0.5 } : null;
}
