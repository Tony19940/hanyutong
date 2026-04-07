import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('service worker smoke test', () => {
  it('registers install/activate/fetch handlers and caches audio runtime assets', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const source = fs.readFileSync(swPath, 'utf8');

    expect(source).toContain("self.addEventListener('install'");
    expect(source).toContain("self.addEventListener('activate'");
    expect(source).toContain("self.addEventListener('fetch'");
    expect(source).toContain('hyt-audio-v1');
    expect(source).toContain('/api/dialogue/audio/');
  });
});
