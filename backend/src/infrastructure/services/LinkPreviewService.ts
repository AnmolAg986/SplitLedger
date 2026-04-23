import ogs from 'open-graph-scraper';
import { pool } from '../../config/db';

export class LinkPreviewService {
  /** Matches the first HTTP/HTTPS URL in a text string */
  static extractUrl(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  /** Gets or fetches a link preview for the given text. Returns preview ID if successful. */
  static async getOrCreatePreview(content: string): Promise<string | null> {
    const url = this.extractUrl(content);
    if (!url) return null;

    try {
      // 1. Check if we already have it
      const cached = await pool.query(`SELECT id FROM message_link_previews WHERE url = $1`, [url]);
      if (cached.rows.length > 0) {
        return cached.rows[0].id;
      }

      // 2. Fetch using open-graph-scraper
      const options = { url, timeout: 5000 };
      const { result, error } = await ogs(options);

      if (error) {
        return null;
      }

      const title = result.ogTitle || null;
      const description = result.ogDescription || null;
      const imageUrl = (result.ogImage && result.ogImage.length > 0) ? result.ogImage[0].url : null;
      const siteName = result.ogSiteName || null;

      // Only save if we got something useful
      if (!title && !description && !imageUrl) {
        return null;
      }

      // 3. Save to database
      const insert = await pool.query(
        `INSERT INTO message_link_previews (url, title, description, image_url, site_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (url) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           site_name = EXCLUDED.site_name
         RETURNING id`,
        [url, title, description, imageUrl, siteName]
      );

      return insert.rows[0].id;
    } catch (err) {
      console.error('[LinkPreviewService] Error fetching preview:', err);
      return null;
    }
  }
}
