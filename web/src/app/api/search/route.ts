/**
 * GET /api/search?q=query
 *
 * Search stories by keyword.
 *
 * Query params:
 * - q: Search query (required)
 * - limit: Max results (default: 20, max: 50)
 */

import { NextResponse } from 'next/server';
import { searchStories } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limitParam = url.searchParams.get('limit');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing search query. Use ?q=yourquery' },
      { status: 400 }
    );
  }

  const limit = Math.min(
    Math.max(1, parseInt(limitParam || '20', 10)),
    50
  );

  try {
    const startTime = Date.now();
    const stories = await searchStories(query.trim(), limit);

    return NextResponse.json({
      query: query.trim(),
      count: stories.length,
      stories: stories.map(story => ({
        id: story.id,
        title: story.title,
        summary: story.summary,
        velocity: story.velocity,
        sourceCount: story.sources.length,
        updatedAt: story.updatedAt,
        coverageBalance: story.coverageBalance,
      })),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
