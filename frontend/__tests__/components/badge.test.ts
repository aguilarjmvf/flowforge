import { describe, it, expect } from 'vitest';
import { statusBadge } from '@/components/ui/badge';

describe('statusBadge', () => {
  const cases: Array<[string, string]> = [
    ['draft', 'muted'],
    ['in_progress', 'info'],
    ['completed', 'success'],
    ['rejected', 'danger'],
    ['cancelled', 'muted'],
    ['pending', 'warning'],
    ['approved', 'success'],
    ['returned', 'warning'],
    ['published', 'success'],
    ['archived', 'muted'],
  ];

  it.each(cases)('maps status "%s" to variant "%s"', (status, expectedVariant) => {
    expect(statusBadge(status)).toBe(expectedVariant);
  });

  it('returns "default" for unknown status strings', () => {
    expect(statusBadge('unknown_status')).toBe('default');
    expect(statusBadge('')).toBe('default');
  });
});
