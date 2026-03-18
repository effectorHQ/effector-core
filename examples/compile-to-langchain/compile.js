import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effector } from '@effectorhq/core';

mkdirSync('output', { recursive: true });

const target = 'langchain';
const compiled = Effector.fromDir('.').validate().compile(target);

// `langchain` emits a Python code template (string) today.
if (typeof compiled === 'string') {
  writeFileSync(join('output', 'langchain-structured-tool.py'), compiled);
} else {
  writeFileSync(join('output', 'langchain-structured-tool.json'), JSON.stringify(compiled, null, 2));
}

console.log(compiled);

