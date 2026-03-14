/**
 * @module @effectorhq/core/skill
 *
 * Canonical SKILL.md parser — replaces duplicated parsers in
 * skill-lint, openclaw-mcp, and skill-eval.
 *
 * Based on skill-lint/src/parser.js (most comprehensive variant).
 * Handles: YAML frontmatter, nested objects, arrays, block scalars.
 * Zero dependencies.
 */

// ─── SKILL.md Parser ─────────────────────────────────────────

/**
 * @typedef {Object} ParsedSkill
 * @property {string} frontmatter - Raw YAML frontmatter string
 * @property {string} body - Markdown body after frontmatter
 * @property {Object} parsed - Parsed frontmatter as JS object
 * @property {boolean} valid - Whether parsing succeeded
 * @property {string|null} error - Error message if invalid
 */

/**
 * Parse a SKILL.md file into frontmatter and body.
 *
 * @param {string} content - Full SKILL.md file content
 * @returns {ParsedSkill}
 */
export function parseSkillFile(content) {
  const lines = content.split('\n');

  if (!lines[0].startsWith('---')) {
    return {
      frontmatter: '',
      body: content,
      parsed: {},
      valid: false,
      error: 'SKILL.md must start with --- (YAML frontmatter delimiter)',
    };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      frontmatter: '',
      body: content,
      parsed: {},
      valid: false,
      error: 'SKILL.md must close frontmatter with --- delimiter',
    };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const frontmatter = frontmatterLines.join('\n');
  const body = lines.slice(endIndex + 1).join('\n').trim();
  const parsed = parseYaml(frontmatter);

  return { frontmatter, body, parsed, valid: true, error: null };
}

// ─── YAML Parser ─────────────────────────────────────────────

/**
 * Parse YAML frontmatter into a plain JS object.
 *
 * Handles the subset used in SKILL.md:
 *   - Scalar values (string, quoted string)
 *   - Nested objects (indentation-based)
 *   - Simple arrays (- value) and object arrays (- key: val ...)
 *   - Block scalars (|, >) — collected as string
 *
 * @param {string} yaml - Raw YAML content (without --- delimiters)
 * @returns {Object}
 */
export function parseYaml(yaml) {
  const lines = yaml.split('\n');
  const stack = [{ obj: {}, indent: -1 }];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    i++;

    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);

    // Pop deeper/equal frames
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].obj;

    // ── Array item ──
    if (trimmed.startsWith('- ')) {
      const itemContent = trimmed.slice(2).trim();
      let arr = null;
      for (let s = stack.length - 1; s >= 0; s--) {
        if (Array.isArray(stack[s].obj)) { arr = stack[s].obj; break; }
      }
      if (!arr) continue;

      const colonPos = itemContent.indexOf(':');
      if (colonPos === -1) {
        arr.push(itemContent);
      } else {
        const itemObj = {};
        arr.push(itemObj);
        const firstKey = itemContent.slice(0, colonPos).trim();
        const firstVal = itemContent.slice(colonPos + 1).trim();
        if (firstVal && firstVal !== '|' && firstVal !== '>') {
          itemObj[firstKey] = stripQuotes(firstVal);
        }
        stack.push({ obj: itemObj, indent });
      }
      continue;
    }

    // ── Key: value ──
    const colonPos = trimmed.indexOf(':');
    if (colonPos === -1) continue;

    const key = trimmed.slice(0, colonPos).trim();
    const rawVal = trimmed.slice(colonPos + 1).trim();

    if (!rawVal || rawVal === '|' || rawVal === '>') {
      // Peek at next non-empty line
      let nextNonEmpty = null;
      let nextNonEmptyIndent = 0;
      for (let j = i; j < lines.length; j++) {
        if (lines[j].trim()) {
          nextNonEmpty = lines[j].trim();
          nextNonEmptyIndent = lines[j].search(/\S/);
          break;
        }
      }

      if (rawVal === '|' || rawVal === '>') {
        let block = '';
        while (i < lines.length) {
          const bLine = lines[i];
          const bIndent = bLine.search(/\S/);
          if (bLine.trim() && bIndent <= indent) break;
          block += bLine + '\n';
          i++;
        }
        current[key] = block.trim();
      } else if (nextNonEmpty && nextNonEmpty.startsWith('- ')) {
        const arr = [];
        current[key] = arr;
        stack.push({ obj: arr, indent });
      } else if (nextNonEmptyIndent > indent) {
        const obj = {};
        current[key] = obj;
        stack.push({ obj, indent });
      }
    } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      // Inline array: key: [a, b, c] or key: []
      const inner = rawVal.slice(1, -1).trim();
      if (!inner) {
        current[key] = [];
      } else {
        current[key] = inner.split(',').map(s => stripQuotes(s.trim())).filter(Boolean);
      }
    } else {
      current[key] = stripQuotes(rawVal);
    }
  }

  return stack[0].obj;
}

function stripQuotes(val) {
  if (!val) return val;
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

// ─── Metadata Extraction ─────────────────────────────────────

/**
 * Extract structured metadata from a parsed SKILL frontmatter.
 *
 * @param {Object} parsed - Output of parseSkillFile().parsed
 * @returns {{ name: string, description: string, metadata: Object, emoji: string, requires: Object, install: Array }}
 */
export function extractMetadata(parsed) {
  return {
    name: parsed.name || '',
    description: parsed.description || '',
    metadata: parsed.metadata || {},
    emoji: parsed.metadata?.openclaw?.emoji || parsed.metadata?.effector?.emoji || '',
    requires: parsed.metadata?.openclaw?.requires || parsed.metadata?.effector?.requires || {},
    install: parsed.metadata?.openclaw?.install || parsed.metadata?.effector?.install || [],
  };
}
