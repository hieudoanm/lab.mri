import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins truthy class names with a single space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('omits falsy values', () => {
    expect(cn('a', false, null, undefined)).toBe('a');
  });

  it('returns an empty string when there are no class names', () => {
    expect(cn()).toBe('');
  });
});
