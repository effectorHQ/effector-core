/**
 * @module @effectorhq/core
 *
 * Fluent builder API for the effector ecosystem.
 * Convenience layer on top of individual parsers, validators, and compiler.
 *
 * Usage:
 *   const result = Effector.fromDir('./my-skill').validate().compile('mcp');
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseEffectorToml } from './toml-parser.js';
import { parseSkillFile } from './skill-parser.js';
import { validateManifest, validateTypeNames } from './schema-validator.js';
import { isKnownType } from './type-checker.js';
import { compile as compileTarget } from './compiler-targets.js';
import { EffectorError, TOML_PARSE_ERROR } from './errors.js';

export class Effector {
  /** @type {import('./toml-parser.js').EffectorDef|null} */
  #def = null;
  /** @type {import('./skill-parser.js').ParsedSkill|null} */
  #skill = null;
  /** @type {string[]} */
  #errors = [];
  /** @type {string[]} */
  #warnings = [];

  /**
   * Load from a directory containing effector.toml and/or SKILL.md.
   * @param {string} dir - Directory path
   * @returns {Effector}
   */
  static fromDir(dir) {
    const instance = new Effector();
    const tomlPath = join(dir, 'effector.toml');
    const skillPath = join(dir, 'SKILL.md');

    if (existsSync(tomlPath)) {
      try {
        const content = readFileSync(tomlPath, 'utf-8');
        instance.#def = parseEffectorToml(content);
      } catch (err) {
        instance.#errors.push(`Failed to parse effector.toml: ${err.message}`);
      }
    }

    if (existsSync(skillPath)) {
      try {
        const content = readFileSync(skillPath, 'utf-8');
        instance.#skill = parseSkillFile(content, skillPath);
        if (!instance.#skill.valid) {
          instance.#errors.push(`SKILL.md parse error: ${instance.#skill.error}`);
        }
      } catch (err) {
        instance.#errors.push(`Failed to read SKILL.md: ${err.message}`);
      }
    }

    if (!existsSync(tomlPath) && !existsSync(skillPath)) {
      instance.#errors.push(`No effector.toml or SKILL.md found in ${dir}`);
    }

    return instance;
  }

  /**
   * Create from a TOML string.
   * @param {string} content - Raw effector.toml content
   * @returns {Effector}
   */
  static fromToml(content) {
    const instance = new Effector();
    try {
      instance.#def = parseEffectorToml(content);
    } catch (err) {
      instance.#errors.push(`TOML parse error: ${err.message}`);
    }
    return instance;
  }

  /**
   * Create from a SKILL.md string.
   * @param {string} content - Raw SKILL.md content
   * @param {string} [filePath] - Optional file path for error context
   * @returns {Effector}
   */
  static fromSkill(content, filePath) {
    const instance = new Effector();
    instance.#skill = parseSkillFile(content, filePath);
    if (!instance.#skill.valid) {
      instance.#errors.push(`SKILL.md parse error: ${instance.#skill.error}`);
    }
    return instance;
  }

  /**
   * Validate the manifest. Accumulates errors and warnings.
   * @returns {this} for chaining
   */
  validate() {
    if (!this.#def) {
      this.#errors.push('No effector.toml loaded — cannot validate manifest.');
      return this;
    }
    const result = validateManifest(this.#def);
    this.#errors.push(...result.errors);
    this.#warnings.push(...result.warnings);
    return this;
  }

  /**
   * Validate type names against the types catalog.
   * Uses the bundled 40-type catalog by default.
   * @param {Object} [catalog] - Optional custom catalog
   * @returns {this} for chaining
   */
  checkTypes(catalog) {
    if (!this.#def) {
      this.#errors.push('No effector.toml loaded — cannot check types.');
      return this;
    }

    if (catalog) {
      const result = validateTypeNames(this.#def, catalog);
      this.#warnings.push(...result.warnings);
    } else {
      // Use the bundled catalog via isKnownType
      const iface = this.#def.interface;
      if (iface) {
        const typeNames = [iface.input, iface.output, ...(iface.context || [])];
        for (const typeName of typeNames) {
          if (typeName && !isKnownType(typeName)) {
            this.#warnings.push(`Unknown type "${typeName}" — not in the standard catalog.`);
          }
        }
      }
    }
    return this;
  }

  /**
   * Compile to a runtime target.
   * @param {string} target - 'mcp' | 'openai-agents' | 'langchain' | 'json' | custom
   * @returns {string} Compiled output
   */
  compile(target = 'json') {
    if (!this.#def) {
      throw new EffectorError(TOML_PARSE_ERROR, {}, 'No effector.toml loaded — call fromDir() or fromToml() first.');
    }
    const def = { ...this.#def };
    if (this.#skill?.body) {
      def.skillContent = this.#skill.body;
    }
    return compileTarget(def, target);
  }

  /**
   * Get the raw EffectorDef object.
   * @returns {Object}
   */
  toJSON() {
    return this.#def ? { ...this.#def } : null;
  }

  /** @type {Object|null} The parsed EffectorDef */
  get def() { return this.#def; }

  /** @type {Object|null} The parsed SKILL.md */
  get skill() { return this.#skill; }

  /** @type {string[]} Accumulated errors */
  get errors() { return [...this.#errors]; }

  /** @type {string[]} Accumulated warnings */
  get warnings() { return [...this.#warnings]; }

  /** @type {boolean} Whether the loaded data has any errors */
  get valid() { return this.#errors.length === 0; }
}
