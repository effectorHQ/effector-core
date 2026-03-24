/** Error code constants */
export const TOML_PARSE_ERROR: string;
export const SKILL_PARSE_ERROR: string;
export const TYPE_UNKNOWN: string;
export const TYPE_INCOMPATIBLE: string;
export const VALIDATION_ERROR: string;
export const COMPILE_TARGET_UNKNOWN: string;
export const FILE_NOT_FOUND: string;
export const PERMISSION_DENIED: string;
export const DISCOVERY_NO_MATCH: string;

/**
 * Structured error with code, context, and actionable suggestion.
 */
export class EffectorError extends Error {
  /** Error code (e.g., "EFFECTOR_TOML_PARSE_ERROR") */
  code: string;
  /** Contextual data (file path, field name, etc.) */
  context: Record<string, unknown>;
  /** Actionable suggestion for fixing the error */
  suggestion: string;

  constructor(code: string, context?: Record<string, unknown>, suggestion?: string);

  /** Format the error as a plain object. */
  toJSON(): {
    name: string;
    code: string;
    message: string;
    context: Record<string, unknown>;
    suggestion: string;
  };
}
