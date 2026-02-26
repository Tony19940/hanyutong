import db from '../server/db.js';
import crypto from 'crypto';

console.log('DB initialized successfully');

// Generate a test key
const year = new Date().getFullYear();
const part1 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
const part2 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
const testKey = `HYT-${year}-${part1}-${part2}`;

try {
  db.prepare('INSERT INTO keys (key_code, serial_number) VALUES (?, ?)').run(testKey, '001');
  console.log('Test key created:', testKey);
} catch(e) {
  console.log('Key may already exist');
}

// Simple test key for easy testing
try {
  db.prepare('INSERT INTO keys (key_code, serial_number) VALUES (?, ?)').run('HYT-2025-TEST-KEY1', '000');
  console.log('Simple test key: HYT-2025-TEST-KEY1');
} catch(e) {
  console.log('Simple test key already exists');
}

console.log('Done!');
