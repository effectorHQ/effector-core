import { registerTarget, compile, listTargets } from '@effectorhq/core';
import { parseEffectorToml } from '@effectorhq/core/toml';
import { readFileSync } from 'node:fs';

// Register a custom CrewAI target
registerTarget('crewai', (def) => {
  return JSON.stringify({
    name: def.name,
    description: def.description,
    expected_output: `A ${def.interface?.output || 'result'} based on the ${def.interface?.input || 'input'}`,
    tools: [],
  }, null, 2);
}, {
  description: 'CrewAI agent tool definition',
  format: 'json',
});

// Now compile using the custom target
const toml = readFileSync('../basic-validate/effector.toml', 'utf-8');
const def = parseEffectorToml(toml);

console.log('Available targets:', listTargets().map(t => t.name));
console.log('\nCrewAI output:');
console.log(compile(def, 'crewai'));
