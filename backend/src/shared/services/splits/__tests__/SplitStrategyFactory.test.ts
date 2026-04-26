import { describe, it, expect } from 'vitest';
import { SplitStrategyFactory } from '../SplitStrategyFactory';
import { EqualSplitStrategy } from '../EqualSplitStrategy';
import { ExactSplitStrategy } from '../ExactSplitStrategy';
import { PercentageSplitStrategy } from '../PercentageSplitStrategy';
import { SharesSplitStrategy } from '../SharesSplitStrategy';

describe('SplitStrategyFactory', () => {
  it('returns EqualSplitStrategy for type "equal"', () => {
    const strategy = SplitStrategyFactory.getStrategy('equal');
    expect(strategy).toBeInstanceOf(EqualSplitStrategy);
  });

  it('returns ExactSplitStrategy for type "exact"', () => {
    const strategy = SplitStrategyFactory.getStrategy('exact');
    expect(strategy).toBeInstanceOf(ExactSplitStrategy);
  });

  it('returns PercentageSplitStrategy for type "percentage"', () => {
    const strategy = SplitStrategyFactory.getStrategy('percentage');
    expect(strategy).toBeInstanceOf(PercentageSplitStrategy);
  });

  it('returns SharesSplitStrategy for type "shares"', () => {
    const strategy = SplitStrategyFactory.getStrategy('shares');
    expect(strategy).toBeInstanceOf(SharesSplitStrategy);
  });

  it('throws for unknown strategy types', () => {
    expect(() => SplitStrategyFactory.getStrategy('unknown')).toThrow('Unsupported split strategy: unknown');
  });
});
