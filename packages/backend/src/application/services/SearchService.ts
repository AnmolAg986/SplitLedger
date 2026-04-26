import { SearchRepository, SearchResult } from '../../infrastructure/persistence/SearchRepository';

export class SearchService {
  static async globalSearch(userId: string, query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Run all searches concurrently
    const [friends, groups, expenses, messages] = await Promise.all([
      SearchRepository.searchFriends(userId, trimmedQuery),
      SearchRepository.searchGroups(userId, trimmedQuery),
      SearchRepository.searchExpenses(userId, trimmedQuery),
      SearchRepository.searchMessages(userId, trimmedQuery)
    ]);

    // Combine all results
    const combined = [...friends, ...groups, ...expenses, ...messages];

    return combined;
  }
}
