/**
 * POST /api/admin/ingest
 *
 * Manually triggers news ingestion.
 * Uses RSS feeds by default (no API key needed).
 * Can use NewsAPI if configured and requested.
 *
 * Query params:
 * - source=rss (default) or source=newsapi
 *
 * Requires CRON_SECRET for authentication in production.
 */

import { NextResponse } from 'next/server';
import { fetchPoliticalNewsRSS, checkRSSHealth } from '@/lib/ingest/rss';
import { fetchPoliticalNews } from '@/lib/ingest/newsapi';
import { saveArticles, getUnclusteredCount } from '@/lib/db/articles';
import { kv, KEYS, isKVAvailable } from '@/lib/db';

export async function POST(request: Request) {
  const startTime = Date.now();

  // Check authentication in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check which source to use
  const { searchParams } = new URL(request.url);
  const sourceParam = searchParams.get('source') || 'rss';

  try {
    let articles;
    let source: string;

    if (sourceParam === 'newsapi') {
      if (!process.env.NEWSAPI_KEY) {
        return NextResponse.json(
          {
            success: false,
            error: 'NEWSAPI_KEY not configured. Use ?source=rss instead (no key needed)',
          },
          { status: 400 }
        );
      }
      source = 'newsapi';
      console.log('Fetching articles from NewsAPI...');
      articles = await fetchPoliticalNews();
    } else {
      source = 'rss';
      console.log('Fetching articles from RSS feeds (no API key needed)...');
      articles = await fetchPoliticalNewsRSS();
    }

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        source,
        message: 'No new articles found',
        fetched: 0,
        saved: 0,
        duration: Date.now() - startTime,
      });
    }

    // Save articles to database
    console.log(`Saving ${articles.length} articles from ${source}...`);
    const result = await saveArticles(articles);

    // Update last ingest timestamp
    const hasKV = await isKVAvailable();
    if (hasKV) {
      await kv.set(KEYS.lastIngest, new Date().toISOString());
    }

    // Get current unclustered count
    const unclustered = await getUnclusteredCount();

    return NextResponse.json({
      success: true,
      source,
      message: `Ingested ${result.saved} new articles (${result.duplicates} duplicates skipped)`,
      fetched: articles.length,
      saved: result.saved,
      duplicates: result.duplicates,
      unclustered,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error during ingestion:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ingestion failed',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// GET for easy testing + health check
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Health check for RSS feeds
  if (action === 'health') {
    const health = await checkRSSHealth();
    return NextResponse.json({
      rssFeeds: {
        healthy: health.healthy.length,
        failed: health.failed.length,
        healthyFeeds: health.healthy,
        failedFeeds: health.failed,
      },
      newsapi: process.env.NEWSAPI_KEY ? 'configured' : 'not configured',
    });
  }

  // Otherwise trigger ingest
  return POST(request);
}
