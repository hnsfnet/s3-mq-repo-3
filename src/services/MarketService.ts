import { SearchResult } from '../types';
import { SearchError, NetworkError } from '../errors';
import { searchTemplates, searchTemplatesByOrg, formatSearchResults } from '../utils/market';

export interface SearchOptions {
  query?: string;
  org?: string;
  limit?: number;
}

export class MarketService {
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, org, limit = 10 } = options;

    try {
      let results: SearchResult[];

      if (org && !query) {
        results = await searchTemplatesByOrg(org, limit);
      } else {
        results = await searchTemplates({ query, org, limit });
      }

      return results;
    } catch (error: any) {
      if (error.message?.includes('HTTP') || error.message?.includes('network')) {
        throw new NetworkError('https://api.github.com', error.message || 'Network error');
      }
      throw new SearchError(query || org || '', error.message || 'Search failed');
    }
  }

  formatResults(results: SearchResult[]): string[] {
    return formatSearchResults(results);
  }
}
