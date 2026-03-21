import crypto from 'crypto';
import { initDb, query } from '../server/db.js';

await initDb();
console.log('DB initialized successfully');

const year = new Date().getFullYear();
const part1 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
const part2 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
const testKey = `HYT-${year}-${part1}-${part2}`;

try {
  await query('INSERT INTO keys (key_code, serial_number) VALUES ($1, $2)', [testKey, '001']);
  console.log('Test key created:', testKey);
} catch {
  console.log('Key may already exist');
}

try {
  await query('INSERT INTO keys (key_code, serial_number) VALUES ($1, $2)', ['HYT-2025-TEST-KEY1', '000']);
  console.log('Simple test key: HYT-2025-TEST-KEY1');
} catch {
  console.log('Simple test key already exists');
}

console.log('Done!');
