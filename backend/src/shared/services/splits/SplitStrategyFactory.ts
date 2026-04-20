import { ISplitStrategy } from './ISplitStrategy';
import { EqualSplitStrategy } from './EqualSplitStrategy';
import { ExactSplitStrategy } from './ExactSplitStrategy';
import { PercentageSplitStrategy } from './PercentageSplitStrategy';

export class SplitStrategyFactory {
  static getStrategy(type: string): ISplitStrategy {
    switch (type.toLowerCase()) {
      case 'equal':
        return new EqualSplitStrategy();
      case 'exact':
        return new ExactSplitStrategy();
      case 'percentage':
        return new PercentageSplitStrategy();
      default:
        throw new Error(`Unsupported split strategy: ${type}`);
    }
  }
}
