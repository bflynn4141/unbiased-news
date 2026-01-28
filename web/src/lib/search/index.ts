/**
 * Search Module
 *
 * Simple keyword search using Vercel KV as an inverted index.
 *
 * Index structure:
 * - search:word:{word} → Set of story IDs that contain this word
 * - search:indexed:{storyId} → "1" if story is indexed
 *
 * Algorithm:
 * 1. Tokenize search query into words
 * 2. For each word, get the set of story IDs
 * 3. Intersect all sets to find stories containing ALL words
 * 4. Return matching stories sorted by relevance/date
 */

import { kv, isKVAvailable } from '@/lib/db';
import { Story } from '@/types/story';
import { getStories } from '@/lib/db/stories';

const SEARCH_PREFIX = 'search:word:';
const INDEXED_PREFIX = 'search:indexed:';

/**
 * Tokenize text into searchable words
 * - Lowercase
 * - Remove punctuation
 * - Filter short words (< 3 chars)
 * - Filter common stop words
 */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them',
    'their', 'he', 'she', 'him', 'her', 'his', 'hers', 'we', 'us', 'our',
    'you', 'your', 'who', 'which', 'what', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'new', 'said', 'says',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)               // Split on whitespace
    .filter(word => word.length >= 3)  // Min 3 chars
    .filter(word => !stopWords.has(word))  // Remove stop words
    .filter((word, i, arr) => arr.indexOf(word) === i);  // Dedupe
}

/**
 * Extract searchable text from a story
 */
function getSearchableText(story: Story): string {
  const parts = [
    story.title,
    story.summary,
    ...story.sources.map(s => s.headline),
    ...story.analysis.agreedFacts,
  ];
  return parts.join(' ');
}

/**
 * Index a story for search
 */
export async function indexStory(story: Story): Promise<void> {
  const hasKV = await isKVAvailable();
  if (!hasKV) {
    console.warn('[Search] KV not available, skipping index');
    return;
  }

  const text = getSearchableText(story);
  const words = tokenize(text);

  // Add story ID to each word's set
  const pipeline = kv.pipeline();
  for (const word of words) {
    pipeline.sadd(`${SEARCH_PREFIX}${word}`, story.id);
  }

  // Mark story as indexed
  pipeline.set(`${INDEXED_PREFIX}${story.id}`, '1');

  await pipeline.exec();
  console.log(`[Search] Indexed story ${story.id} with ${words.length} words`);
}

/**
 * Index all existing stories
 */
export async function indexAllStories(): Promise<{ indexed: number; skipped: number }> {
  const hasKV = await isKVAvailable();
  if (!hasKV) {
    return { indexed: 0, skipped: 0 };
  }

  const stories = await getStories();
  let indexed = 0;
  let skipped = 0;

  for (const story of stories) {
    // Check if already indexed
    const isIndexed = await kv.get(`${INDEXED_PREFIX}${story.id}`);
    if (isIndexed) {
      skipped++;
      continue;
    }

    await indexStory(story);
    indexed++;
  }

  return { indexed, skipped };
}

/**
 * Search for stories by keyword
 */
export async function searchStories(query: string, limit: number = 20): Promise<Story[]> {
  const hasKV = await isKVAvailable();
  if (!hasKV) {
    console.warn('[Search] KV not available, using fallback');
    return searchStoriesFallback(query, limit);
  }

  const words = tokenize(query);
  if (words.length === 0) {
    return [];
  }

  // Get story IDs for each word
  const wordSets: Set<string>[] = [];
  for (const word of words) {
    const ids = await kv.smembers(`${SEARCH_PREFIX}${word}`);
    wordSets.push(new Set(ids as string[]));
  }

  // Intersect all sets
  let matchingIds = wordSets[0];
  for (let i = 1; i < wordSets.length; i++) {
    matchingIds = new Set([...matchingIds].filter(id => wordSets[i].has(id)));
  }

  if (matchingIds.size === 0) {
    return [];
  }

  // Get full stories
  const stories = await getStories();
  const storyMap = new Map(stories.map(s => [s.id, s]));

  const matchingStories = [...matchingIds]
    .map(id => storyMap.get(id))
    .filter((s): s is Story => s !== undefined)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);

  return matchingStories;
}

/**
 * Fallback search when KV not available - searches in memory
 */
async function searchStoriesFallback(query: string, limit: number): Promise<Story[]> {
  const words = tokenize(query);
  if (words.length === 0) {
    return [];
  }

  const stories = await getStories();

  // Score each story by word matches
  const scored = stories.map(story => {
    const text = getSearchableText(story).toLowerCase();
    const score = words.reduce((total, word) => {
      return total + (text.includes(word) ? 1 : 0);
    }, 0);
    return { story, score };
  });

  // Filter stories that match ALL words and sort by score/date
  return scored
    .filter(s => s.score === words.length)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.story.updatedAt).getTime() - new Date(a.story.updatedAt).getTime();
    })
    .map(s => s.story)
    .slice(0, limit);
}

/**
 * Clear the search index
 */
export async function clearSearchIndex(): Promise<void> {
  const hasKV = await isKVAvailable();
  if (!hasKV) return;

  // Get all search keys and delete them
  const keys = await kv.keys(`${SEARCH_PREFIX}*`);
  const indexedKeys = await kv.keys(`${INDEXED_PREFIX}*`);

  if (keys.length > 0 || indexedKeys.length > 0) {
    const pipeline = kv.pipeline();
    for (const key of [...keys, ...indexedKeys]) {
      pipeline.del(key);
    }
    await pipeline.exec();
  }

  console.log(`[Search] Cleared ${keys.length + indexedKeys.length} keys`);
}
