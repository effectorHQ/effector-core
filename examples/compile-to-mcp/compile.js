import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effector } from '@effectorhq/core';

mkdirSync('output', { recursive: true });

const target = 'mcp';
const compiled = Effector.fromDir('.').validate().compile(target);

// Compile output is a JSON-serializable object for `mcp`.
// `Effector.compile('mcp')` already returns a JSON-formatted string.
writeFileSync(join('output', 'mcp-tool-schema.json'), compiled);
console.log(compiled);

