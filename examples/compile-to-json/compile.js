import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effector } from '../../src/effector.js';

mkdirSync('output', { recursive: true });

const target = 'json';
const compiled = Effector.fromDir('.').validate().compile(target);

// `json` target is raw Effector IR (JSON-serializable object).
writeFileSync(join('output', 'effector-ir.json'), JSON.stringify(compiled, null, 2));
console.log(JSON.stringify(compiled, null, 2));

