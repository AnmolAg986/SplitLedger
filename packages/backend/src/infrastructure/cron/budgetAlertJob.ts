import { BudgetRepository } from '../../infrastructure/persistence/BudgetRepository';
import { BudgetService } from '../../application/services/BudgetService';
import { NotificationRepository } from '../persistence/NotificationRepository';
import { ioInstance } from '../websocket/socketServer';

export const startBudgetAlertJob = () => {
  // Run daily at midnight (using setInterval since node-cron is not installed)
  setInterval(async () => {
    try {
      console.log('Running budget alert job...');
      const budgets = await BudgetRepository.getAllActiveBudgets();

      for (const b of budgets) {
        const today = new Date();
        let currentStart = new Date(b.starts_at);
        let currentEnd = new Date(currentStart);
        
        while (currentEnd < today) {
          currentStart = new Date(currentEnd);
          if (b.period === 'monthly') currentEnd.setMonth(currentEnd.getMonth() + 1);
          else if (b.period === 'weekly') currentEnd.setDate(currentEnd.getDate() + 7);
          else if (b.period === 'yearly') currentEnd.setFullYear(currentEnd.getFullYear() + 1);
          else currentEnd.setMonth(currentEnd.getMonth() + 1);
        }

        // if the current period start > last_alerted_at, reset last_alert_level
        // wait, we can just do it simply: if last_alerted_at is older than currentStart, reset it
        const lastAlertTime = b.last_alerted_at ? new Date(b.last_alerted_at).getTime() : 0;
        if (lastAlertTime < currentStart.getTime() && b.last_alert_level > 0) {
          await BudgetRepository.updateAlertLevel(b.id, 0);
          b.last_alert_level = 0;
        }

        const spent = await BudgetRepository.getSpentAmount(
          b.user_id, 
          b.group_id, 
          b.category, 
          currentStart.toISOString(), 
          currentEnd.toISOString()
        );

        const progress = (spent / parseFloat(b.amount)) * 100;
        let newLevel = b.last_alert_level;

        if (progress >= 100 && b.last_alert_level < 100) {
          newLevel = 100;
        } else if (progress >= 80 && b.last_alert_level < 80) {
          newLevel = 80;
        }

        if (newLevel > b.last_alert_level) {
          // Send notification
          const msg = newLevel === 100 
            ? `You have exceeded your ${b.period} budget of ₹${b.amount}${b.category ? ` for ${b.category}` : ''}!`
            : `You have consumed 80% of your ${b.period} budget of ₹${b.amount}${b.category ? ` for ${b.category}` : ''}.`;
          
          await NotificationRepository.create(
            b.user_id,
            'BUDGET_ALERT',
            newLevel === 100 ? 'Budget Exceeded!' : 'Budget Warning',
            msg
          );

          await BudgetRepository.updateAlertLevel(b.id, newLevel);
          if (ioInstance) {
            ioInstance.to(b.user_id).emit('new_notification');
          }
        }
      }
    } catch (err) {
      console.error('Error running budget alert job:', err);
    }
  }, 1000 * 60 * 60 * 24); // 24 hours
};
