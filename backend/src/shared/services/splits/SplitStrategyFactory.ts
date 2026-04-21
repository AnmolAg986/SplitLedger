import { ISplitStrategy } from './ISplitStrategy';
import { EqualSplitStrategy } from './EqualSplitStrategy';
import { ExactSplitStrategy } from './ExactSplitStrategy';
import { PercentageSplitStrategy } from './PercentageSplitStrategy';
import { SharesSplitStrategy } from './SharesSplitStrategy';

export class SplitStrategyFactory {
  static getStrategy(type: string): ISplitStrategy {
    switch (type.toLowerCase()) {
      case 'equal':
        return new EqualSplitStrategy();
      case 'exact':
        return new ExactSplitStrategy();
      case 'percentage':
        return new PercentageSplitStrategy();
      case 'shares':
      case 'weight':
        return new SharesSplitStrategy();
      default:
        throw new Error(`Unsupported split strategy: ${type}`);
    }
  }
}
