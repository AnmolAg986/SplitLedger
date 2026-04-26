import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { ExpenseAttachmentRepository } from '../../persistence/ExpenseAttachmentRepository';
import { AppError } from '../../../shared/errors/AppError';
import path from 'path';
import fs from 'fs';

export class ExpenseAttachmentController {
  static async getAttachments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const attachments = await ExpenseAttachmentRepository.getAttachments(expenseId);
      return res.status(200).json(attachments);
    } catch (err) {
      next(err);
    }
  }

  static async uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const expenseId = req.params.id as string;
      const file = req.file;

      if (!file) {
        throw new AppError(400, 'BAD_REQUEST', 'No file uploaded');
      }

      const fileUrl = `/uploads/${file.filename}`;
      const attachment = await ExpenseAttachmentRepository.addAttachment(
        expenseId,
        userId,
        fileUrl,
        file.originalname,
        file.mimetype,
        file.size
      );

      return res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  }

  static async deleteAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const attachmentId = req.params.attachmentId as string;
      const deleted = await ExpenseAttachmentRepository.deleteAttachment(attachmentId, userId);

      if (!deleted) {
        throw new AppError(403, 'FORBIDDEN', 'Cannot delete this attachment');
      }

      // Remove file from disk
      try {
        const filePath = path.join(__dirname, '../../../../uploads', path.basename(deleted.file_url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Swallow disk errors — DB record is already removed
      }

      return res.status(200).json({ message: 'Attachment deleted' });
    } catch (err) {
      next(err);
    }
  }
}
