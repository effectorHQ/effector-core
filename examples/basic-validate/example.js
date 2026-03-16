import { Effector } from '@effectorhq/core';

// Load, validate, and inspect
const e = Effector.fromDir('.').validate().checkTypes();

console.log('Valid:', e.valid);
console.log('Errors:', e.errors);
console.log('Warnings:', e.warnings);
console.log('Interface:', e.def.interface);
