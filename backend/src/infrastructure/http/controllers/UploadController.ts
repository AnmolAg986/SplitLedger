import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';

export class UploadController {
  static async uploadImage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const url = `/uploads/${req.file.filename}`;
      return res.status(200).json({ url });
    } catch (err) {
      console.error('[UploadController] uploadImage error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async uploadVoice(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const url = `/uploads/${req.file.filename}`;
      return res.status(200).json({ url, type: 'voice' });
    } catch (err) {
      console.error('[UploadController] uploadVoice error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
