import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import puppeteer from 'puppeteer';
import { AnalyticsService } from '../../../application/services/AnalyticsService';
import { AppError } from '../../../shared/errors/AppError';

export class AnalyticsController {
  static async getPersonalAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const data = await AnalyticsService.getPersonalAnalytics(userId);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getGroupAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.id;
      if (!groupId) throw new AppError(400, 'BAD_REQUEST', 'Group ID is required');

      const data = await AnalyticsService.getGroupAnalytics(groupId as string);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getAIInsights(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const insights = await AnalyticsService.getAIInsights(userId);
      return res.status(200).json({ insights });
    } catch (err) {
      next(err);
    }
  }

  static async exportPersonalAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const format = req.query.format as string;
      const from = req.query.from as string;
      const to = req.query.to as string;

      const data = await AnalyticsService.exportPersonalExpenses(userId, from, to);

      if (format === 'csv') {
        const header = ['ID', 'Description', 'Total Amount', 'My Share', 'Category', 'Date', 'Paid By'];
        const rows = data.map((r: any) => [
          r.id,
          `"${(r.description || '').replace(/"/g, '""')}"`,
          r.total_amount,
          r.my_share,
          `"${r.category || 'General'}"`,
          new Date(r.created_at).toISOString(),
          r.paid_by === userId ? 'Me' : 'Other'
        ]);
        const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="personal_expenses.csv"');
        return res.status(200).send(csv);
      }

      throw new AppError(400, 'BAD_REQUEST', 'Unsupported format');
    } catch (err) {
      next(err);
    }
  }

  static async exportGroupAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.id;
      if (!groupId) throw new AppError(400, 'BAD_REQUEST', 'Group ID is required');

      const format = req.query.format as string;
      const data = await AnalyticsService.exportGroupExpenses(groupId as string);

      if (format === 'csv') {
        const header = ['ID', 'Description', 'Amount', 'Category', 'Date', 'Paid By'];
        const rows = data.map((r: any) => [
          r.id,
          `"${(r.description || '').replace(/"/g, '""')}"`,
          r.amount,
          `"${r.category || 'General'}"`,
          new Date(r.created_at).toISOString(),
          `"${(r.paid_by_name || '').replace(/"/g, '""')}"`
        ]);
        const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="group_${groupId}_expenses.csv"`);
        return res.status(200).send(csv);
      }

      if (format === 'pdf') {
        const html = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
              </style>
            </head>
            <body>
              <h1>Group Expenses Report</h1>
              <p>Generated on ${new Date().toLocaleString()}</p>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Paid By</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map((r: any) => `
                    <tr>
                      <td>${new Date(r.created_at).toLocaleDateString()}</td>
                      <td>${r.description}</td>
                      <td>${r.category || 'General'}</td>
                      <td>${r.amount}</td>
                      <td>${r.paid_by_name}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `;

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="group_${groupId}_report.pdf"`);
        return res.status(200).send(pdfBuffer);
      }

      throw new AppError(400, 'BAD_REQUEST', 'Unsupported format');
    } catch (err) {
      next(err);
    }
  }
}
