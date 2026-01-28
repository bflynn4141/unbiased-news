/**
 * NewsAPI Client
 *
 * Fetches top headlines and political news from NewsAPI.
 * https://newsapi.org/docs/endpoints/top-headlines
 *
 * Free tier: 100 requests/day
 * - Fetching every hour = 24 requests/day (well within limits)
 */

import { Article, PoliticalLean } from '@/types/story';
import { getSourceBias, getLeanFromScore } from './sources';

const NEWSAPI_BASE = 'https://newsapi.org/v2';

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null; // Truncated to 200 chars
}

interface NewsAPIResponse {
  status: 'ok' | 'error';
  totalResults: number;
  articles: NewsAPIArticle[];
  code?: string;
  message?: string;
}

/**
 * Generate a stable ID from article URL (for deduplication)
 */
function generateArticleId(url: string): string {
  // Simple hash function for URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `art_${Math.abs(hash).toString(36)}`;
}

/**
 * Transform NewsAPI article to our Article type
 */
function transformArticle(apiArticle: NewsAPIArticle): Article {
  const sourceBias = getSourceBias(apiArticle.source.name);

  return {
    id: generateArticleId(apiArticle.url),
    title: apiArticle.title,
    description: apiArticle.description,
    content: apiArticle.content,
    url: apiArticle.url,
    urlToImage: apiArticle.urlToImage,
    publishedAt: apiArticle.publishedAt,
    source: apiArticle.source,
    biasScore: sourceBias.score,
    lean: sourceBias.lean as PoliticalLean,
    ingestedAt: new Date().toISOString(),
  };
}

/**
 * Fetch top headlines from NewsAPI
 * Categories: general, business, technology, science, health, sports, entertainment
 */
export async function fetchTopHeadlines(options: {
  category?: string;
  country?: string;
  pageSize?: number;
}): Promise<Article[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    console.warn('NEWSAPI_KEY not configured - skipping news fetch');
    return [];
  }

  const { category = 'general', country = 'us', pageSize = 20 } = options;

  const url = new URL(`${NEWSAPI_BASE}/top-headlines`);
  url.searchParams.set('country', country);
  url.searchParams.set('category', category);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('apiKey', apiKey);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'UnbiasedNews/1.0' },
      next: { revalidate: 0 }, // Don't cache in Next.js
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NewsAPI error (${response.status}):`, errorText);
      return [];
    }

    const data: NewsAPIResponse = await response.json();

    if (data.status !== 'ok') {
      console.error('NewsAPI returned error:', data.message);
      return [];
    }

    return data.articles
      .filter((article) => {
        // Filter out articles with missing essential fields
        if (!article.title || article.title === '[Removed]') return false;
        if (!article.url) return false;
        return true;
      })
      .map(transformArticle);
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error);
    return [];
  }
}

/**
 * Search articles by keyword/phrase
 * Useful for tracking specific developing stories
 */
export async function searchArticles(options: {
  query: string;
  from?: string; // ISO date
  to?: string; // ISO date
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  pageSize?: number;
}): Promise<Article[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    console.warn('NEWSAPI_KEY not configured - skipping search');
    return [];
  }

  const {
    query,
    from,
    to,
    sortBy = 'publishedAt',
    pageSize = 20,
  } = options;

  const url = new URL(`${NEWSAPI_BASE}/everything`);
  url.searchParams.set('q', query);
  url.searchParams.set('sortBy', sortBy);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('language', 'en');
  url.searchParams.set('apiKey', apiKey);

  if (from) url.searchParams.set('from', from);
  if (to) url.searchParams.set('to', to);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'UnbiasedNews/1.0' },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NewsAPI search error (${response.status}):`, errorText);
      return [];
    }

    const data: NewsAPIResponse = await response.json();

    if (data.status !== 'ok') {
      console.error('NewsAPI search returned error:', data.message);
      return [];
    }

    return data.articles
      .filter((article) => {
        if (!article.title || article.title === '[Removed]') return false;
        if (!article.url) return false;
        return true;
      })
      .map(transformArticle);
  } catch (error) {
    console.error('Error searching NewsAPI:', error);
    return [];
  }
}

/**
 * Fetch political news from multiple categories
 * Returns deduplicated articles across categories
 */
export async function fetchPoliticalNews(): Promise<Article[]> {
  const articleMap = new Map<string, Article>();

  // Fetch from multiple relevant categories
  const categories = ['general', 'business'];

  // Also search for political keywords
  const politicalQueries = [
    'congress OR senate OR "white house"',
    'democrat OR republican OR biden OR trump',
  ];

  // Parallel fetch from categories
  const categoryPromises = categories.map((category) =>
    fetchTopHeadlines({ category, pageSize: 30 })
  );

  // Parallel search for political content
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const searchPromises = politicalQueries.map((query) =>
    searchArticles({
      query,
      from: yesterday.toISOString().split('T')[0],
      pageSize: 20,
    })
  );

  // Wait for all fetches
  const results = await Promise.all([...categoryPromises, ...searchPromises]);

  // Deduplicate by article ID
  for (const articles of results) {
    for (const article of articles) {
      if (!articleMap.has(article.id)) {
        articleMap.set(article.id, article);
      }
    }
  }

  // Sort by published date (newest first)
  return Array.from(articleMap.values()).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
