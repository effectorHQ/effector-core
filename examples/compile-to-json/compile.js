import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effector } from '@effectorhq/core';

mkdirSync('output', { recursive: true });

const target = 'json';
const compiled = Effector.fromDir('.').validate().compile(target);

// `Effector.compile('json')` already returns JSON-formatted string.
writeFileSync(join('output', 'effector-ir.json'), compiled);
console.log(compiled);

