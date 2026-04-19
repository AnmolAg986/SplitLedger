import { RecurringExpenseRepository } from '../persistence/RecurringExpenseRepository';
import { ExpenseRepository, CreateExpenseInput } from '../persistence/ExpenseRepository';

export function startRecurringExpenseJob() {
  // Check every hour
  setInterval(async () => {
    try {
      const due = await RecurringExpenseRepository.getDueTemplates();
      if (due.length === 0) return;

      for (const t of due) {
        const template = t.template;
        
        const expenseInput: CreateExpenseInput = {
          groupId: t.group_id,
          paidBy: template.paid_by,
          amount: template.amount,
          currency: template.currency,
          description: `(Auto) ${template.description}`,
          splitType: template.split_type || 'equal',
          category: template.category,
          createdBy: t.created_by,
          splits: template.splits
        };

        // Create the actual expense
        await ExpenseRepository.createExpense(expenseInput);

        // Calculate next run date
        const nextRun = calculateNextRun(new Date(t.next_run_at), t.frequency);
        await RecurringExpenseRepository.updateNextRun(t.id, nextRun);
        
        console.log(`[RecurringJob] Created recurring expense for group ${t.group_id}: ${template.description}`);
      }
    } catch (err) {
      console.error('[RecurringJob] Error:', err);
    }
  }, 1000 * 60 * 60);
}

function calculateNextRun(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
