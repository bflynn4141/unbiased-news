/**
 * Story Database Operations
 *
 * Provides CRUD operations for Story objects using Vercel KV.
 * Falls back to mock data when KV is not configured (local development).
 */

import { Story, BalancedSummary } from '@/types/story';
import { kv, KEYS, isKVAvailable } from './index';
import { mockStories } from '../stories';

// Cache KV availability check to avoid repeated checks
let kvAvailable: boolean | null = null;

async function checkKV(): Promise<boolean> {
  if (kvAvailable === null) {
    kvAvailable = await isKVAvailable();
  }
  return kvAvailable;
}

/**
 * Get all active stories, sorted by velocity score (highest first)
 * Falls back to mock data if KV is not available
 */
export async function getStories(): Promise<Story[]> {
  const hasKV = await checkKV();

  if (!hasKV) {
    // Return mock data sorted by velocity score
    return [...mockStories].sort((a, b) => b.velocityScore - a.velocityScore);
  }

  try {
    // Get story IDs from the sorted set (highest velocity first)
    const storyIds = await kv.zrange<string[]>(KEYS.activeStories, 0, -1, {
      rev: true, // Reverse order = highest score first
    });

    if (!storyIds || storyIds.length === 0) {
      // No stories in KV yet, return mock data
      return [...mockStories].sort((a, b) => b.velocityScore - a.velocityScore);
    }

    // Fetch all stories in parallel
    const storyPromises = storyIds.map((id) => kv.get<Story>(KEYS.story(id)));
    const stories = await Promise.all(storyPromises);

    // Filter out any null results and return
    return stories.filter((s): s is Story => s !== null);
  } catch (error) {
    console.error('Error fetching stories from KV:', error);
    // Fallback to mock data on error
    return [...mockStories].sort((a, b) => b.velocityScore - a.velocityScore);
  }
}

/**
 * Get a single story by ID
 * Falls back to mock data if KV is not available
 */
export async function getStoryById(id: string): Promise<Story | null> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return mockStories.find((s) => s.id === id) ?? null;
  }

  try {
    const story = await kv.get<Story>(KEYS.story(id));
    if (story) return story;

    // Try mock data as fallback
    return mockStories.find((s) => s.id === id) ?? null;
  } catch (error) {
    console.error(`Error fetching story ${id} from KV:`, error);
    return mockStories.find((s) => s.id === id) ?? null;
  }
}

/**
 * Save a story to the database
 * Also updates the active stories sorted set with velocity score
 */
export async function saveStory(story: Story): Promise<void> {
  const hasKV = await checkKV();

  if (!hasKV) {
    console.warn('KV not available - story not persisted:', story.id);
    return;
  }

  try {
    // Save the story data
    await kv.set(KEYS.story(story.id), story);

    // Add/update in the active stories sorted set (score = velocityScore)
    await kv.zadd(KEYS.activeStories, {
      score: story.velocityScore,
      member: story.id,
    });
  } catch (error) {
    console.error(`Error saving story ${story.id} to KV:`, error);
    throw error;
  }
}

/**
 * Save multiple stories in a batch
 * More efficient than calling saveStory repeatedly
 */
export async function saveStories(stories: Story[]): Promise<void> {
  const hasKV = await checkKV();

  if (!hasKV) {
    console.warn('KV not available - stories not persisted');
    return;
  }

  try {
    // Use pipeline for batch operations
    const pipeline = kv.pipeline();

    for (const story of stories) {
      pipeline.set(KEYS.story(story.id), story);
      pipeline.zadd(KEYS.activeStories, {
        score: story.velocityScore,
        member: story.id,
      });
    }

    await pipeline.exec();
  } catch (error) {
    console.error('Error batch saving stories to KV:', error);
    throw error;
  }
}

/**
 * Delete a story from the database
 */
export async function deleteStory(id: string): Promise<void> {
  const hasKV = await checkKV();

  if (!hasKV) {
    console.warn('KV not available - cannot delete story');
    return;
  }

  try {
    await kv.del(KEYS.story(id));
    await kv.zrem(KEYS.activeStories, id);
    // Also delete associated summary if exists
    await kv.del(KEYS.summary(id));
  } catch (error) {
    console.error(`Error deleting story ${id} from KV:`, error);
    throw error;
  }
}

/**
 * Get the balanced summary for a story
 */
export async function getStorySummary(
  storyId: string
): Promise<BalancedSummary | null> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return null; // Summaries are generated on-demand via API
  }

  try {
    return await kv.get<BalancedSummary>(KEYS.summary(storyId));
  } catch (error) {
    console.error(`Error fetching summary for story ${storyId}:`, error);
    return null;
  }
}

/**
 * Save a balanced summary for a story
 */
export async function saveStorySummary(
  storyId: string,
  summary: BalancedSummary
): Promise<void> {
  const hasKV = await checkKV();

  if (!hasKV) {
    console.warn('KV not available - summary not persisted');
    return;
  }

  try {
    // Set with 24-hour TTL (summaries should be regenerated periodically)
    await kv.set(KEYS.summary(storyId), summary, { ex: 86400 });
  } catch (error) {
    console.error(`Error saving summary for story ${storyId}:`, error);
    throw error;
  }
}

/**
 * Seed the database with mock stories
 * Useful for initial setup or testing
 */
export async function seedDatabase(): Promise<{ seeded: number }> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return { seeded: 0 };
  }

  try {
    await saveStories(mockStories);
    return { seeded: mockStories.length };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Get the count of active stories
 */
export async function getStoryCount(): Promise<number> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return mockStories.length;
  }

  try {
    return await kv.zcard(KEYS.activeStories);
  } catch (error) {
    console.error('Error getting story count:', error);
    return mockStories.length;
  }
}
