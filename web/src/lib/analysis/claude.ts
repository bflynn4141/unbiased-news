/**
 * Claude AI Analysis Module
 *
 * Generates balanced, unbiased analysis of news story clusters using Claude.
 * Analyzes coverage from different political perspectives to identify:
 * - Agreed facts across sources
 * - Key differences in framing
 * - Unanswered questions
 */

import Anthropic from '@anthropic-ai/sdk';
import { Article, BiasAnalysis } from '@/types/story';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface StoryAnalysis {
  title: string;
  summary: string;
  analysis: BiasAnalysis;
}

/**
 * Format articles into a structured prompt
 */
function formatArticlesForPrompt(articles: Article[]): string {
  return articles
    .map((article, i) => {
      const leanLabel = {
        left: 'LEFT-LEANING',
        'left-center': 'LEFT-CENTER',
        center: 'CENTER',
        'right-center': 'RIGHT-CENTER',
        right: 'RIGHT-LEANING',
      }[article.lean];

      return `
ARTICLE ${i + 1} [${leanLabel} - ${article.source.name}]
Headline: ${article.title}
Description: ${article.description || 'N/A'}
Published: ${article.publishedAt}
URL: ${article.url}
`.trim();
    })
    .join('\n\n');
}

/**
 * Analyze a cluster of articles and generate unbiased analysis
 */
export async function analyzeStoryCluster(
  articles: Article[]
): Promise<StoryAnalysis> {
  // If no API key, return placeholder
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Claude] No ANTHROPIC_API_KEY set, using placeholder analysis');
    return generateFallbackAnalysis(articles);
  }

  const formattedArticles = formatArticlesForPrompt(articles);

  // Group articles by lean for context
  const leftCount = articles.filter((a) => a.biasScore < 40).length;
  const centerCount = articles.filter((a) => a.biasScore >= 40 && a.biasScore <= 60).length;
  const rightCount = articles.filter((a) => a.biasScore > 60).length;

  const prompt = `You are an expert news analyst creating balanced, unbiased coverage. You have ${articles.length} articles from different news sources covering the same story:
- ${leftCount} from left/left-center sources
- ${centerCount} from center sources
- ${rightCount} from right/right-center sources

ARTICLES:
${formattedArticles}

Analyze these articles and provide:

1. **TITLE**: A neutral, factual headline (no editorializing, no loaded language). Max 100 characters.

2. **SUMMARY**: A 2-3 sentence neutral summary of what is actually happening. Focus on verified facts, not interpretations. Write in Wikipedia NPOV style.

3. **LEFT_PERSPECTIVE**: How left-leaning sources frame this story (their emphasis, concerns, proposed solutions). 2-3 sentences.

4. **RIGHT_PERSPECTIVE**: How right-leaning sources frame this story (their emphasis, concerns, proposed solutions). 2-3 sentences.

5. **AGREED_FACTS**: 3-5 facts that ALL sources agree on, regardless of political lean. Be specific.

6. **KEY_DIFFERENCES**: 3-5 specific differences in how sources cover this story (framing, word choice, what they emphasize or omit).

7. **UNANSWERED_QUESTIONS**: 2-4 important questions that the coverage doesn't adequately address.

Respond in this exact JSON format:
{
  "title": "...",
  "summary": "...",
  "leftPerspective": "...",
  "rightPerspective": "...",
  "agreedFacts": ["...", "..."],
  "keyDifferences": ["...", "..."],
  "unansweredQuestions": ["...", "..."]
}

IMPORTANT: Return ONLY valid JSON, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: parsed.title || generateFallbackTitle(articles),
      summary: parsed.summary || 'Multiple sources reporting on this story.',
      analysis: {
        leftPerspective: parsed.leftPerspective || 'Analysis unavailable.',
        rightPerspective: parsed.rightPerspective || 'Analysis unavailable.',
        agreedFacts: parsed.agreedFacts || ['This story is developing.'],
        keyDifferences: parsed.keyDifferences || ['Analysis in progress.'],
        unansweredQuestions: parsed.unansweredQuestions || ['Further details pending.'],
      },
    };
  } catch (error) {
    console.error('[Claude] Analysis failed:', error);
    return generateFallbackAnalysis(articles);
  }
}

/**
 * Generate a fallback title from articles (used when Claude fails)
 */
function generateFallbackTitle(articles: Article[]): string {
  // Pick title from most center source
  const sorted = [...articles].sort((a, b) => {
    const centerA = Math.abs(a.biasScore - 50);
    const centerB = Math.abs(b.biasScore - 50);
    return centerA - centerB;
  });
  return sorted[0]?.title || 'Developing Story';
}

/**
 * Generate fallback analysis when Claude is unavailable
 */
function generateFallbackAnalysis(articles: Article[]): StoryAnalysis {
  const leftArticles = articles.filter((a) => a.biasScore < 40);
  const rightArticles = articles.filter((a) => a.biasScore > 60);

  return {
    title: generateFallbackTitle(articles),
    summary: articles[0]?.description || 'Multiple sources reporting on this developing story.',
    analysis: {
      leftPerspective: leftArticles[0]?.description || 'Left perspective analysis pending.',
      rightPerspective: rightArticles[0]?.description || 'Right perspective analysis pending.',
      agreedFacts: [
        'This story is developing',
        `${articles.length} sources are covering this topic`,
      ],
      keyDifferences: ['Full analysis pending AI processing'],
      unansweredQuestions: ['What are the implications of this development?'],
    },
  };
}

/**
 * Check if Claude API is available
 */
export function isClaudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
