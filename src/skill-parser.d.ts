/**
 * Result of parsing a SKILL.md file.
 */
export interface ParsedSkill {
  /** Raw frontmatter string (between --- delimiters) */
  frontmatter: string;
  /** Markdown body (after closing ---) */
  body: string;
  /** Parsed YAML frontmatter as an object */
  parsed: Record<string, unknown>;
  /** Whether parsing succeeded */
  valid: boolean;
  /** Error message if parsing failed */
  error: string | null;
}

/**
 * Extracted metadata from a parsed SKILL.md.
 */
export interface SkillMetadata {
  name: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  emoji: string | null;
  requires: Record<string, unknown> | null;
  install: string | null;
}

/**
 * Parse a SKILL.md file (YAML frontmatter + Markdown body).
 * @param content - The raw SKILL.md file content
 * @param filePath - Optional file path for error context
 */
export function parseSkillFile(content: string, filePath?: string): ParsedSkill;

/**
 * Parse a YAML string into a JavaScript object.
 * Handles nested objects, arrays, block scalars, inline arrays, and type coercion.
 */
export function parseYaml(yaml: string): Record<string, unknown>;

/**
 * Extract metadata fields (name, description, emoji, requires, install) from parsed YAML.
 */
export function extractMetadata(parsed: Record<string, unknown>): SkillMetadata;
