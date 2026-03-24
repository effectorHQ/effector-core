/**
 * @module @effectorhq/core/compile
 *
 * Cross-runtime compiler targets.
 * Takes parsed effector.toml + SKILL.md and emits runtime-specific tool definitions.
 *
 * Supported targets:
 *   mcp           → MCP tool schema (JSON-RPC 2.0)
 *   openai-agents → OpenAI Agents FunctionTool definition
 *   langchain     → LangChain StructuredTool Python class
 *   json          → Raw effector IR (passthrough)
 *
 * Custom targets can be registered via registerTarget().
 */

import { EffectorError, COMPILE_TARGET_UNKNOWN } from './errors.js';

// ─── Type Catalog (for interface → inputSchema expansion) ────

let _typeCatalog = null;

/**
 * Set the types catalog for interface field expansion.
 * When set, compile() expands interface.input type fields into
 * inputSchema.properties using the catalog's field definitions.
 *
 * @param {Object} catalog - A parsed types.json object (with .types.input, .types.output, .types.context)
 */
export function setTypeCatalog(catalog) {
  _typeCatalog = catalog;
}

/**
 * Infer a JSON Schema type from a field name.
 * Heuristic mapping based on the standard type catalog's naming conventions.
 * @param {string} fieldName
 * @returns {string}
 */
function inferFieldSchemaType(fieldName) {
  const arrays = new Set([
    'files', 'rows', 'patches', 'messages', 'findings', 'issues',
    'headers', 'vulnerabilities', 'blocks', 'embeds', 'scopes',
    'rules', 'failures', 'keyPoints', 'context', 'variables',
    'passedChecks', 'attachments',
  ]);
  const booleans = new Set([
    'exists', 'success', 'passed', 'failed', 'skipped', 'idempotent',
  ]);
  const numbers = new Set([
    'total', 'score', 'width', 'height', 'duration', 'confidence',
    'frequency', 'number', 'startLine', 'endLine', 'exitCode',
    'errorCount', 'warningCount', 'wordCount', 'tokenCount',
  ]);
  const objects = new Set([
    'data', 'metadata', 'env', 'schema', 'options', 'coverage',
  ]);

  if (arrays.has(fieldName)) return 'array';
  if (booleans.has(fieldName)) return 'boolean';
  if (numbers.has(fieldName)) return 'number';
  if (objects.has(fieldName)) return 'object';
  return 'string';
}

/**
 * Expand interface.input type into JSON Schema properties using the type catalog.
 * Returns { properties, required } or null if expansion is not possible.
 *
 * @param {Object} def - effector definition with interface.input
 * @returns {{ properties: Object, required: string[] } | null}
 */
function expandInterfaceInput(def) {
  if (!_typeCatalog || !def.interface?.input) return null;

  const inputTypeName = def.interface.input;
  const inputType = _typeCatalog.types?.input?.[inputTypeName];
  if (!inputType?.fields) return null;

  const properties = {};
  const requiredFields = inputType.fields.required || [];
  const optionalFields = inputType.fields.optional || [];

  for (const field of requiredFields) {
    const schemaType = inferFieldSchemaType(field);
    const prop = { type: schemaType, description: `${inputTypeName} — ${field} (required)` };
    if (schemaType === 'array') prop.items = { type: 'string' };
    properties[field] = prop;
  }

  for (const field of optionalFields) {
    const schemaType = inferFieldSchemaType(field);
    const prop = { type: schemaType, description: `${inputTypeName} — ${field}` };
    if (schemaType === 'array') prop.items = { type: 'string' };
    properties[field] = prop;
  }

  return { properties, required: requiredFields };
}

// ─── Plugin Registry ─────────────────────────────────────────

const _customTargets = new Map();

/**
 * Register a custom compile target.
 * @param {string} name - Target name
 * @param {Function} compileFn - (effectorDef) => string
 * @param {{ description?: string, format?: string }} [options]
 */
export function registerTarget(name, compileFn, options = {}) {
  if (typeof name !== 'string' || !name) {
    throw new EffectorError(COMPILE_TARGET_UNKNOWN, { target: name }, 'Target name must be a non-empty string.');
  }
  if (typeof compileFn !== 'function') {
    throw new TypeError('compileFn must be a function');
  }
  _customTargets.set(name, {
    fn: compileFn,
    description: options.description || `Custom target: ${name}`,
    format: options.format || 'text',
  });
}

/**
 * Unregister a custom compile target.
 * @param {string} name
 * @returns {boolean} true if the target was registered and removed
 */
export function unregisterTarget(name) {
  return _customTargets.delete(name);
}

/**
 * Compile an effector definition to a specific runtime target.
 *
 * @param {Object} effectorDef - Parsed effector definition
 *        { name, version, type, description, interface, permissions, skillContent }
 * @param {string} target - Target runtime: 'mcp' | 'openai-agents' | 'langchain' | 'json'
 * @returns {string} Compiled output as string
 */
export function compile(effectorDef, target = 'json') {
  // Check custom targets first
  if (_customTargets.has(target)) {
    return _customTargets.get(target).fn(effectorDef);
  }

  switch (target) {
    case 'mcp':
      return compileMCP(effectorDef);
    case 'openai-agents':
      return compileOpenAIAgents(effectorDef);
    case 'langchain':
      return compileLangChain(effectorDef);
    case 'json':
      return JSON.stringify(effectorDef, null, 2);
    default:
      throw new EffectorError(
        COMPILE_TARGET_UNKNOWN,
        { target, available: listTargets().map(t => t.name) },
      );
  }
}

/**
 * List available compile targets.
 */
