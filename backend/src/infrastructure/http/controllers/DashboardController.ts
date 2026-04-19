import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { DashboardRepository } from '../../persistence/DashboardRepository';

export class DashboardController {
  
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const [metrics, onboarding, insights, recentActivity, focusInsight, advanced] = await Promise.all([
        DashboardRepository.getMetrics(userId),
        DashboardRepository.hasOnboarded(userId),
        DashboardRepository.getSmartInsights(userId),
        DashboardRepository.getRecentActivityMini(userId),
        DashboardRepository.getFocusInsight(userId),
        DashboardRepository.getAdvancedInsights(userId),
      ]);

      return res.status(200).json({
        metrics,
        onboarding,
        insights,
        recentActivity,
        focusInsight,
        advanced,
      });
    } catch (e: unknown) {
      console.error('[DashboardController] getSummary error:', e);
      return res.status(500).json({ error: 'Internal server error while fetching dashboard.' });
    }
  }

  // ── Phase 3+: Uncomment when reaching those phases ──
  // static async getFullActivity(req: Request, res: Response) {
  //   try {
  //     const userId = req.user?.id;
  //     if (!userId) {
  //       return res.status(401).json({ error: 'Unauthorized' });
  //     }
  //     const activity = await DashboardRepository.getFullActivity(userId);
  //     return res.status(200).json(activity);
  //   } catch (e: unknown) {
  //     console.error('[DashboardController] getFullActivity error:', e);
  //     return res.status(500).json({ error: 'Internal server error while fetching activity.' });
  //   }
  // }
}
