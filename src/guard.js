/**
 * @module @effectorhq/core/guard
 *
 * Runtime type guards for AI agent tool I/O.
 *
 * The missing "verifiable" layer — validates that actual data flowing through
 * tool calls matches the declared Effector types at RUNTIME, not just lint time.
 *
 * Usage:
 *   import { createGuard, guardCall } from '@effectorhq/core/guard';
 *
 *   // Option 1: Create a reusable guard
 *   const guard = createGuard({ input: 'CodeDiff', output: 'ReviewReport' });
 *   guard.validateInput({ diff: '...', filePath: 'src/foo.js' });  // ✅ or throws
 *   guard.validateOutput({ title: '...', comments: [] });           // ✅ or throws
 *
 *   // Option 2: Wrap a tool function
 *   const safeTool = guardCall(myToolFn, {
 *     input: 'CodeDiff',
 *     output: 'ReviewReport',
 *   });
 *   const result = await safeTool({ diff: '...' }); // validates I/O automatically
 *
 *   // Option 3: MCP middleware
 *   const handler = guardMCP(originalHandler, effectorDef);
 *   // Validates every tools/call request and response
 *
 * Zero dependencies. Uses the bundled 40-type catalog.
 */

import { readFileSync } from 'node:fs';
import { EffectorError, VALIDATION_ERROR } from './errors.js';

// ─── Catalog Loading (shared with type-checker) ─────────────

let _catalog = null;

