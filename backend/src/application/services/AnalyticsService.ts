import { AnalyticsRepository } from '../../infrastructure/persistence/AnalyticsRepository';
import { safeRedisGet, safeRedisSetEx } from '../../config/redis';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

export class AnalyticsService {
  static async getPersonalAnalytics(userId: string) {
    return await AnalyticsRepository.getPersonalAnalytics(userId);
  }

  static async getGroupAnalytics(groupId: string) {
    return await AnalyticsRepository.getGroupAnalytics(groupId);
  }

  static async exportPersonalExpenses(userId: string, from?: string, to?: string) {
    return await AnalyticsRepository.exportPersonalExpenses(userId, from, to);
  }

  static async exportGroupExpenses(groupId: string) {
    return await AnalyticsRepository.exportGroupExpenses(groupId);
  }

  static async getAIInsights(userId: string): Promise<string[]> {
    const cacheKey = `insights:${userId}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Fetch user's personal analytics for context
      const analytics = await AnalyticsRepository.getPersonalAnalytics(userId);
      const expenseData = JSON.stringify({
        totalSpentLast12Months: analytics.monthlySpend,
        categories: analytics.categoryBreakdown,
        settleRate: analytics.settleRate
      });

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key') {
        // Fallback mock logic if no API key is provided
        const settlePercentage = Math.round((analytics.settleRate.settled / Math.max(analytics.settleRate.total, 1)) * 100);
        const mockInsights = [
          `You spend most of your money on ${analytics.categoryBreakdown[0]?.category || 'General'}!`,
          `Your settle rate is currently ${settlePercentage}%. ${settlePercentage < 50 ? 'Try to settle debts sooner.' : 'Great job keeping up!'}`
        ];
        if (analytics.monthlySpend.length > 0) {
          mockInsights.push(`Your highest spending month was ${analytics.monthlySpend.reduce((a: any, b: any) => parseFloat(a.amount) > parseFloat(b.amount) ? a : b).month}.`);
        }
        await safeRedisSetEx(cacheKey, 86400, JSON.stringify(mockInsights));
        return mockInsights;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are an insightful financial assistant. Given some JSON data about a user's expenses, generate 3-5 short, personalized insights (one sentence each) in an array format (JSON string array)." },
          { role: 'user', content: expenseData }
        ]
      });

      const content = response.choices[0].message.content || '[]';
      let insights: string[] = [];
      try {
        insights = JSON.parse(content);
        if (!Array.isArray(insights)) insights = [content];
      } catch {
        insights = content.split('\n').filter((l: string) => l.trim().length > 0);
      }

      await safeRedisSetEx(cacheKey, 86400, JSON.stringify(insights));
      return insights;
    } catch (err) {
      console.error('Failed to generate AI insights:', err);
      return ['Could not generate insights at this time.'];
    }
  }
}
