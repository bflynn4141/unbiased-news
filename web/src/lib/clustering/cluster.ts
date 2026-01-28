/**
 * Article Clustering Algorithm
 *
 * Groups related articles into stories using TF-IDF similarity.
 * Uses Union-Find for efficient cluster formation.
 *
 * Algorithm:
 * 1. Build TF-IDF vectors for all unclustered articles
 * 2. Calculate pairwise similarity matrix
 * 3. Group articles with similarity > threshold using Union-Find
 * 4. For each cluster, generate a story with Claude
 */

import { Article, Story, Source, BiasAnalysis, StoryVelocity } from '@/types/story';
import {
  buildTfIdfVectors,
  calculateSimilarityMatrix,
  findSimilarDocuments,
  DocumentVector,
} from './similarity';
import { calculateCoverageBalance, getSourceBias } from '../ingest/sources';

// Similarity threshold for grouping articles
const SIMILARITY_THRESHOLD = 0.3;

// Minimum articles to form a story
const MIN_CLUSTER_SIZE = 2;

/**
 * Union-Find data structure for efficient clustering
 */
class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor(ids: string[]) {
    this.parent = new Map();
    this.rank = new Map();
    for (const id of ids) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
  }

  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!)); // Path compression
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    // Union by rank
    const rankX = this.rank.get(rootX)!;
    const rankY = this.rank.get(rootY)!;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();

    for (const [id] of this.parent) {
      const root = this.find(id);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(id);
    }

    return clusters;
  }
}

/**
 * Cluster articles into groups based on similarity
 */
export function clusterArticles(articles: Article[]): Map<string, Article[]> {
  if (articles.length === 0) {
    return new Map();
  }

  // Build TF-IDF vectors
  const vectors = buildTfIdfVectors(
    articles.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
    }))
  );

  // Calculate similarity matrix
  const similarityMatrix = calculateSimilarityMatrix(vectors);

  // Initialize Union-Find
  const uf = new UnionFind(articles.map((a) => a.id));

  // Union similar articles
  for (const article of articles) {
    const similar = findSimilarDocuments(
      article.id,
      similarityMatrix,
      SIMILARITY_THRESHOLD
    );
    for (const otherId of similar) {
      uf.union(article.id, otherId);
    }
  }

  // Get clusters and map back to articles
  const clusters = uf.getClusters();
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const result = new Map<string, Article[]>();
  for (const [clusterId, articleIds] of clusters) {
    if (articleIds.length >= MIN_CLUSTER_SIZE) {
      const clusterArticles = articleIds
        .map((id) => articleMap.get(id)!)
        .filter(Boolean);
      result.set(clusterId, clusterArticles);
    }
  }

  return result;
}

/**
 * Generate a unique story ID
 */
function generateStoryId(): string {
  return `story_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Calculate velocity based on article timestamps
 */
function calculateVelocity(articles: Article[]): {
  velocity: StoryVelocity;
  velocityScore: number;
} {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  // Count articles in different time windows
  let lastHour = 0;
  let lastDay = 0;

  for (const article of articles) {
    const age = now - new Date(article.publishedAt).getTime();
    if (age < oneHour) lastHour++;
    if (age < oneDay) lastDay++;
  }

  // Determine velocity category
  if (lastHour >= 3) {
    return { velocity: 'fast', velocityScore: lastHour };
  } else if (lastDay >= 5) {
    return { velocity: 'medium', velocityScore: lastDay };
  } else {
    return { velocity: 'slow', velocityScore: articles.length };
  }
}

/**
 * Convert articles to Source objects for a story
 */
function articlesToSources(articles: Article[]): Source[] {
  return articles.map((article) => ({
    name: article.source.name,
    lean: article.lean,
    biasScore: article.biasScore,
    url: article.url,
    headline: article.title,
    snippet: article.description || '',
    publishedAt: article.publishedAt,
  }));
}

/**
 * Generate a title for the story cluster
 * Uses the headline from the most central article (highest avg similarity)
 * In production, this would be enhanced with Claude
 */
function generateStoryTitle(articles: Article[]): string {
  // For now, use the title from the most recent article from a center/reliable source
  const sorted = [...articles].sort((a, b) => {
    // Prefer center sources
    const centerA = Math.abs(a.biasScore - 50);
    const centerB = Math.abs(b.biasScore - 50);
    if (centerA !== centerB) return centerA - centerB;
    // Then by recency
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return sorted[0].title;
}

/**
 * Generate a neutral summary for the story
 * In production, this would be enhanced with Claude
 */
function generateStorySummary(articles: Article[]): string {
  // Combine descriptions from different perspectives
  const descriptions = articles
    .filter((a) => a.description)
    .map((a) => a.description!)
    .slice(0, 3);

  // For now, return the first description
  // TODO: Use Claude to synthesize a neutral summary
  return descriptions[0] || 'Multiple sources reporting on this developing story.';
}

/**
 * Generate placeholder bias analysis
 * In production, this would be generated by Claude
 */
function generatePlaceholderAnalysis(articles: Article[]): BiasAnalysis {
  const leftArticles = articles.filter((a) => a.biasScore < 40);
  const rightArticles = articles.filter((a) => a.biasScore > 60);

  return {
    leftPerspective: leftArticles[0]?.description || 'Analysis pending...',
    rightPerspective: rightArticles[0]?.description || 'Analysis pending...',
    agreedFacts: [
      'This story is developing',
      `${articles.length} sources are covering this topic`,
    ],
    keyDifferences: ['Full analysis pending AI processing'],
    unansweredQuestions: ['What are the implications of this development?'],
  };
}

/**
 * Convert a cluster of articles into a Story object
 */
export function createStoryFromCluster(articles: Article[]): Story {
  const id = generateStoryId();
  const sources = articlesToSources(articles);
  const { velocity, velocityScore } = calculateVelocity(articles);
  const coverageBalance = calculateCoverageBalance(sources);

  return {
    id,
    title: generateStoryTitle(articles),
    summary: generateStorySummary(articles),
    velocity,
    velocityScore,
    updatedAt: new Date().toISOString(),
    sources,
    analysis: generatePlaceholderAnalysis(articles),
    coverageBalance,
    // predictionMarkets will be added in Phase 5
  };
}

/**
 * Main clustering pipeline
 * Takes unclustered articles and returns new Story objects
 */
export function clusterIntoStories(articles: Article[]): {
  stories: Story[];
  clusteredArticleIds: Map<string, string[]>; // storyId -> articleIds
  unclusteredIds: string[]; // Articles that didn't form clusters
} {
  const clusters = clusterArticles(articles);

  const stories: Story[] = [];
  const clusteredArticleIds = new Map<string, string[]>();
  const clusteredSet = new Set<string>();

  for (const [, clusterArticles] of clusters) {
    const story = createStoryFromCluster(clusterArticles);
    stories.push(story);

    const articleIds = clusterArticles.map((a) => a.id);
    clusteredArticleIds.set(story.id, articleIds);

    for (const id of articleIds) {
      clusteredSet.add(id);
    }
  }

  const unclusteredIds = articles
    .filter((a) => !clusteredSet.has(a.id))
    .map((a) => a.id);

  return { stories, clusteredArticleIds, unclusteredIds };
}
