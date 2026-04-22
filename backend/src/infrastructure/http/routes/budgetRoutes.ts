import { Router } from 'express';
import { BudgetController } from '../controllers/BudgetController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/', requireAuth, BudgetController.createBudget);
router.get('/personal', requireAuth, BudgetController.getPersonalBudgets);
router.get('/group/:id', requireAuth, BudgetController.getGroupBudgets);
router.delete('/:id', requireAuth, BudgetController.deleteBudget);

export default router;
