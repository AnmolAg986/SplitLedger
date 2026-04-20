import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';

export class UploadController {
  static async uploadImage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Generate the URL to access the uploaded file
      // In a real app, this would be an S3 URL. Here, we construct a local URL.
      // We assume the app runs on a domain and we serve the /uploads folder.
      const url = `/uploads/${req.file.filename}`;

      return res.status(200).json({ url });
    } catch (err) {
      console.error('[UploadController] uploadImage error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
