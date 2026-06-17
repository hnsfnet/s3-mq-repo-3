import * as https from 'https';
import { SearchResult } from '../types';

export interface SearchOptions {
  query?: string;
  org?: string;
  limit?: number;
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      })
      .on('error', reject);
  });
}

export async function searchTemplates(options: SearchOptions): Promise<SearchResult[]> {
  const { query, org, limit = 10 } = options;

  let searchQuery = '';
  if (query) {
    searchQuery += encodeURIComponent(query);
  }
  if (org) {
    if (searchQuery) {
      searchQuery += '+';
    }
    searchQuery += `org:${encodeURIComponent(org)}`;
  }
  searchQuery += '+topic:template';

  const url = `https://api.github.com/search/repositories?q=${searchQuery}&per_page=${limit}&sort=stars&order=desc`;

  try {
    const response = await httpsGet(url);
    const data = JSON.parse(response);
    const items: any[] = data.items || [];

    return items.map((item: any) => ({
      name: item.name,
      fullName: item.full_name,
      description: item.description || 'No description available',
      stars: item.stargazers_count || 0,
      url: item.clone_url || item.html_url,
      defaultBranch: item.default_branch || 'main',
      language: item.language,
      topics: item.topics || []
    }));
  } catch (error: any) {
    throw new Error(`Failed to search templates: ${error.message}`);
  }
}

export async function searchTemplatesByOrg(
  org: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=${limit}&sort=updated`;

  try {
    const response = await httpsGet(url);
    const items: any[] = JSON.parse(response);

    return items
      .filter((item: any) => {
        const topics = item.topics || [];
        return topics.includes('template') || item.name.includes('template');
      })
      .map((item: any) => ({
        name: item.name,
        fullName: item.full_name,
        description: item.description || 'No description available',
        stars: item.stargazers_count || 0,
        url: item.clone_url || item.html_url,
        defaultBranch: item.default_branch || 'main',
        language: item.language,
        topics: item.topics || []
      }));
  } catch (error: any) {
    throw new Error(`Failed to search organization templates: ${error.message}`);
  }
}

export function formatSearchResults(results: SearchResult[]): string[] {
  return results.map((result, index) => {
    const stars = '★'.repeat(Math.min(Math.round(result.stars / 100), 5));
    const lang = result.language ? `[${result.language}]` : '';
    return `${index + 1}. ${result.fullName} ${lang} ${stars} (${result.stars} stars)\n   ${result.description}`;
  });
}
