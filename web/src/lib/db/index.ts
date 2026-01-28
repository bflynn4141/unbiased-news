/**
 * Vercel KV Database Client
 *
 * This module provides a Redis-compatible client for storing and retrieving
 * news stories, articles, and prediction market data.
 *
 * Key Structure:
 * - stories:{id}      → Individual story JSON
 * - stories:active    → Sorted set of active story IDs by velocity score
 * - articles:{id}     → Individual article JSON
 * - summaries:{id}    → BalancedSummary for a story
 * - markets:{id}      → PredictionMarket data
 */

import { kv } from '@vercel/kv';

// Re-export the kv client for direct access when needed
export { kv };

// Key prefixes for organization
export const KEYS = {
  story: (id: string) => `stories:${id}`,
  activeStories: 'stories:active',
  article: (id: string) => `articles:${id}`,
  summary: (storyId: string) => `summaries:${storyId}`,
  market: (id: string) => `markets:${id}`,
  // Metadata keys
  lastIngest: 'meta:lastIngest',
  lastCluster: 'meta:lastCluster',
  lastMarketSync: 'meta:lastMarketSync',
} as const;

/**
 * Check if KV is configured and available
 * Returns false if KV env vars are not set (local dev without KV)
 */
export async function isKVAvailable(): Promise<boolean> {
  try {
    // Try a simple ping-like operation
    await kv.get('__health_check__');
    return true;
  } catch (error) {
    // Check if it's a configuration error vs runtime error
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('KV_REST_API_URL') || message.includes('Missing')) {
      console.warn('Vercel KV not configured - using fallback data');
      return false;
    }
    // Other errors might be transient, assume KV is available
    return true;
  }
}