export function listTargets() {
  const builtIn = [
    { name: 'mcp', description: 'MCP tool schema (JSON-RPC 2.0)', format: 'json' },
    { name: 'openai-agents', description: 'OpenAI Agents FunctionTool definition', format: 'json' },
    { name: 'langchain', description: 'LangChain StructuredTool Python class', format: 'python' },
    { name: 'json', description: 'Raw effector IR (passthrough)', format: 'json' },
  ];

  for (const [name, entry] of _customTargets) {
    builtIn.push({ name, description: entry.description, format: entry.format });
  }

  return builtIn;
}

// ── MCP Target ────────────────────────────────────────────

function compileMCP(def) {
  const name = normalizeName(def.name);
  const envVars = extractEnvVars(def);
  const expanded = expandInterfaceInput(def);

  const tool = {
    name,
    description: def.description || 'No description provided',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  };

  // 1. Interface-derived properties (from type catalog field definitions)
  if (expanded) {
    Object.assign(tool.inputSchema.properties, expanded.properties);
    if (expanded.required.length > 0) {
      tool.inputSchema.required = [...expanded.required];
    }
  }

  // 2. envRead properties (override interface fields if names collide)
  for (const envVar of envVars) {
    tool.inputSchema.properties[envVar] = {
      type: 'string',
      description: `Environment variable: ${envVar}`,
    };
  }
  if (envVars.length > 0) {
    const req = new Set(tool.inputSchema.required || []);
    for (const v of envVars) req.add(v);
    tool.inputSchema.required = [...req];
  }

  if (def.interface) {
    tool._interface = {
      input: def.interface.input || null,
      output: def.interface.output || null,
      context: def.interface.context || [],
    };
  }

  return JSON.stringify(tool, null, 2);
}

// ── OpenAI Agents Target ──────────────────────────────────

function compileOpenAIAgents(def) {
  const name = normalizeName(def.name);
  const envVars = extractEnvVars(def);
  const expanded = expandInterfaceInput(def);

  // OpenAI Agents SDK FunctionTool format
  const functionDef = {
    type: 'function',
    function: {
      name,
      description: def.description || 'No description provided',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  };

  // 1. Interface-derived properties
  if (expanded) {
    Object.assign(functionDef.function.parameters.properties, expanded.properties);
    if (expanded.required.length > 0) {
      functionDef.function.parameters.required = [...expanded.required];
    }
  }

  // 2. envRead properties
  for (const envVar of envVars) {
    functionDef.function.parameters.properties[envVar] = {
      type: 'string',
      description: `Environment variable: ${envVar}`,
    };
  }
  if (envVars.length > 0) {
    const req = new Set(functionDef.function.parameters.required || []);
    for (const v of envVars) req.add(v);
    functionDef.function.parameters.required = [...req];
  }

  // Include skill instructions as system context
  if (def.skillContent) {
    functionDef._effector = {
      skillContent: def.skillContent,
      interface: def.interface || null,
    };
  }

  return JSON.stringify(functionDef, null, 2);
}

// ── LangChain Target ──────────────────────────────────────

function compileLangChain(def) {
  const className = toPascalCase(def.name);
  const name = normalizeName(def.name);
  const envVars = extractEnvVars(def);
  const expanded = expandInterfaceInput(def);
  const desc = (def.description || 'No description provided').replace(/"/g, '\\"');

  let fields = '';
  const pyTypeMap = { string: 'str', number: 'float', boolean: 'bool', array: 'list', object: 'dict' };

  // 1. Interface-derived fields
  if (expanded) {
    const reqSet = new Set(expanded.required);
    for (const [fieldName, schema] of Object.entries(expanded.properties)) {
      const pyType = pyTypeMap[schema.type] || 'str';
      const optional = reqSet.has(fieldName) ? '' : ', default=None';
      fields += `    ${fieldName}: ${reqSet.has(fieldName) ? pyType : `Optional[${pyType}]`} = Field(description="${schema.description}"${optional})\n`;
    }
  }

  // 2. envRead fields
  for (const envVar of envVars) {
    const fieldName = envVar.toLowerCase();
    fields += `    ${fieldName}: str = Field(description="Environment variable: ${envVar}")\n`;
  }

  const hasFields = fields.length > 0;
  const inputClass = hasFields
    ? `\nclass ${className}Input(BaseModel):\n    """Input schema for ${className}."""\n${fields}\n`
    : '';

  const argsSchema = hasFields
    ? `    args_schema: Type[BaseModel] = ${className}Input\n`
    : '';

  return `"""
${className} — Generated by effector compile --target langchain
Source: effector.toml + SKILL.md
"""

from langchain.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Type, Optional

${inputClass}
class ${className}Tool(BaseTool):
    """${desc}"""
    name: str = "${name}"
    description: str = "${desc}"
${argsSchema}
    def _run(self, **kwargs) -> str:
        \"\"\"Execute the skill. Override this method with actual implementation.\"\"\"
        # Instruction passthrough: return SKILL.md content for the LLM
        return """${(def.skillContent || '').slice(0, 2000).replace(/"""/g, '\\"\\"\\"')}"""

    async def _arun(self, **kwargs) -> str:
        return self._run(**kwargs)
`;
}

// ── Helpers ───────────────────────────────────────────────

function normalizeName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toPascalCase(name) {
  return name
    .split(/[-_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function extractEnvVars(def) {
  const vars = new Set();
  if (def.permissions?.envRead) {
    for (const v of def.permissions.envRead) vars.add(v);
  }
  if (def.requires?.env) {
    for (const v of def.requires.env) {
      if (v && typeof v === 'string') vars.add(v);
    }
  }
  return [...vars];
}
