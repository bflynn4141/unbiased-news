/**
 * GET /api/cron/ingest
 *
 * Vercel Cron Job: Runs every hour to ingest new articles.
 *
 * Sources (in priority order):
 * 1. RSS feeds (default, no API key needed)
 * 2. NewsAPI (if NEWSAPI_KEY is configured)
 *
 * Authentication:
 * - Vercel automatically adds CRON_SECRET header for scheduled runs
 * - Can also be called manually with Authorization header
 */

import { NextResponse } from 'next/server';
import { fetchPoliticalNewsRSS } from '@/lib/ingest/rss';
import { fetchPoliticalNews } from '@/lib/ingest/newsapi';
import { saveArticles, getUnclusteredCount } from '@/lib/db/articles';
import { kv, KEYS, isKVAvailable } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for cron jobs

export async function GET(request: Request) {
  const startTime = Date.now();

  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    vercelCron === '1' ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    !cronSecret;

  if (!isAuthorized) {
    console.log('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check which source to use via query param (default: auto)
  const { searchParams } = new URL(request.url);
  const sourceParam = searchParams.get('source'); // 'rss', 'newsapi', or null (auto)

  try {
    console.log('[Cron] Starting article ingestion...');

    let articles;
    let source: string;

    // Determine source
    if (sourceParam === 'newsapi' && process.env.NEWSAPI_KEY) {
      // Explicit NewsAPI request
      source = 'newsapi';
      console.log('[Cron] Using NewsAPI (explicit)');
      articles = await fetchPoliticalNews();
    } else if (sourceParam === 'rss' || !process.env.NEWSAPI_KEY) {
      // RSS: either explicit or fallback when no API key
      source = 'rss';
      console.log('[Cron] Using RSS feeds (no API key needed)');
      articles = await fetchPoliticalNewsRSS();
    } else {
      // Auto mode with API key: prefer NewsAPI but fallback to RSS
      try {
        source = 'newsapi';
        console.log('[Cron] Using NewsAPI (auto)');
        articles = await fetchPoliticalNews();
      } catch (apiError) {
        console.warn('[Cron] NewsAPI failed, falling back to RSS:', apiError);
        source = 'rss';
        articles = await fetchPoliticalNewsRSS();
      }
    }

    if (articles.length === 0) {
      console.log('[Cron] No articles fetched');
      return NextResponse.json({
        success: true,
        source,
        message: 'No new articles found',
        fetched: 0,
        saved: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Save articles to database
    console.log(`[Cron] Saving ${articles.length} articles from ${source}...`);
    const result = await saveArticles(articles);

    // Update last ingest timestamp
    const hasKV = await isKVAvailable();
    if (hasKV) {
      await kv.set(KEYS.lastIngest, new Date().toISOString());
    }

    const unclustered = await getUnclusteredCount();

    console.log(
      `[Cron] Ingestion complete: ${result.saved} saved, ${result.duplicates} duplicates`
    );

    return NextResponse.json({
      success: true,
      source,
      fetched: articles.length,
      saved: result.saved,
      duplicates: result.duplicates,
      unclustered,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Ingestion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ingestion failed',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
