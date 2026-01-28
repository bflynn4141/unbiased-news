/**
 * POST /api/admin/index-search
 *
 * Build or rebuild the search index for all stories.
 *
 * Query params:
 * - rebuild: Set to "true" to clear and rebuild index
 */

import { NextResponse } from 'next/server';
import { indexAllStories, clearSearchIndex } from '@/lib/search';

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const rebuild = url.searchParams.get('rebuild') === 'true';

    const startTime = Date.now();

    if (rebuild) {
      console.log('[Index] Clearing existing search index...');
      await clearSearchIndex();
    }

    console.log('[Index] Indexing all stories...');
    const result = await indexAllStories();

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      skipped: result.skipped,
      rebuild,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Index] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Indexing failed',
      },
      { status: 500 }
    );
  }
}
