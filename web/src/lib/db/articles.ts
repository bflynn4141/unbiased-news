/**
 * Article Database Operations
 *
 * Stores raw ingested articles before they're clustered into stories.
 * Articles are stored with a 48-hour TTL since we only need recent articles
 * for clustering purposes.
 */

import { Article } from '@/types/story';
import { kv, KEYS, isKVAvailable } from './index';

// Cache KV availability
let kvAvailable: boolean | null = null;

async function checkKV(): Promise<boolean> {
  if (kvAvailable === null) {
    kvAvailable = await isKVAvailable();
  }
  return kvAvailable;
}

// In-memory cache for local development
const articleCache = new Map<string, Article>();

/**
 * Save an article to the database
 * Uses 48-hour TTL since we only need recent articles for clustering
 */
export async function saveArticle(article: Article): Promise<void> {
  const hasKV = await checkKV();

  if (!hasKV) {
    articleCache.set(article.id, article);
    return;
  }

  try {
    // Save with 48-hour TTL
    await kv.set(KEYS.article(article.id), article, { ex: 172800 });

    // Also add to unclustered set if not yet assigned to a story
    if (!article.storyId) {
      await kv.sadd('articles:unclustered', article.id);
    }
  } catch (error) {
    console.error(`Error saving article ${article.id}:`, error);
    throw error;
  }
}

/**
 * Save multiple articles in batch
 */
export async function saveArticles(articles: Article[]): Promise<{
  saved: number;
  duplicates: number;
}> {
  const hasKV = await checkKV();

  let saved = 0;
  let duplicates = 0;

  if (!hasKV) {
    for (const article of articles) {
      if (!articleCache.has(article.id)) {
        articleCache.set(article.id, article);
        saved++;
      } else {
        duplicates++;
      }
    }
    return { saved, duplicates };
  }

  try {
    const pipeline = kv.pipeline();

    for (const article of articles) {
      // Check if article already exists
      const exists = await kv.exists(KEYS.article(article.id));
      if (exists) {
        duplicates++;
        continue;
      }

      pipeline.set(KEYS.article(article.id), article, { ex: 172800 });
      if (!article.storyId) {
        pipeline.sadd('articles:unclustered', article.id);
      }
      saved++;
    }

    if (saved > 0) {
      await pipeline.exec();
    }

    return { saved, duplicates };
  } catch (error) {
    console.error('Error batch saving articles:', error);
    throw error;
  }
}

/**
 * Get an article by ID
 */
export async function getArticleById(id: string): Promise<Article | null> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return articleCache.get(id) ?? null;
  }

  try {
    return await kv.get<Article>(KEYS.article(id));
  } catch (error) {
    console.error(`Error fetching article ${id}:`, error);
    return null;
  }
}

/**
 * Get all unclustered articles (not yet assigned to a story)
 */
export async function getUnclusteredArticles(): Promise<Article[]> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return Array.from(articleCache.values()).filter((a) => !a.storyId);
  }

  try {
    const articleIds = await kv.smembers<string[]>('articles:unclustered');
    if (!articleIds || articleIds.length === 0) {
      return [];
    }

    const articles: Article[] = [];
    for (const id of articleIds) {
      const article = await kv.get<Article>(KEYS.article(id));
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  } catch (error) {
    console.error('Error fetching unclustered articles:', error);
    return [];
  }
}

/**
 * Mark articles as clustered (assigned to a story)
 */
export async function markArticlesClustered(
  articleIds: string[],
  storyId: string
): Promise<void> {
  const hasKV = await checkKV();

  if (!hasKV) {
    for (const id of articleIds) {
      const article = articleCache.get(id);
      if (article) {
        article.storyId = storyId;
      }
    }
    return;
  }

  try {
    const pipeline = kv.pipeline();

    for (const id of articleIds) {
      const article = await kv.get<Article>(KEYS.article(id));
      if (article) {
        article.storyId = storyId;
        pipeline.set(KEYS.article(id), article, { ex: 172800 });
      }
      pipeline.srem('articles:unclustered', id);
    }

    await pipeline.exec();
  } catch (error) {
    console.error('Error marking articles as clustered:', error);
    throw error;
  }
}

/**
 * Get count of unclustered articles
 */
export async function getUnclusteredCount(): Promise<number> {
  const hasKV = await checkKV();

  if (!hasKV) {
    return Array.from(articleCache.values()).filter((a) => !a.storyId).length;
  }

  try {
    return await kv.scard('articles:unclustered');
  } catch (error) {
    console.error('Error getting unclustered count:', error);
    return 0;
  }
}
