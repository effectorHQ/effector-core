/**
 * @module @effectorhq/core/schema
 *
 * Manifest validation against the Effector spec.
 * Consolidates validate-manifest.js logic into a reusable library.
 *
 * Zero dependencies.
 */

const VALID_TYPES = ['skill', 'extension', 'workflow', 'workspace', 'bridge', 'prompt'];
const NAME_PATTERN = /^(@[a-z0-9-]+\/)?[a-z0-9-]{2,64}$/;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.]+)?(?:\+[\w.]+)?$/;

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - No errors found
 * @property {string[]} errors - Blocking validation errors
 * @property {string[]} warnings - Non-blocking warnings
 */

/**
 * Validate an EffectorDef against the spec's schema rules.
 *
 * @param {import('./toml-parser.js').EffectorDef} manifest
 * @returns {ValidationResult}
 */
export function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  // Required fields
  for (const field of ['name', 'version', 'type', 'description']) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Name pattern
  if (manifest.name && !NAME_PATTERN.test(manifest.name)) {
    errors.push(`Invalid name "${manifest.name}": must be kebab-case, 2-64 chars, optional @scope prefix`);
  }

  // Version
  if (manifest.version && !SEMVER_PATTERN.test(manifest.version)) {
    errors.push(`Invalid version "${manifest.version}": must be valid semver`);
  }

  // Type enum
  if (manifest.type && !VALID_TYPES.includes(manifest.type)) {
    errors.push(`Invalid type "${manifest.type}": must be one of ${VALID_TYPES.join(', ')}`);
  }

  // Description length
  if (manifest.description) {
    if (manifest.description.length < 10) {
      errors.push(`Description too short (${manifest.description.length} chars): minimum 10`);
    }
    if (manifest.description.length > 200) {
      errors.push(`Description too long (${manifest.description.length} chars): maximum 200`);
    }
  }

  // Interface recommendation
  if (!manifest.interface?.input && !manifest.interface?.output && manifest.type !== 'workspace') {
    warnings.push('No [effector.interface] declared — recommended for type-checked composition');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate type names in an EffectorDef's interface against a types catalog.
 *
 * @param {import('./toml-parser.js').EffectorDef} manifest
 * @param {Object} typesCatalog - Parsed types.json
 * @returns {{ warnings: string[] }}
 */
export function validateTypeNames(manifest, typesCatalog) {
  const warnings = [];
  if (!manifest.interface) return { warnings };

  const allTypes = new Set();
  for (const role of ['input', 'output', 'context']) {
    if (!typesCatalog.types[role]) continue;
    for (const [name, def] of Object.entries(typesCatalog.types[role])) {
      allTypes.add(name);
      if (def.aliases) {
        for (const alias of def.aliases) allTypes.add(alias);
      }
    }
  }

  if (manifest.interface.input && !allTypes.has(manifest.interface.input)) {
    warnings.push(`Unknown input type "${manifest.interface.input}"`);
  }
  if (manifest.interface.output && !allTypes.has(manifest.interface.output)) {
    warnings.push(`Unknown output type "${manifest.interface.output}"`);
  }
  if (manifest.interface.context) {
    for (const ctx of manifest.interface.context) {
      if (!allTypes.has(ctx)) {
        warnings.push(`Unknown context type "${ctx}"`);
      }
    }
  }

  return { warnings };
}
