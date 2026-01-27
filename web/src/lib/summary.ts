import { getAnthropicClient, SUMMARY_MODEL, MAX_OUTPUT_TOKENS } from '@/lib/anthropic';
import { buildSummaryPrompt, validateSummaryResponse } from '@/lib/prompts';
import { summaryCache } from '@/lib/cache';
import { Story, BalancedSummary } from '@/types/story';

export interface SummaryResult {
  summary: BalancedSummary;
  cached: boolean;
}

/**
 * Generate or retrieve a cached balanced summary for a story.
 * This can be called from both API routes and server components.
 */
export async function generateSummary(story: Story): Promise<SummaryResult> {
  // Check cache first
  const cached = summaryCache.get(story.id);
  if (cached) {
    return { summary: cached, cached: true };
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
  } catch {
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

  return { summary, cached: false };
}
