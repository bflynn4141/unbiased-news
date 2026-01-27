import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/summary';
import { summaryCache } from '@/lib/cache';
import { SUMMARY_MODEL } from '@/lib/anthropic';
import { Story } from '@/types/story';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { story } = body as { story: Story };

    if (!story || !story.id) {
      return NextResponse.json(
        { error: 'Missing story data' },
        { status: 400 }
      );
    }

    const result = await generateSummary(story);

    return NextResponse.json({
      summary: result.summary,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Summary generation error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to generate summary: ${message}` },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const stats = summaryCache.stats();

  return NextResponse.json({
    status: 'ok',
    cache: stats,
    model: SUMMARY_MODEL,
  });
}
