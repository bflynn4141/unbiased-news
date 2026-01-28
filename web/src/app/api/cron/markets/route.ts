/**
 * GET /api/cron/markets
 *
 * Vercel Cron Job: Runs every 15 minutes to update prediction market data.
 * Fetches markets from Polymarket and matches them to existing stories.
 *
 * Authentication:
 * - Vercel automatically adds CRON_SECRET header for scheduled runs
 * - Can also be called manually with Authorization header
 */

import { NextResponse } from 'next/server';
import { kv, KEYS, isKVAvailable } from '@/lib/db';
import { getStories, saveStory } from '@/lib/db/stories';
import { fetchPoliticalMarkets } from '@/lib/markets/polymarket';
import { matchMarketsToStories } from '@/lib/markets/matching';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
    console.log('[Cron] Starting market update...');

    // Fetch active stories
    const stories = await getStories();
    if (stories.length === 0) {
      console.log('[Cron] No stories to match markets to');
      return NextResponse.json({
        success: true,
        message: 'No stories available',
        marketsFound: 0,
        storiesMatched: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch markets from Polymarket
    console.log('[Cron] Fetching markets from Polymarket...');
    const markets = await fetchPoliticalMarkets();
    console.log(`[Cron] Found ${markets.length} active markets`);

    if (markets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No markets found',
        marketsFound: 0,
        storiesMatched: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Match markets to stories
    console.log(`[Cron] Matching markets to ${stories.length} stories...`);
    const matches = matchMarketsToStories(stories, markets);

    // Update stories with matched markets
    let storiesUpdated = 0;
    for (const story of stories) {
      const storyMarkets = matches.get(story.id);
      if (storyMarkets && storyMarkets.length > 0) {
        // Only update if markets changed
        const currentMarketUrls = new Set(
          story.predictionMarkets?.map((m) => m.url) || []
        );
        const newMarketUrls = new Set(storyMarkets.map((m) => m.url));

        const hasChanges =
          currentMarketUrls.size !== newMarketUrls.size ||
          [...currentMarketUrls].some((url) => !newMarketUrls.has(url));

        if (hasChanges || !story.predictionMarkets) {
          story.predictionMarkets = storyMarkets;
          story.updatedAt = new Date().toISOString();
          await saveStory(story);
          storiesUpdated++;
        }
      }
    }

    // Update last market sync timestamp
    const hasKV = await isKVAvailable();
    if (hasKV) {
      await kv.set(KEYS.lastMarketSync, new Date().toISOString());
    }

    console.log(
      `[Cron] Market update complete: ${storiesUpdated} stories updated with markets`
    );

    return NextResponse.json({
      success: true,
      marketsFound: markets.length,
      storiesMatched: matches.size,
      storiesUpdated,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Market update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Market update failed',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
