/**
 * GET /api/cron/pipeline
 *
 * Unified cron job that runs the full pipeline:
 * 1. Ingest articles from RSS feeds
 * 2. Cluster articles into stories
 * 3. Update prediction markets
 *
 * This is designed for Vercel Hobby plan (1 daily cron job).
 * Runs at 8 AM UTC daily.
 */

import { NextResponse } from 'next/server';
import { fetchPoliticalNewsRSS } from '@/lib/ingest/rss';
import { saveArticles, getUnclusteredArticles, markArticlesClustered } from '@/lib/db/articles';
import { getStories, saveStory } from '@/lib/db/stories';
import { clusterIntoStories } from '@/lib/clustering/cluster';
import { fetchPoliticalMarkets } from '@/lib/markets/polymarket';
import { matchMarketsToStories } from '@/lib/markets/matching';
import { kv, KEYS, isKVAvailable } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    vercelCron === '1' ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    !cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ========== PHASE 1: INGEST ==========
    console.log('[Pipeline] Phase 1: Ingesting articles...');
    const articles = await fetchPoliticalNewsRSS();

    if (articles.length > 0) {
      const ingestResult = await saveArticles(articles);
      results.ingest = {
        fetched: articles.length,
        saved: ingestResult.saved,
        duplicates: ingestResult.duplicates,
      };
      console.log(`[Pipeline] Ingested ${ingestResult.saved} articles`);
    } else {
      results.ingest = { fetched: 0, saved: 0, duplicates: 0 };
    }

    // ========== PHASE 2: CLUSTER ==========
    console.log('[Pipeline] Phase 2: Clustering articles...');
    const unclustered = await getUnclusteredArticles();

    if (unclustered.length >= 3) {
      const newStories = await clusterIntoStories(unclustered);

      // Save new stories
      for (const story of newStories) {
        await saveStory(story);
      }

      // Mark articles as clustered
      const clusteredIds = unclustered
        .filter(a => newStories.some(s => s.articles.some(sa => sa.id === a.id)))
        .map(a => a.id);

      if (clusteredIds.length > 0) {
        await markArticlesClustered(clusteredIds);
      }

      results.cluster = {
        articlesProcessed: unclustered.length,
        storiesCreated: newStories.length,
      };
      console.log(`[Pipeline] Created ${newStories.length} stories from ${unclustered.length} articles`);
    } else {
      results.cluster = {
        articlesProcessed: unclustered.length,
        storiesCreated: 0,
        note: 'Need at least 3 articles to cluster',
      };
    }

    // ========== PHASE 3: MARKETS ==========
    console.log('[Pipeline] Phase 3: Updating prediction markets...');
    const stories = await getStories();

    if (stories.length > 0) {
      const markets = await fetchPoliticalMarkets();

      if (markets.length > 0) {
        const matches = matchMarketsToStories(stories, markets);
        let storiesUpdated = 0;

        for (const story of stories) {
          const storyMarkets = matches.get(story.id);
          if (storyMarkets && storyMarkets.length > 0) {
            story.predictionMarkets = storyMarkets;
            story.updatedAt = new Date().toISOString();
            await saveStory(story);
            storiesUpdated++;
          }
        }

        results.markets = {
          marketsFound: markets.length,
          storiesMatched: matches.size,
          storiesUpdated,
        };
        console.log(`[Pipeline] Updated ${storiesUpdated} stories with markets`);
      } else {
        results.markets = { marketsFound: 0, storiesMatched: 0, storiesUpdated: 0 };
      }
    } else {
      results.markets = { note: 'No stories to match markets to' };
    }

    // Update timestamps
    const hasKV = await isKVAvailable();
    if (hasKV) {
      const now = new Date().toISOString();
      await kv.set(KEYS.lastIngest, now);
      await kv.set(KEYS.lastCluster, now);
      await kv.set(KEYS.lastMarketSync, now);
    }

    return NextResponse.json({
      success: true,
      pipeline: results,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Pipeline] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline failed',
        partialResults: results,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
