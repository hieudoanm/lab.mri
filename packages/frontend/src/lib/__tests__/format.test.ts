import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatChecksum,
  formatDateTime,
  formatDimensions,
  formatDuration,
  formatElapsed,
  formatIdentifier,
  formatSpacing,
} from '@/lib/format';

describe('format', () => {
  it('formats byte counts using binary units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KiB');
    expect(formatBytes(1536)).toBe('1.5 KiB');
  });

  it('formats durations across the minute boundary', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(125)).toBe('2 min 5 s');
    expect(formatDuration(null)).toBe('—');
  });

  it('predicts a stable elapsed value for finished ranges', () => {
    expect(formatElapsed('2024-01-01T00:00:00Z', '2024-01-01T00:01:30Z')).toBe('1 min 30 s');
  });

  it('formats timestamps in UTC and tolerates invalid input', () => {
    expect(formatDateTime('2024-06-01T12:30:00Z')).toContain('UTC');
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });

  it('formats dimension and spacing vectors', () => {
    expect(formatDimensions([256, 256, 176])).toBe('256 × 256 × 176');
    expect(formatSpacing([1, 1, 1.2])).toBe('1 × 1 × 1.2 mm');
    expect(formatDimensions([])).toBe('—');
  });

  it('shortens checksums and identifiers', () => {
    expect(formatChecksum('sha256:abcdef0123456789abcd')).toBe('abcdef012345…');
    expect(formatChecksum('abc')).toBe('abc');
    expect(formatIdentifier('12345678-1234')).toBe('12345678…');
  });
});
