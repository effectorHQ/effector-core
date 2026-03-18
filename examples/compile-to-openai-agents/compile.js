import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effector } from '@effectorhq/core';

mkdirSync('output', { recursive: true });

const target = 'openai-agents';
const compiled = Effector.fromDir('.').validate().compile(target);

// `Effector.compile('openai-agents')` already returns a JSON-formatted string.
writeFileSync(join('output', 'openai-agents-function-tool.json'), compiled);
console.log(compiled);

