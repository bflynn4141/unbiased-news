/**
 * GET /api/stories
 *
 * Returns all active stories sorted by velocity score (highest first).
 * Falls back to mock data if Vercel KV is not configured.
 */

import { NextResponse } from 'next/server';
import { getStories, getStoryCount } from '@/lib/db/stories';

export async function GET() {
  try {
    const stories = await getStories();
    const count = await getStoryCount();

    return NextResponse.json({
      stories,
      meta: {
        count,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}
