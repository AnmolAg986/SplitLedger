import { describe, it, expect } from 'vitest';
import { getFirstName, getSplitSummary } from '../shared/utils/expenseUtils';

describe('expenseUtils', () => {
  describe('getFirstName', () => {
    it('returns empty string for falsy input', () => {
      expect(getFirstName('')).toBe('');
      expect(getFirstName(undefined as any)).toBe('');
    });

    it('returns "You" for "you" case-insensitive', () => {
      expect(getFirstName('you')).toBe('You');
      expect(getFirstName('You')).toBe('You');
      expect(getFirstName('YOU')).toBe('You');
    });

    it('returns the first part of a full name', () => {
      expect(getFirstName('John Doe')).toBe('John');
      expect(getFirstName('Alice Bob Charlie')).toBe('Alice');
      expect(getFirstName('  Bob  Smith ')).toBe('Bob');
    });
  });

  describe('getSplitSummary', () => {
    it('returns empty string for empty participants', () => {
      expect(getSplitSummary([], 5)).toBe('');
      expect(getSplitSummary(undefined as any, 5)).toBe('');
    });

    it('returns "Split among everyone" if participants equals total members', () => {
      expect(getSplitSummary([{ display_name: 'A' }, { display_name: 'B' }], 2)).toBe('Split among everyone');
    });

    it('handles 1 participant', () => {
      expect(getSplitSummary([{ display_name: 'John Doe' }], 5)).toBe('Split with John');
      expect(getSplitSummary([{ display_name: 'You' }], 5)).toBe('Split with You');
    });

    it('handles 2 participants', () => {
      expect(getSplitSummary([{ display_name: 'John Doe' }, { display_name: 'Alice' }], 5)).toBe('Split among John & Alice');
    });

    it('handles 3 or more participants', () => {
      expect(getSplitSummary([
        { display_name: 'John Doe' }, 
        { display_name: 'Alice' }, 
        { display_name: 'Bob' }
      ], 5)).toBe('Split among John, Alice & 1 others');

      expect(getSplitSummary([
        { display_name: 'John Doe' }, 
        { display_name: 'Alice' }, 
        { display_name: 'Bob' },
        { display_name: 'Charlie' }
      ], 5)).toBe('Split among John, Alice & 2 others');
    });
  });
});
