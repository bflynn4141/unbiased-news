/**
 * GET /api/stories/:id
 *
 * Returns a single story by ID.
 * Returns 404 if story not found.
 */

import { NextResponse } from 'next/server';
import { getStoryById, getStorySummary } from '@/lib/db/stories';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const story = await getStoryById(id);

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Also try to fetch cached summary if available
    const summary = await getStorySummary(id);

    return NextResponse.json({
      story,
      summary, // Will be null if not cached
      meta: {
        fetchedAt: new Date().toISOString(),
        hasCachedSummary: summary !== null,
      },
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}
