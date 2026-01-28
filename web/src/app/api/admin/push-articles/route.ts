/**
 * POST /api/admin/push-articles
 *
 * Accepts articles pushed from external sources (like Claude Code with x402).
 * This allows fetching news via x402 payments from Claude Code and pushing
 * the results to the app for storage and processing.
 *
 * Usage from Claude Code:
 * 1. Use x402 MCP tools to fetch news (e.g., mcp__x402__fetch with Serper)
 * 2. POST the results to this endpoint
 *
 * Requires CRON_SECRET for authentication.
 */

import { NextResponse } from 'next/server';
import { Article } from '@/types/story';
import { saveArticles, getUnclusteredCount } from '@/lib/db/articles';
import { getSourceBias } from '@/lib/ingest/sources';
import { kv, KEYS, isKVAvailable } from '@/lib/db';

interface SerperNewsItem {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source: string;
  imageUrl?: string;
}

interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  text?: string;
  summary?: string;
  highlights?: string[];
}

interface PushArticlesRequest {
  source: 'serper' | 'exa' | 'raw';
  data: SerperNewsItem[] | ExaSearchResult[] | Article[];
}

/**
 * Generate article ID from URL
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
 * Transform Serper news to Article
 */
function transformSerperArticle(item: SerperNewsItem): Article {
  const sourceBias = getSourceBias(item.source);
  return {
    id: generateArticleId(item.link),
    title: item.title,
    description: item.snippet,
    content: null,
    url: item.link,
    urlToImage: item.imageUrl || null,
    publishedAt: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
    source: { id: null, name: item.source },
    biasScore: sourceBias.score,
    lean: sourceBias.lean,
    ingestedAt: new Date().toISOString(),
  };
}

/**
 * Transform Exa result to Article
 */
function transformExaArticle(item: ExaSearchResult): Article {
  const urlObj = new URL(item.url);
  const sourceName = urlObj.hostname.replace('www.', '');
  const sourceBias = getSourceBias(sourceName);

  return {
    id: generateArticleId(item.url),
    title: item.title,
    description: item.summary || item.highlights?.[0] || item.text?.slice(0, 200) || null,
    content: item.text || null,
    url: item.url,
    urlToImage: null,
    publishedAt: item.publishedDate || new Date().toISOString(),
    source: { id: null, name: sourceName },
    biasScore: sourceBias.score,
    lean: sourceBias.lean,
    ingestedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // Check authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: PushArticlesRequest = await request.json();

    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'Invalid request: data array required' },
        { status: 400 }
      );
    }

    // Transform based on source
    let articles: Article[];

    switch (body.source) {
      case 'serper':
        articles = (body.data as SerperNewsItem[]).map(transformSerperArticle);
        break;
      case 'exa':
        articles = (body.data as ExaSearchResult[]).map(transformExaArticle);
        break;
      case 'raw':
        articles = body.data as Article[];
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid source: must be serper, exa, or raw' },
          { status: 400 }
        );
    }

    // Filter invalid articles
    articles = articles.filter((a) => a.title && a.url);

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No valid articles to save',
        received: body.data.length,
        saved: 0,
      });
    }

    // Save to database
    const result = await saveArticles(articles);

    // Update last ingest timestamp
    const hasKV = await isKVAvailable();
    if (hasKV) {
      await kv.set(KEYS.lastIngest, new Date().toISOString());
    }

    const unclustered = await getUnclusteredCount();

    return NextResponse.json({
      success: true,
      message: `Saved ${result.saved} articles from ${body.source}`,
      received: body.data.length,
      saved: result.saved,
      duplicates: result.duplicates,
      unclustered,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error pushing articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to push articles',
      },
      { status: 500 }
    );
  }
}
