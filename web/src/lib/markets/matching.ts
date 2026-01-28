/**
 * Market-to-Story Matching
 *
 * Matches prediction markets to news stories based on keyword overlap
 * and semantic similarity. Uses a scoring system to find the best matches.
 */

import { Story, PredictionMarket } from '@/types/story';
import { PolymarketData, toPredictionMarket } from './polymarket';

/**
 * Extract keywords from text for matching
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that',
    'it', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just',
    'before', 'after', 'while', 'during', 'about', 'into', 'through',
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !stopWords.has(word))
  );
}

/**
 * Calculate Jaccard similarity between two keyword sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Score a market-story pair for match quality
 * Returns a score from 0-1 where higher is better
 */
function scoreMatch(story: Story, market: PolymarketData): number {
  // Extract keywords from story
  const storyText = `${story.title} ${story.summary}`;
  const storyKeywords = extractKeywords(storyText);

  // Extract keywords from market question
  const marketKeywords = extractKeywords(market.question);

  // Base score from keyword overlap
  let score = jaccardSimilarity(storyKeywords, marketKeywords);

  // Bonus for specific entity matches
  const entities = [
    'trump', 'biden', 'congress', 'senate', 'house', 'supreme court',
    'fed', 'federal reserve', 'ukraine', 'russia', 'china', 'israel',
    'shutdown', 'election', 'impeachment', 'indictment', 'tariff',
  ];

  for (const entity of entities) {
    const inStory = storyText.toLowerCase().includes(entity);
    const inMarket = market.question.toLowerCase().includes(entity);
    if (inStory && inMarket) {
      score += 0.15; // Significant bonus for entity match
    }
  }

  // Bonus for high-volume markets (more signal)
  if (market.volume > 100000) score += 0.05;
  if (market.volume > 1000000) score += 0.05;

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Match markets to stories
 * Returns a map of storyId -> best matching markets
 */
export function matchMarketsToStories(
  stories: Story[],
  markets: PolymarketData[],
  minScore: number = 0.2,
  maxMarketsPerStory: number = 3
): Map<string, PredictionMarket[]> {
  const matches = new Map<string, PredictionMarket[]>();

  for (const story of stories) {
    const scoredMarkets: { market: PolymarketData; score: number }[] = [];

    for (const market of markets) {
      const score = scoreMatch(story, market);
      if (score >= minScore) {
        scoredMarkets.push({ market, score });
      }
    }

    // Sort by score descending and take top N
    scoredMarkets.sort((a, b) => b.score - a.score);
    const topMarkets = scoredMarkets
      .slice(0, maxMarketsPerStory)
      .map((m) => toPredictionMarket(m.market));

    if (topMarkets.length > 0) {
      matches.set(story.id, topMarkets);
    }
  }

  return matches;
}

/**
 * Find the best market match for a single story
 */
export function findBestMarketForStory(
  story: Story,
  markets: PolymarketData[]
): PredictionMarket | null {
  let bestMatch: { market: PolymarketData; score: number } | null = null;

  for (const market of markets) {
    const score = scoreMatch(story, market);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { market, score };
    }
  }

  if (bestMatch && bestMatch.score >= 0.2) {
    return toPredictionMarket(bestMatch.market);
  }

  return null;
}

/**
 * Search for markets related to a story's topic
 * Useful for finding markets when no direct keyword match exists
 */
export function suggestSearchTerms(story: Story): string[] {
  const keywords = extractKeywords(`${story.title} ${story.summary}`);

  // Common political/news terms to look for
  const importantTerms = [
    'trump', 'biden', 'election', 'congress', 'senate', 'house',
    'shutdown', 'fed', 'rate', 'ukraine', 'russia', 'china', 'war',
    'impeachment', 'indictment', 'supreme court', 'veto', 'budget',
  ];

  const found: string[] = [];
  for (const term of importantTerms) {
    if (keywords.has(term)) {
      found.push(term);
    }
  }

  return found;
}
