import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';
import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createExpenseSchema, updateExpenseSchema } from '../../../shared/validation/expenseSchema';

const router = Router();

router.post('/', requireAuth, validate(createExpenseSchema), ExpenseController.createExpense);
router.get('/:id', requireAuth, ExpenseController.getExpense);
router.put('/:id', requireAuth, validate(updateExpenseSchema), ExpenseController.updateExpense);
router.delete('/:id', requireAuth, ExpenseController.deleteExpense);
router.post('/:id/remind', requireAuth, ExpenseController.remindExpense);
router.post('/recurring', requireAuth, ExpenseController.createRecurringTemplate);
router.post('/:id/settle', requireAuth, require('../controllers/SettlementController').SettlementController.settleSpecificExpense);

export default router;
