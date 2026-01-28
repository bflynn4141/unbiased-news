/**
 * POST /api/admin/reanalyze
 *
 * Re-analyzes existing stories with Claude AI.
 * Useful for updating stories created before Claude was integrated.
 *
 * Query params:
 * - limit: Max stories to re-analyze (default: 5)
 * - storyId: Specific story to re-analyze (optional)
 */

import { NextResponse } from 'next/server';
import { getStories, saveStory } from '@/lib/db/stories';
import { analyzeStoryCluster, isClaudeAvailable } from '@/lib/analysis/claude';
import { Article } from '@/types/story';

export const maxDuration = 60; // Allow longer execution for multiple analyses

export async function POST(request: Request) {
  const startTime = Date.now();

  // Check authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Claude availability
  if (!isClaudeAvailable()) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const storyId = url.searchParams.get('storyId');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    // Get stories to re-analyze
    const allStories = await getStories();

    let storiesToAnalyze = allStories;
    if (storyId) {
      storiesToAnalyze = allStories.filter((s) => s.id === storyId);
      if (storiesToAnalyze.length === 0) {
        return NextResponse.json(
          { error: `Story ${storyId} not found` },
          { status: 404 }
        );
      }
    } else {
      // Prioritize stories with placeholder analysis
      storiesToAnalyze = allStories
        .filter((s) =>
          s.analysis.keyDifferences.includes('Full analysis pending AI processing') ||
          s.analysis.agreedFacts.includes('This story is developing')
        )
        .slice(0, limit);

      // If no placeholder stories, take the most recent ones
      if (storiesToAnalyze.length === 0) {
        storiesToAnalyze = allStories.slice(0, limit);
      }
    }

    console.log(`[Reanalyze] Processing ${storiesToAnalyze.length} stories with Claude...`);

    const results: Array<{
      storyId: string;
      title: string;
      status: 'success' | 'error';
      newTitle?: string;
      error?: string;
    }> = [];

    for (const story of storiesToAnalyze) {
      try {
        // Reconstruct articles from story sources
        const storyArticles: Article[] = story.sources.map((source) => ({
          id: `source_${Buffer.from(source.url).toString('base64').slice(0, 16)}`,
          title: source.headline,
          description: source.snippet,
          content: null,
          url: source.url,
          urlToImage: null,
          publishedAt: source.publishedAt,
          source: { id: null, name: source.name },
          biasScore: source.biasScore,
          lean: source.lean,
          ingestedAt: new Date().toISOString(),
        }));

        console.log(`[Reanalyze] Analyzing "${story.title.slice(0, 50)}..." (${storyArticles.length} articles)`);

        // Run Claude analysis
        const analysis = await analyzeStoryCluster(storyArticles);

        // Update story with new analysis
        story.title = analysis.title;
        story.summary = analysis.summary;
        story.analysis = analysis.analysis;
        story.updatedAt = new Date().toISOString();

        await saveStory(story);

        results.push({
          storyId: story.id,
          title: story.title,
          status: 'success',
          newTitle: analysis.title,
        });

        console.log(`[Reanalyze] ✓ Updated: "${analysis.title.slice(0, 50)}..."`);
      } catch (error) {
        console.error(`[Reanalyze] ✗ Failed for story ${story.id}:`, error);
        results.push({
          storyId: story.id,
          title: story.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      storiesProcessed: storiesToAnalyze.length,
      successCount,
      errorCount,
      results,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Reanalyze] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Re-analysis failed',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
