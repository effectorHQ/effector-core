import { checkTypeCompatibility, isKnownType } from '@effectorhq/core';

// Check if types are compatible for composition
const result1 = checkTypeCompatibility('CodeDiff', 'CodeDiff');
console.log('CodeDiff → CodeDiff:', result1.compatible, `(${result1.reason})`);

const result2 = checkTypeCompatibility('SecurityReport', 'ReviewReport');
console.log('SecurityReport → ReviewReport:', result2.compatible, `(${result2.reason})`);

const result3 = checkTypeCompatibility('CodeDiff', 'ReviewReport');
console.log('CodeDiff → ReviewReport:', result3.compatible, `(${result3.reason})`);

// Check if a type exists in the 40-type catalog
console.log('\nisKnownType("CodeDiff"):', isKnownType('CodeDiff'));
console.log('isKnownType("MagicType"):', isKnownType('MagicType'));
