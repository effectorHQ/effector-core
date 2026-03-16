import type { EffectorDef } from './toml-parser.js';
import type { ParsedSkill } from './skill-parser.js';
import type { TypesCatalog } from './type-checker.js';

/**
 * Fluent builder API for the effector ecosystem.
 *
 * @example
 * ```js
 * const result = Effector.fromDir('./my-skill').validate().compile('mcp');
 * ```
 */
export class Effector {
  /** Load from a directory containing effector.toml and/or SKILL.md. */
  static fromDir(dir: string): Effector;

  /** Create from a raw effector.toml string. */
  static fromToml(content: string): Effector;

  /** Create from a raw SKILL.md string. */
  static fromSkill(content: string, filePath?: string): Effector;

  /** Validate the manifest. Accumulates errors and warnings. Returns this for chaining. */
  validate(): this;

  /** Validate type names against the types catalog (bundled or custom). Returns this for chaining. */
  checkTypes(catalog?: TypesCatalog): this;

  /** Compile to a runtime target. */
  compile(target?: 'mcp' | 'openai-agents' | 'langchain' | 'json' | string): string;

  /** Get the raw EffectorDef object. */
  toJSON(): EffectorDef | null;

  /** The parsed EffectorDef */
  readonly def: EffectorDef | null;

  /** The parsed SKILL.md */
  readonly skill: ParsedSkill | null;

  /** Accumulated errors */
  readonly errors: string[];

  /** Accumulated warnings */
  readonly warnings: string[];

  /** Whether the loaded data has any errors */
  readonly valid: boolean;
}
