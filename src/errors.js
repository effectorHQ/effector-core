/**
 * @module @effectorhq/core/errors
 *
 * Structured error types for the effector ecosystem.
 * Each error has a code, context object, and actionable suggestion.
 */

/** Error code constants */
export const TOML_PARSE_ERROR = 'EFFECTOR_TOML_PARSE_ERROR';
export const SKILL_PARSE_ERROR = 'EFFECTOR_SKILL_PARSE_ERROR';
export const TYPE_UNKNOWN = 'EFFECTOR_TYPE_UNKNOWN';
export const TYPE_INCOMPATIBLE = 'EFFECTOR_TYPE_INCOMPATIBLE';
export const VALIDATION_ERROR = 'EFFECTOR_VALIDATION_ERROR';
export const COMPILE_TARGET_UNKNOWN = 'EFFECTOR_COMPILE_TARGET_UNKNOWN';
export const FILE_NOT_FOUND = 'EFFECTOR_FILE_NOT_FOUND';

const SUGGESTIONS = {
  [TOML_PARSE_ERROR]: 'Check your effector.toml syntax. See https://github.com/effectorHQ/effector-core#effectortoml',
  [SKILL_PARSE_ERROR]: 'Ensure SKILL.md starts and ends with --- delimiters around YAML frontmatter.',
  [TYPE_UNKNOWN]: 'Run `effector-core types` to see all 40 standard types.',
  [TYPE_INCOMPATIBLE]: 'Check that the output type of the upstream tool matches the input type of the downstream tool.',
  [VALIDATION_ERROR]: 'Run `effector-core validate .` to see all validation errors.',
  [COMPILE_TARGET_UNKNOWN]: 'Use listTargets() or `effector-core compile --help` to see available targets.',
  [FILE_NOT_FOUND]: 'Ensure the directory contains effector.toml and/or SKILL.md.',
};

/**
 * Structured error with code, context, and actionable suggestion.
 */
export class EffectorError extends Error {
  /**
   * @param {string} code - Error code constant (e.g., EFFECTOR_TOML_PARSE_ERROR)
   * @param {Object} [context={}] - Contextual data (file path, field name, etc.)
   * @param {string} [suggestion] - Actionable suggestion (auto-filled from code if omitted)
   */
  constructor(code, context = {}, suggestion) {
    const msg = EffectorError.formatMessage(code, context);
    super(msg);
    this.name = 'EffectorError';
    this.code = code;
    this.context = context;
    this.suggestion = suggestion || SUGGESTIONS[code] || '';
  }

  static formatMessage(code, context) {
    const details = Object.entries(context)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    return details ? `[${code}] ${details}` : `[${code}]`;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      suggestion: this.suggestion,
    };
  }
}
