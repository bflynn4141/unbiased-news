/**
 * POST /api/admin/cluster
 *
 * Manually triggers article clustering.
 * Groups unclustered articles into stories using TF-IDF similarity.
 *
 * Requires CRON_SECRET for authentication in production.
 */

import { NextResponse } from 'next/server';
import { getUnclusteredArticles, markArticlesClustered } from '@/lib/db/articles';
import { saveStories, getStoryCount } from '@/lib/db/stories';
import { clusterIntoStories } from '@/lib/clustering/cluster';
import { kv, KEYS, isKVAvailable } from '@/lib/db';

export async function POST(request: Request) {
  const startTime = Date.now();

  // Check authentication in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get unclustered articles
    const unclustered = await getUnclusteredArticles();

    if (unclustered.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unclustered articles to process',
        articlesProcessed: 0,
        storiesCreated: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`Clustering ${unclustered.length} articles...`);

    // Run clustering algorithm (now async with Claude AI analysis)
    const { stories, clusteredArticleIds, unclusteredIds } =
      await clusterIntoStories(unclustered);

    if (stories.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clusters formed (articles too dissimilar)',
        articlesProcessed: unclustered.length,
        storiesCreated: 0,
        remainingUnclustered: unclusteredIds.length,
        duration: Date.now() - startTime,
      });
    }

    // Save new stories
    console.log(`Saving ${stories.length} new stories...`);
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

    // Get total story count
    const totalStories = await getStoryCount();

    return NextResponse.json({
      success: true,
      message: `Created ${stories.length} stories from ${unclustered.length - unclusteredIds.length} articles`,
      articlesProcessed: unclustered.length,
      articlesClustered: unclustered.length - unclusteredIds.length,
      storiesCreated: stories.length,
      remainingUnclustered: unclusteredIds.length,
      totalStories,
      newStoryIds: stories.map((s) => s.id),
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error during clustering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Clustering failed',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET(request: Request) {
  return POST(request);
}
