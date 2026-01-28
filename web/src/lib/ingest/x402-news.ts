/**
 * x402 News Client
 *
 * Fetches news using x402-enabled APIs (pay-per-request, no API keys needed).
 * Uses Serper for Google News and Exa for semantic web search.
 *
 * Pricing:
 * - Serper News: $0.04/request
 * - Exa Search: $0.01/request
 */

import { Article, PoliticalLean } from '@/types/story';
import { getSourceBias } from './sources';

const ENRICHX402_BASE = 'https://enrichx402.com';

/**
 * Serper News API response
 */
interface SerperNewsResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
}

interface SerperNewsResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
    type: string;
  };
  news: SerperNewsResult[];
}

/**
 * Exa Search API response
 */
interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score: number;
  text?: string;
  highlights?: string[];
  summary?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
  searchType: string;
}

/**
 * Generate a stable ID from article URL
 */
function generateArticleId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `art_${Math.abs(hash).toString(36)}`;
}

/**
 * Make an x402 payment request
 * The x402 MCP tools handle payment automatically
 */
async function x402Fetch<T>(url: string, body: object): Promise<T | null> {
  try {
    // For server-side, we need to make the request and handle 402 responses
    // In production, this would use the x402 payment flow
    // For now, we'll make direct requests (works if you have credits/session)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UnbiasedNews/1.0',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 402) {
      // Payment required - in a real implementation, this would trigger payment
      console.log('x402 payment required for:', url);
      console.log('Use the x402 MCP tools to make paid requests');
      return null;
    }

    if (!response.ok) {
      console.error(`x402 request failed (${response.status}):`, await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('x402 fetch error:', error);
    return null;
  }
}

/**
 * Transform Serper news result to Article
 */
function serperToArticle(result: SerperNewsResult): Article {
  const sourceBias = getSourceBias(result.source);

  return {
    id: generateArticleId(result.link),
    title: result.title,
    description: result.snippet,
    content: null,
    url: result.link,
    urlToImage: result.imageUrl || null,
    publishedAt: result.date ? new Date(result.date).toISOString() : new Date().toISOString(),
    source: {
      id: null,
      name: result.source,
    },
    biasScore: sourceBias.score,
    lean: sourceBias.lean as PoliticalLean,
    ingestedAt: new Date().toISOString(),
  };
}

/**
 * Transform Exa search result to Article
 */
function exaToArticle(result: ExaSearchResult): Article {
  // Extract source name from URL
  const urlObj = new URL(result.url);
  const sourceName = urlObj.hostname.replace('www.', '').split('.')[0];
  const sourceBias = getSourceBias(sourceName);

  return {
    id: generateArticleId(result.url),
    title: result.title,
    description: result.summary || result.highlights?.[0] || result.text?.slice(0, 200) || null,
    content: result.text || null,
    url: result.url,
    urlToImage: null,
    publishedAt: result.publishedDate || new Date().toISOString(),
    source: {
      id: null,
      name: sourceName.charAt(0).toUpperCase() + sourceName.slice(1),
    },
    biasScore: sourceBias.score,
    lean: sourceBias.lean as PoliticalLean,
    ingestedAt: new Date().toISOString(),
  };
}

/**
 * Fetch news using Serper (Google News)
 * Cost: $0.04 per request
 */
export async function fetchSerperNews(query: string, num: number = 10): Promise<Article[]> {
  const data = await x402Fetch<SerperNewsResponse>(
    `${ENRICHX402_BASE}/api/serper/news`,
    {
      q: query,
      num,
      gl: 'us',
      hl: 'en',
    }
  );

  if (!data?.news) return [];

  return data.news
    .filter((item) => item.title && item.link)
    .map(serperToArticle);
}

/**
 * Fetch news using Exa (semantic search)
 * Cost: $0.01 per request
 */
export async function fetchExaNews(query: string, numResults: number = 10): Promise<Article[]> {
  const data = await x402Fetch<ExaSearchResponse>(
    `${ENRICHX402_BASE}/api/exa/search`,
    {
      query,
      numResults,
      category: 'news',
      contents: {
        text: { maxCharacters: 500 },
        summary: { query },
      },
    }
  );

  if (!data?.results) return [];

  return data.results
    .filter((item) => item.title && item.url)
    .map(exaToArticle);
}

/**
 * Fetch political news from multiple sources
 * Uses Exa for cost efficiency ($0.01 vs $0.04)
 */
export async function fetchPoliticalNewsX402(): Promise<Article[]> {
  const articleMap = new Map<string, Article>();

  // Political search queries
  const queries = [
    'US politics congress senate breaking news',
    'Trump Biden administration policy news',
    'government shutdown federal budget news',
  ];

  // Fetch in parallel (3 requests = $0.03 total with Exa)
  const results = await Promise.all(
    queries.map((q) => fetchExaNews(q, 15))
  );

  // Deduplicate
  for (const articles of results) {
    for (const article of articles) {
      if (!articleMap.has(article.id)) {
        articleMap.set(article.id, article);
      }
    }
  }

  // Sort by date
  return Array.from(articleMap.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
