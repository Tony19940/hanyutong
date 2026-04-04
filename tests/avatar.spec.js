import { describe, expect, it } from 'vitest';
import { buildAvatarSeed, pickFallbackAvatarId, resolveAvatarUrl } from '../src/utils/avatar.js';

describe('avatar utilities', () => {
  it('uses telegram id first when building avatar seed', () => {
    expect(buildAvatarSeed({ telegramId: 'tg-1', username: 'alice', name: 'Alice' })).toBe('tg-1');
  });

  it('returns deterministic fallback avatar ids', () => {
    expect(pickFallbackAvatarId('alice')).toBe(pickFallbackAvatarId('alice'));
    expect(pickFallbackAvatarId('alice')).toMatch(/^animal-/);
  });

  it('prefers direct avatar urls and otherwise falls back to local avatar assets', () => {
    expect(resolveAvatarUrl({ avatarUrl: 'https://example.com/a.jpg' }, 'animal-cat')).toBe('https://example.com/a.jpg');
    expect(resolveAvatarUrl({ name: 'Alice' }, 'animal-cat')).toBe('/avatars/animal-cat.svg');
  });
});
