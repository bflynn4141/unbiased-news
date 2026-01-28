/**
 * GET /api/cron/cluster
 *
 * Vercel Cron Job: Runs every hour (5 min after ingest) to cluster articles into stories.
 *
 * Authentication:
 * - Vercel automatically adds CRON_SECRET header for scheduled runs
 * - Can also be called manually with Authorization header
 */

import { NextResponse } from 'next/server';
import { getUnclusteredArticles, markArticlesClustered } from '@/lib/db/articles';
import { saveStories, getStoryCount } from '@/lib/db/stories';
import { clusterIntoStories } from '@/lib/clustering/cluster';
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

  try {
    // Get unclustered articles
    const unclustered = await getUnclusteredArticles();

    if (unclustered.length === 0) {
      console.log('[Cron] No unclustered articles to process');
      return NextResponse.json({
        success: true,
        message: 'No unclustered articles',
        articlesProcessed: 0,
        storiesCreated: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Cron] Clustering ${unclustered.length} articles...`);

    // Run clustering algorithm (now async with Claude AI analysis)
    const { stories, clusteredArticleIds, unclusteredIds } =
      await clusterIntoStories(unclustered);

    if (stories.length === 0) {
      console.log('[Cron] No clusters formed');
      return NextResponse.json({
        success: true,
        message: 'No clusters formed (articles too dissimilar)',
        articlesProcessed: unclustered.length,
        storiesCreated: 0,
        remainingUnclustered: unclusteredIds.length,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Save new stories
    console.log(`[Cron] Saving ${stories.length} stories...`);
    await saveStories(stories);

    // Mark articles as clustered
    for (const [storyId, articleIds] of clusteredArticleIds) {
      await markArticlesClustered(articleIds, storyId);
    }

    // Update last cluster timestamp
    const hasKV = await isKVAvailable();
    if (hasKV) {
      await kv.set(KEYS.lastCluster, new Date().toISOString());
    }

    const totalStories = await getStoryCount();

    console.log(`[Cron] Clustering complete: ${stories.length} stories created`);

    return NextResponse.json({
      success: true,
      articlesProcessed: unclustered.length,
      articlesClustered: unclustered.length - unclusteredIds.length,
      storiesCreated: stories.length,
      remainingUnclustered: unclusteredIds.length,
      totalStories,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Clustering error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Clustering failed',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
