import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, SUMMARY_MODEL, MAX_OUTPUT_TOKENS } from '@/lib/anthropic';
import { buildSummaryPrompt, validateSummaryResponse } from '@/lib/prompts';
import { summaryCache } from '@/lib/cache';
import { Story, BalancedSummary } from '@/types/story';

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

    // Check cache first
    const cached = summaryCache.get(story.id);
    if (cached) {
      return NextResponse.json({
        summary: cached,
        cached: true,
      });
    }

    // Generate new summary
    const client = getAnthropicClient();
    const prompt = buildSummaryPrompt(story);

    const response = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON response
    let summaryData: Record<string, unknown>;
    try {
      // Handle potential markdown code blocks
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      summaryData = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      throw new Error('Invalid JSON in AI response');
    }

    // Validate structure
    if (!validateSummaryResponse(summaryData)) {
      throw new Error('AI response does not match expected schema');
    }

    // Build final summary object
    const summary: BalancedSummary = {
      overview: summaryData.overview as string,
      timeline: summaryData.timeline as BalancedSummary['timeline'],
      keyFigures: summaryData.keyFigures as BalancedSummary['keyFigures'],
      verifiedFacts: summaryData.verifiedFacts as BalancedSummary['verifiedFacts'],
      disputed: summaryData.disputed as BalancedSummary['disputed'],
      context: summaryData.context as string,
      unclearQuestions: summaryData.unclearQuestions as string[],
      generatedAt: new Date().toISOString(),
      sourceCount: story.sources.length,
    };

    // Cache the result
    summaryCache.set(story.id, summary);

    return NextResponse.json({
      summary,
      cached: false,
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
