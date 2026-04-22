import { Router } from 'express';
import { ExpenseTemplateController } from '../controllers/ExpenseTemplateController';
import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createTemplateSchema } from '../../../shared/validation/expenseTemplateSchema';

const router = Router();

router.post('/', requireAuth, validate(createTemplateSchema), ExpenseTemplateController.createTemplate);
router.get('/', requireAuth, ExpenseTemplateController.getTemplates);
router.delete('/:id', requireAuth, ExpenseTemplateController.deleteTemplate);

export default router;
