import { generateLicenseKey, isValidKey } from '../assets/js/license.js';

const count = Math.max(1, Math.min(500, Number(process.argv[2]) || 1));
const keys = Array.from({ length: count }, () => generateLicenseKey());

for (const key of keys) {
  if (!isValidKey(key)) {
    console.error('Generated an invalid key. Aborting.');
    process.exit(1);
  }
  console.log(key);
}

console.error(`Generated ${keys.length} valid key${keys.length === 1 ? '' : 's'}.`);
console.error('Deliver one key per firm purchase. Keys work offline on one device.');
