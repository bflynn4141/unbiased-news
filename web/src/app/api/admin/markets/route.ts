/**
 * GET /api/admin/markets
 *
 * Manually test prediction market fetching and matching.
 * Shows available markets and how they match to current stories.
 *
 * Requires CRON_SECRET for authentication in production.
 */

import { NextResponse } from 'next/server';
import { getStories } from '@/lib/db/stories';
import { fetchPoliticalMarkets, searchMarkets } from '@/lib/markets/polymarket';
import { matchMarketsToStories, suggestSearchTerms } from '@/lib/markets/matching';

export async function GET(request: Request) {
  const startTime = Date.now();

  // Check authentication in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get URL params for search
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q');

    // Fetch markets
    let markets;
    if (searchQuery) {
      console.log(`Searching markets for: ${searchQuery}`);
      markets = await searchMarkets(searchQuery);
    } else {
      console.log('Fetching political markets...');
      markets = await fetchPoliticalMarkets();
    }

    // Get stories for matching
    const stories = await getStories();

    // Calculate matches
    const matches = matchMarketsToStories(stories, markets);

    // Build response with match details
    const matchDetails = stories.map((story) => ({
      storyId: story.id,
      title: story.title,
      suggestedSearchTerms: suggestSearchTerms(story),
      matchedMarkets: matches.get(story.id) || [],
    }));

    return NextResponse.json({
      success: true,
      marketsFound: markets.length,
      markets: markets.slice(0, 20).map((m) => ({
        question: m.question,
        probability: `${Math.round(m.probability * 100)}%`,
        volume: `$${m.volume.toLocaleString()}`,
        url: m.url,
        tags: m.tags,
      })),
      storiesAnalyzed: stories.length,
      storiesWithMatches: matches.size,
      matchDetails: matchDetails.filter((m) => m.matchedMarkets.length > 0),
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Market fetch failed',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
