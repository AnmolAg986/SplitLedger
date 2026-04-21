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

router.get('/:id/comments', requireAuth, ExpenseController.getComments);
router.post('/:id/comments', requireAuth, ExpenseController.addComment);
router.delete('/:id/comments/:commentId', requireAuth, ExpenseController.deleteComment);

// Receipt Attachments
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ExpenseAttachmentController } from '../controllers/ExpenseAttachmentController';

const receiptUploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(receiptUploadDir)) fs.mkdirSync(receiptUploadDir, { recursive: true });

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, receiptUploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${unique}${path.extname(file.originalname)}`);
  }
});

const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (JPEG/PNG/WebP) and PDFs are allowed'));
  }
});

router.get('/:id/attachments', requireAuth, ExpenseAttachmentController.getAttachments);
router.post('/:id/attachments', requireAuth, receiptUpload.single('receipt'), ExpenseAttachmentController.uploadAttachment);
router.delete('/:id/attachments/:attachmentId', requireAuth, ExpenseAttachmentController.deleteAttachment);

export default router;
