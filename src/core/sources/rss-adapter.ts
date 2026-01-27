/**
 * RSS Feed Adapter
 *
 * Fetches and parses RSS feeds from news sources.
 * Normalizes the data into our NewsArticle format.
 */

import Parser from 'rss-parser';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import type { NewsSource, NewsArticle, FetchResult, RssFeed } from '../../types/index.js';

// ============================================================================
// Types
// ============================================================================

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  description?: string;
  creator?: string;
  author?: string;
  categories?: string[];
  enclosure?: {
    url?: string;
  };
  'media:content'?: {
    $?: {
      url?: string;
    };
  };
}

interface FetchOptions {
  /** Maximum concurrent feed fetches */
  concurrency?: number;
  /** Timeout per feed in ms */
  timeout?: number;
  /** Only fetch feeds with priority <= this value */
  maxPriority?: number;
  /** Maximum articles per feed */
  maxArticlesPerFeed?: number;
}

// ============================================================================
// RSS Adapter
// ============================================================================

export class RssAdapter {
  private parser: Parser;
  private defaultOptions: Required<FetchOptions>;

  constructor(options?: Partial<FetchOptions>) {
    this.parser = new Parser({
      timeout: options?.timeout ?? 10000,
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['dc:creator', 'creator'],
        ],
      },
    });

    this.defaultOptions = {
      concurrency: 5,
      timeout: 10000,
      maxPriority: 10,
      maxArticlesPerFeed: 20,
      ...options,
    };
  }

  /**
   * Fetch articles from a single news source
   */
  async fetchSource(
    source: NewsSource,
    options?: Partial<FetchOptions>
  ): Promise<FetchResult> {
    const opts = { ...this.defaultOptions, ...options };
    const articles: NewsArticle[] = [];
    const errors: string[] = [];
    const fetchedAt = new Date();

    // Filter feeds by priority
    const feedsToFetch = source.feeds.filter(f => f.priority <= opts.maxPriority);

    // Fetch each feed
    for (const feed of feedsToFetch) {
      try {
        const feedArticles = await this.fetchFeed(source, feed, opts);
        articles.push(...feedArticles);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`[${source.id}/${feed.section}] ${msg}`);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const dedupedArticles = articles.filter(article => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });

    return {
      source,
      articles: dedupedArticles,
      errors,
      fetchedAt,
    };
  }

  /**
   * Fetch articles from multiple sources in parallel
   */
  async fetchSources(
    sources: NewsSource[],
    options?: Partial<FetchOptions>
  ): Promise<FetchResult[]> {
    const opts = { ...this.defaultOptions, ...options };
    const limit = pLimit(opts.concurrency);

    const results = await Promise.all(
      sources.map(source =>
        limit(() => this.fetchSource(source, opts))
      )
    );

    return results;
  }

  /**
   * Fetch a single RSS feed
   */
  private async fetchFeed(
    source: NewsSource,
    feed: RssFeed,
    options: Required<FetchOptions>
  ): Promise<NewsArticle[]> {
    const parsed = await this.parser.parseURL(feed.url);
    const fetchedAt = new Date();

    const articles: NewsArticle[] = [];

    for (const item of parsed.items.slice(0, options.maxArticlesPerFeed)) {
      const article = this.parseItem(item, source, feed, fetchedAt);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  }

  /**
   * Parse an RSS item into a NewsArticle
   */
  private parseItem(
    item: RssItem,
    source: NewsSource,
    feed: RssFeed,
    fetchedAt: Date
  ): NewsArticle | null {
    // Skip items without required fields
    if (!item.title || !item.link) {
      return null;
    }

    // Generate a stable ID from the URL
    const id = this.generateId(item.link);

    // Parse the publish date
    const publishedAt = this.parseDate(item.pubDate || item.isoDate);
    if (!publishedAt) {
      return null;
    }

    // Extract summary from various possible fields
    const summary = this.extractSummary(item);

    // Extract image URL
    const imageUrl = this.extractImageUrl(item);

    // Extract author(s)
    const authors = this.extractAuthors(item);

    // Extract categories
    const categories = this.extractCategories(item, feed);

    return {
      id,
      title: item.title,
      sourceId: source.id,
      url: item.link,
      publishedAt,
      fetchedAt,
      summary,
      authors,
      categories,
      entities: [], // Will be populated by entity extraction later
      imageUrl,
    };
  }

  /**
   * Generate a stable ID from a URL
   */
  private generateId(url: string): string {
    return createHash('sha256').update(url).digest('hex').slice(0, 16);
  }

  /**
   * Parse a date string into a Date object
   */
  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    try {
      const date = new Date(dateStr);
      // Validate the date is reasonable (not too old, not in future)
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      if (date > now || date < twoWeeksAgo) {
        // Allow it but log warning in production
        // For now, just return it
      }

      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Extract summary text from an RSS item
   */
  private extractSummary(item: RssItem): string {
    // Prefer contentSnippet (pre-stripped HTML) over other fields
    const raw =
      item.contentSnippet ||
      item.summary ||
      item.description ||
      item.content ||
      '';

    // Clean up the summary
    return this.cleanText(raw).slice(0, 500);
  }

  /**
   * Extract image URL from an RSS item
   */
  private extractImageUrl(item: RssItem): string | undefined {
    // Try enclosure first (standard RSS)
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // Try media:content (common extension)
    if (item['media:content']?.$?.url) {
      return item['media:content'].$.url;
    }

    return undefined;
  }

  /**
   * Extract author(s) from an RSS item
   */
  private extractAuthors(item: RssItem): string[] {
    const authors: string[] = [];

    if (item.creator) {
      authors.push(item.creator);
    }
    if (item.author && !authors.includes(item.author)) {
      authors.push(item.author);
    }

    return authors;
  }

  /**
   * Extract categories from an RSS item
   */
  private extractCategories(item: RssItem, feed: RssFeed): string[] {
    const categories: string[] = [];

    // Add the feed section as a category
    categories.push(feed.section);

    // Add item categories if present
    if (item.categories) {
      categories.push(...item.categories);
    }

    // Deduplicate
    return [...new Set(categories)];
  }

  /**
   * Clean text by removing HTML and normalizing whitespace
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

/**
 * Create a default RSS adapter instance
 */
export function createRssAdapter(options?: Partial<FetchOptions>): RssAdapter {
  return new RssAdapter(options);
}
