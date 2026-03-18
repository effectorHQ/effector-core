import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effector } from '../../src/effector.js';

mkdirSync('output', { recursive: true });

const target = 'mcp';
const compiled = Effector.fromDir('.').validate().compile(target);

// Compile output is a JSON-serializable object for `mcp`.
writeFileSync(join('output', 'mcp-tool-schema.json'), JSON.stringify(compiled, null, 2));
console.log(JSON.stringify(compiled, null, 2));

