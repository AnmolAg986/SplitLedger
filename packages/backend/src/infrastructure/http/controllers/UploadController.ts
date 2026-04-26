import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class UploadController {
  static async uploadImage(req: AuthenticatedRequest, res: Response) {
    try {
      const { default: sharp } = await import('sharp');

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const originalPath = req.file.path;
      const parsedPath = path.parse(originalPath);
      const webpFilename = `${parsedPath.name}.webp`;
      const webpPath = path.join(parsedPath.dir, webpFilename);

      await sharp(originalPath)
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(webpPath);

      fs.unlinkSync(originalPath);

      const url = `/uploads/${webpFilename}`;
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
