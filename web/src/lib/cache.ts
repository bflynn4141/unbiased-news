import { BalancedSummary } from '@/types/story';

interface CacheEntry {
  data: BalancedSummary;
  timestamp: number;
  expiresAt: number;
}

// Simple in-memory TTL cache
// For production, consider Vercel KV or Redis
class SummaryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number;

  constructor(ttlMinutes: number = 60) {
    this.defaultTTL = ttlMinutes * 60 * 1000; // Convert to ms
  }

  get(storyId: string): BalancedSummary | null {
    const entry = this.cache.get(storyId);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(storyId);
      return null;
    }

    return entry.data;
  }

  set(storyId: string, summary: BalancedSummary, ttlMinutes?: number): void {
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;

    this.cache.set(storyId, {
      data: summary,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  has(storyId: string): boolean {
    return this.get(storyId) !== null;
  }

  delete(storyId: string): boolean {
    return this.cache.delete(storyId);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries (call periodically if needed)
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  // Debug: get cache stats
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance with 1-hour TTL
export const summaryCache = new SummaryCache(60);
