#!/usr/bin/env node
/**
 * Dev-only: sync the bundled types catalog from upstream effector-types.
 * Run: node scripts/sync-types.js
 */
import { copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', '..', 'effector-types', 'types.json');
const dst = join(__dirname, '..', 'src', 'types-catalog.json');

try {
  copyFileSync(src, dst);
  console.log('✓ Synced types-catalog.json from effector-types/types.json');
} catch (err) {
  console.error('✗ Failed to sync:', err.message);
  console.error('  Make sure effector-types is a sibling directory.');
  process.exit(1);
}
