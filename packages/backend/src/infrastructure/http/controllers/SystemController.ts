import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export class SystemController {
  static async getChangelog(req: Request, res: Response) {
    try {
      const changelogPath = path.join(__dirname, '../../../../../CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) {
        return res.status(404).json({ error: 'Changelog not found' });
      }

      const content = fs.readFileSync(changelogPath, 'utf8');
      
      // Parse the latest version from the first matching heading, e.g., "## [v1.0.0] - 2026-05-30"
      const versionMatch = content.match(/## \[?(v\d+\.\d+\.\d+)\]?/);
      const latestVersion = versionMatch ? versionMatch[1] : 'v0.0.0';

      return res.status(200).json({
        latestVersion,
        content
      });
    } catch (err) {
      console.error('[SystemController] getChangelog error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