function loadCatalog() {
  if (_catalog) return _catalog;
  try {
    const catalogPath = new URL('./types-catalog.json', import.meta.url);
    _catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch { /* graceful fallback */ }
  return _catalog;
}

function findTypeDef(typeName) {
  const catalog = loadCatalog();
  if (!catalog) return null;
  for (const role of ['input', 'output', 'context']) {
    if (catalog.types[role][typeName]) return catalog.types[role][typeName];
    // Check aliases
    for (const [canonical, def] of Object.entries(catalog.types[role])) {
      if (def.aliases?.includes(typeName)) return def;
    }
  }
  return null;
}

// ─── Core Validation ────────────────────────────────────────

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors - Human-readable error messages
 * @property {string[]} warnings
 * @property {Object} metadata - { typeName, requiredFields, presentFields, missingFields }
 */

/**
 * Validate a data object against a declared Effector type.
 *
 * Checks that all required fields from the type catalog are present.
 * Does NOT check field value types (that's a future layer).
 *
 * @param {Object} data - The actual data to validate
 * @param {string} typeName - The declared Effector type name
 * @param {Object} [options] - { strict: boolean, allowExtra: boolean }
 * @returns {ValidationResult}
 */
export function validateAgainstType(data, typeName, options = {}) {
  const { strict = false, allowExtra = true } = options;
  const errors = [];
  const warnings = [];

  // Null/undefined check
  if (data == null) {
    return {
      valid: false,
      errors: [`Expected ${typeName} but received ${data}`],
      warnings: [],
      metadata: { typeName, requiredFields: [], presentFields: [], missingFields: [] },
    };
  }

  // Non-object check (allow strings for String type, etc.)
  if (typeof data !== 'object') {
    const primitiveTypes = ['String', 'Number', 'Boolean', 'JSON'];
    if (primitiveTypes.some(p => typeName === p || typeName.includes(p))) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        metadata: { typeName, requiredFields: [], presentFields: [], missingFields: [] },
      };
    }
    return {
      valid: false,
      errors: [`Expected object for ${typeName} but received ${typeof data}`],
      warnings: [],
      metadata: { typeName, requiredFields: [], presentFields: [], missingFields: [] },
    };
  }

  const typeDef = findTypeDef(typeName);
  const presentFields = Object.keys(data);

  if (!typeDef) {
    // Unknown type — can only do structural presence check
    warnings.push(`Type "${typeName}" not in catalog — cannot validate fields`);
    return {
      valid: true,
      errors: [],
      warnings,
      metadata: { typeName, requiredFields: [], presentFields, missingFields: [] },
    };
  }

  const requiredFields = typeDef.fields?.required || [];
  const optionalFields = typeDef.fields?.optional || [];
  const allKnownFields = [...requiredFields, ...optionalFields];
  const missingFields = requiredFields.filter(f => !(f in data));
  const extraFields = presentFields.filter(f => !allKnownFields.includes(f));

  // Required field check
  if (missingFields.length > 0) {
    errors.push(
      `${typeName}: missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`
    );
  }

  // Strict mode: extra fields are errors
  if (!allowExtra && extraFields.length > 0) {
    if (strict) {
      errors.push(`${typeName}: unexpected field${extraFields.length > 1 ? 's' : ''}: ${extraFields.join(', ')}`);
    } else {
      warnings.push(`${typeName}: extra field${extraFields.length > 1 ? 's' : ''}: ${extraFields.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: { typeName, requiredFields, presentFields, missingFields },
  };
}

// ─── Guard Factory ──────────────────────────────────────────

/**
 * Create a reusable type guard for a specific interface declaration.
 *
 * @param {Object} iface - { input: string, output: string, context?: string[] }
 * @param {Object} [options] - { strict: boolean, onError: 'throw'|'log'|'return' }
 * @returns {{ validateInput, validateOutput, validateContext, wrap }}
 */
export function createGuard(iface, options = {}) {
  const { onError = 'throw' } = options;

  function handleResult(result, direction) {
    if (!result.valid) {
      const msg = `[guard:${direction}] ${result.errors.join('; ')}`;
      if (onError === 'throw') {
        throw new EffectorError(VALIDATION_ERROR, {
          direction,
          typeName: result.metadata.typeName,
          missingFields: result.metadata.missingFields,
        }, msg);
      }
      if (onError === 'log') {
        console.error(`⚠ effector guard: ${msg}`);
      }
    }
    return result;
  }

  return {
    /** Validate input data against the declared input type */
    validateInput(data) {
      if (!iface.input) return { valid: true, errors: [], warnings: [], metadata: {} };
      return handleResult(validateAgainstType(data, iface.input, options), 'input');
    },

    /** Validate output data against the declared output type */
    validateOutput(data) {
      if (!iface.output) return { valid: true, errors: [], warnings: [], metadata: {} };
      return handleResult(validateAgainstType(data, iface.output, options), 'output');
    },

    /** Validate context availability */
    validateContext(contextMap) {
      if (!iface.context || iface.context.length === 0) {
        return { valid: true, errors: [], warnings: [], metadata: {} };
      }
      const missing = iface.context.filter(c => !(c in (contextMap || {})));
      const result = {
        valid: missing.length === 0,
        errors: missing.map(c => `Missing required context: ${c}`),
        warnings: [],
        metadata: { required: iface.context, missing },
      };
      return handleResult(result, 'context');
    },

    /** Wrap a function with automatic I/O validation */
    wrap(fn) {
      return async (...args) => {
        // Validate input (first argument)
        if (iface.input && args[0] != null) {
          this.validateInput(args[0]);
        }
        // Execute
        const result = await fn(...args);
        // Validate output
        if (iface.output && result != null) {
          this.validateOutput(result);
        }
        return result;
      };
    },
  };
}

// ─── Convenience: Wrap a Tool Function ──────────────────────

/**
 * Wrap any async tool function with runtime type validation.
 *
 * @param {Function} fn - The tool function to wrap
 * @param {Object} iface - { input: string, output: string }
 * @param {Object} [options] - Guard options
 * @returns {Function} The guarded function
 *
 * @example
 * const safeReview = guardCall(reviewCode, { input: 'CodeDiff', output: 'ReviewReport' });
 * const result = await safeReview({ diff: '...', filePath: 'src/foo.js' });
 */
export function guardCall(fn, iface, options = {}) {
  const guard = createGuard(iface, options);
  return guard.wrap(fn);
}

// ─── MCP Middleware ─────────────────────────────────────────

/**
 * Create MCP middleware that validates tools/call requests and responses.
 *
 * @param {Function} handler - Original MCP request handler (req → response)
 * @param {Object} effectorDef - Parsed effector definition with .interface
 * @param {Object} [options] - Guard options
 * @returns {Function} Guarded handler
 *
 * @example
 * const guarded = guardMCP(handler, parsedDef);
 * // In your MCP server:
 * server.setRequestHandler(CallToolRequestSchema, guarded);
 */
export function guardMCP(handler, effectorDef, options = {}) {
  const iface = effectorDef.interface || {};
  const guard = createGuard(iface, options);

  return async (request) => {
    // Validate input arguments
    if (request.params?.arguments) {
      guard.validateInput(request.params.arguments);
    }

    // Execute original handler
    const response = await handler(request);

    // Validate output (MCP tools return content array, check first text content)
    if (response?.content) {
      for (const item of response.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);
            guard.validateOutput(parsed);
          } catch (e) {
            if (e instanceof EffectorError) throw e;
            // Not JSON — skip validation for plain text responses
          }
        }
      }
    }

    return response;
  };
}
