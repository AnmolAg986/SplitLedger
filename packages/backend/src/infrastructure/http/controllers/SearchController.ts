import { Request, Response } from 'express';
import { SearchService } from '../../../application/services/SearchService';

export class SearchController {
  static async search(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const query = req.query.q as string;

      if (!query) {
        return res.json([]);
      }

      const results = await SearchService.globalSearch(userId, query);
      return res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({ error: 'Internal server error during search' });
    }
  }
}
