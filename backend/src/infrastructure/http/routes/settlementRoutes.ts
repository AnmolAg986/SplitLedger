import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { SettlementController } from '../controllers/SettlementController';
import { requireAuth } from '../middleware/authMiddleware';

const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = Router();

router.post('/', requireAuth, SettlementController.createSettlement);
router.post('/recurring', requireAuth, SettlementController.createRecurring);
router.post('/settle-all-mutual', requireAuth, SettlementController.settleAllMutual);
router.patch('/:id/settle', requireAuth, SettlementController.markSettled);
router.post('/:id/dispute', requireAuth, SettlementController.disputeSettlement);
router.post('/:id/resolve', requireAuth, SettlementController.resolveDispute);
router.get('/', requireAuth, SettlementController.getSettlements);
router.get('/:id/history', requireAuth, SettlementController.getHistory);
router.post('/:id/proof', requireAuth, upload.single('proof'), SettlementController.uploadProof);

export default router;
