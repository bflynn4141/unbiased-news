'use client';

import { BalancedSummary } from '@/types/story';

interface PrefetchEntry {
  promise: Promise<{ summary: BalancedSummary; cached: boolean }>;
  summary?: BalancedSummary;
  cached?: boolean;
  error?: string;
  status: 'loading' | 'ready' | 'error';
}

// Client-side prefetch cache
const prefetchCache = new Map<string, PrefetchEntry>();

/**
 * Start prefetching a summary for a story.
 * Called on hover with a delay.
 */
export async function prefetchSummary(storyId: string, story: unknown): Promise<void> {
  // Already prefetching or prefetched
  if (prefetchCache.has(storyId)) {
    return;
  }

  const fetchPromise = fetch('/api/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ story }),
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to generate summary');
    }
    return res.json();
  });

  const entry: PrefetchEntry = {
    promise: fetchPromise,
    status: 'loading',
  };

  prefetchCache.set(storyId, entry);

  try {
    const result = await fetchPromise;
    entry.summary = result.summary;
    entry.cached = result.cached;
    entry.status = 'ready';
  } catch (err) {
    entry.error = err instanceof Error ? err.message : 'Unknown error';
    entry.status = 'error';
  }
}

/**
 * Get prefetch status for a story.
 */
export function getPrefetchStatus(storyId: string): PrefetchEntry | null {
  return prefetchCache.get(storyId) || null;
}

/**
 * Get or fetch a summary.
 * If prefetched, returns immediately. Otherwise fetches.
 */
export async function getOrFetchSummary(
  storyId: string,
  story: unknown
): Promise<{ summary: BalancedSummary; cached: boolean }> {
  const existing = prefetchCache.get(storyId);

  if (existing) {
    // Wait for existing prefetch to complete
    return existing.promise;
  }

  // Not prefetched, start fresh fetch
  await prefetchSummary(storyId, story);
  const entry = prefetchCache.get(storyId)!;
  return entry.promise;
}

/**
 * Check if a summary is ready (prefetched and loaded).
 */
export function isSummaryReady(storyId: string): boolean {
  const entry = prefetchCache.get(storyId);
  return entry?.status === 'ready';
}

/**
 * Get a ready summary if available.
 */
export function getReadySummary(storyId: string): { summary: BalancedSummary; cached: boolean } | null {
  const entry = prefetchCache.get(storyId);
  if (entry?.status === 'ready' && entry.summary) {
    return { summary: entry.summary, cached: entry.cached || false };
  }
  return null;
}
