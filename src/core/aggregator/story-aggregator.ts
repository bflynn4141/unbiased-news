/**
 * Story Aggregator
 *
 * Groups related news articles into "stories" - the same event/topic
 * covered by multiple sources. This is the core of showing
 * "how different sources cover the same story."
 *
 * Aggregation Strategy:
 * 1. Extract key entities and keywords from each article
 * 2. Calculate similarity between articles
 * 3. Cluster similar articles into stories
 * 4. Analyze coverage patterns across sources
 *
 * Future improvements:
 * - Embedding-based similarity (requires vector DB or embedding API)
 * - LLM-based clustering for better accuracy
 * - Real-time clustering as articles arrive
 */

import type {
  NewsArticle,
  AggregatedStory,
  ExtractedEntity,
  CoverageAnalysis,
  AggregationConfig,
  BiasIndicators,
  FramingDifference,
} from '../../types/index.js';
import { getSource } from '../sources/registry.js';

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Simple entity extraction using patterns
 * In production, you'd use NLP libraries like compromise, spaCy, or an LLM
 */
export function extractEntities(text: string): ExtractedEntity[] {
  const entities: Map<string, ExtractedEntity> = new Map();

  // Proper nouns (capitalized words not at sentence start)
  // This is a simplification - real NER would be much better
  const properNounPattern = /(?<![.!?]\s)(?<!\n)\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;

  while ((match = properNounPattern.exec(text)) !== null) {
    const entityText = match[1];
    if (!entityText || entityText.length < 2) continue;

    // Skip common non-entity words
    const skipWords = ['The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Who', 'Why', 'How'];
    if (skipWords.includes(entityText)) continue;

    const key = entityText.toLowerCase();
    const existing = entities.get(key);

    if (existing) {
      existing.count++;
    } else {
      entities.set(key, {
        text: entityText,
        type: guessEntityType(entityText),
        count: 1,
      });
    }
  }

  // Return sorted by count
  return Array.from(entities.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Limit to top 20
}

/**
 * Guess entity type from the text
 */
function guessEntityType(text: string): ExtractedEntity['type'] {
  // Simple heuristics - in production use a proper NER model
  const locationSuffixes = ['City', 'County', 'State', 'Street', 'Avenue', 'Road'];
  const orgSuffixes = ['Inc', 'Corp', 'LLC', 'Company', 'Organization', 'Foundation', 'Institute'];

  for (const suffix of locationSuffixes) {
    if (text.endsWith(suffix)) return 'location';
  }

  for (const suffix of orgSuffixes) {
    if (text.endsWith(suffix)) return 'organization';
  }

  // Check for known patterns
  if (/^(President|Senator|Governor|Mayor|Dr|Mr|Mrs|Ms)\b/.test(text)) {
    return 'person';
  }

  // Default to other
  return 'other';
}

/**
 * Extract keywords from text (simple TF approach)
 */
export function extractKeywords(text: string, maxKeywords = 10): string[] {
  // Normalize text
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Count word frequencies
  const words = normalized.split(' ');
  const freq: Map<string, number> = new Map();

  // Stop words to skip
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'also', 'now', 'new', 'said', 'says', 'according', 'about', 'after',
    'before', 'between', 'into', 'through', 'during', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'out', 'up', 'down',
  ]);

  for (const word of words) {
    if (word.length < 3) continue;
    if (stopWords.has(word)) continue;
    if (/^\d+$/.test(word)) continue;

    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency and return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// ============================================================================
// Similarity Calculation
// ============================================================================

/**
 * Calculate similarity between two articles based on:
 * - Entity overlap
 * - Keyword overlap
 * - Title similarity
 */
export function calculateSimilarity(a: NewsArticle, b: NewsArticle): number {
  // Extract entities and keywords if not already present
  const aEntities = a.entities.length > 0 ? a.entities : extractEntities(`${a.title} ${a.summary}`);
  const bEntities = b.entities.length > 0 ? b.entities : extractEntities(`${b.title} ${b.summary}`);

  const aKeywords = extractKeywords(`${a.title} ${a.summary}`);
  const bKeywords = extractKeywords(`${b.title} ${b.summary}`);

  // Entity overlap (Jaccard similarity)
  const aEntityTexts = new Set(aEntities.map(e => e.text.toLowerCase()));
  const bEntityTexts = new Set(bEntities.map(e => e.text.toLowerCase()));
  const entityIntersection = new Set([...aEntityTexts].filter(x => bEntityTexts.has(x)));
  const entityUnion = new Set([...aEntityTexts, ...bEntityTexts]);
  const entitySimilarity = entityUnion.size > 0
    ? entityIntersection.size / entityUnion.size
    : 0;

  // Keyword overlap
  const aKeywordSet = new Set(aKeywords);
  const bKeywordSet = new Set(bKeywords);
  const keywordIntersection = new Set([...aKeywordSet].filter(x => bKeywordSet.has(x)));
  const keywordUnion = new Set([...aKeywordSet, ...bKeywordSet]);
  const keywordSimilarity = keywordUnion.size > 0
    ? keywordIntersection.size / keywordUnion.size
    : 0;

  // Title word overlap
  const aTitleWords = new Set(a.title.toLowerCase().split(/\s+/));
  const bTitleWords = new Set(b.title.toLowerCase().split(/\s+/));
  const titleIntersection = new Set([...aTitleWords].filter(x => bTitleWords.has(x)));
  const titleUnion = new Set([...aTitleWords, ...bTitleWords]);
  const titleSimilarity = titleUnion.size > 0
    ? titleIntersection.size / titleUnion.size
    : 0;

  // Weighted combination
  return (
    entitySimilarity * 0.4 +
    keywordSimilarity * 0.35 +
    titleSimilarity * 0.25
  );
}

// ============================================================================
// Story Aggregator
// ============================================================================

export class StoryAggregator {
  private config: AggregationConfig;

  constructor(config?: Partial<AggregationConfig>) {
    this.config = {
      similarityThreshold: 0.3,
      timeWindowHours: 48,
      minArticlesPerStory: 2,
      ...config,
    };
  }

  /**
   * Aggregate articles into stories
   */
  aggregate(articles: NewsArticle[]): AggregatedStory[] {
    // Filter by time window
    const cutoff = new Date(
      Date.now() - this.config.timeWindowHours * 60 * 60 * 1000
    );
    const recentArticles = articles.filter(a => a.publishedAt >= cutoff);

    // Enrich articles with entities if not present
    for (const article of recentArticles) {
      if (article.entities.length === 0) {
        article.entities = extractEntities(`${article.title} ${article.summary}`);
      }
    }

    // Build similarity graph and cluster
    const clusters = this.clusterArticles(recentArticles);

    // Convert clusters to stories
    const stories: AggregatedStory[] = [];

    for (const cluster of clusters) {
      if (cluster.length < this.config.minArticlesPerStory) continue;

      const story = this.createStory(cluster);
      stories.push(story);
    }

    // Sort by number of sources (more coverage = more important)
    return stories.sort((a, b) =>
      b.coverageAnalysis.sourceCount - a.coverageAnalysis.sourceCount
    );
  }

  /**
   * Cluster articles using simple greedy algorithm
   * In production, you'd use proper clustering (DBSCAN, hierarchical, etc.)
   */
  private clusterArticles(articles: NewsArticle[]): NewsArticle[][] {
    const clusters: NewsArticle[][] = [];
    const assigned = new Set<string>();

    // Sort by publish date (newest first)
    const sorted = [...articles].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );

    for (const article of sorted) {
      if (assigned.has(article.id)) continue;

      // Start a new cluster with this article
      const cluster: NewsArticle[] = [article];
      assigned.add(article.id);

      // Find all similar unassigned articles
      for (const candidate of sorted) {
        if (assigned.has(candidate.id)) continue;
        if (candidate.sourceId === article.sourceId) continue; // Different sources only

        const similarity = calculateSimilarity(article, candidate);
        if (similarity >= this.config.similarityThreshold) {
          cluster.push(candidate);
          assigned.add(candidate.id);
        }
      }

      if (cluster.length >= this.config.minArticlesPerStory) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Create an AggregatedStory from a cluster of articles
   */
  private createStory(articles: NewsArticle[]): AggregatedStory {
    // Generate ID from first article
    const id = `story-${articles[0]?.id || 'unknown'}`;

    // Find common entities
    const entityCounts = new Map<string, { entity: ExtractedEntity; sources: Set<string> }>();

    for (const article of articles) {
      for (const entity of article.entities) {
        const key = entity.text.toLowerCase();
        const existing = entityCounts.get(key);

        if (existing) {
          existing.entity.count += entity.count;
          existing.sources.add(article.sourceId);
        } else {
          entityCounts.set(key, {
            entity: { ...entity },
            sources: new Set([article.sourceId]),
          });
        }
      }
    }

    // Common entities appear in multiple sources
    const commonEntities = Array.from(entityCounts.values())
      .filter(e => e.sources.size >= 2)
      .map(e => e.entity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Extract keywords from all articles
    const allText = articles.map(a => `${a.title} ${a.summary}`).join(' ');
    const keywords = extractKeywords(allText, 10);

    // Generate headline (use most reliable source's title or create composite)
    const headline = this.generateHeadline(articles);

    // Generate summary
    const summary = this.generateSummary(articles, commonEntities);

    // Timestamps
    const firstSeen = new Date(
      Math.min(...articles.map(a => a.publishedAt.getTime()))
    );
    const lastUpdated = new Date(
      Math.max(...articles.map(a => a.publishedAt.getTime()))
    );

    // Analyze coverage
    const coverageAnalysis = this.analyzeCoverage(articles);

    return {
      id,
      headline,
      summary,
      articles,
      commonEntities,
      keywords,
      firstSeen,
      lastUpdated,
      coverageAnalysis,
    };
  }

  /**
   * Generate a headline for the story
   */
  private generateHeadline(articles: NewsArticle[]): string {
    // Prefer wire services (most neutral)
    const wireArticle = articles.find(a => {
      const source = getSource(a.sourceId);
      return source?.category === 'wire';
    });

    if (wireArticle) {
      return wireArticle.title;
    }

    // Fall back to highest reliability source
    let bestArticle = articles[0];
    let bestScore = 0;

    for (const article of articles) {
      const source = getSource(article.sourceId);
      if (source && source.reliabilityScore > bestScore) {
        bestScore = source.reliabilityScore;
        bestArticle = article;
      }
    }

    return bestArticle?.title || 'Untitled Story';
  }

  /**
   * Generate a summary from common entities
   */
  private generateSummary(
    articles: NewsArticle[],
    entities: ExtractedEntity[]
  ): string {
    const sourceCount = new Set(articles.map(a => a.sourceId)).size;
    const topEntities = entities.slice(0, 3).map(e => e.text).join(', ');

    return `Story covered by ${sourceCount} sources. Key entities: ${topEntities || 'N/A'}.`;
  }

  /**
   * Analyze coverage patterns across sources
   */
  private analyzeCoverage(articles: NewsArticle[]): CoverageAnalysis {
    const sources = new Set(articles.map(a => a.sourceId));
    const sourceCount = sources.size;

    // Calculate lean distribution
    const leanDistribution = { left: 0, center: 0, right: 0 };
    const biasScores: BiasIndicators[] = [];

    for (const article of articles) {
      const source = getSource(article.sourceId);
      if (!source) continue;

      const lean = source.knownBias.politicalLean;
      if (lean < -0.2) leanDistribution.left++;
      else if (lean > 0.2) leanDistribution.right++;
      else leanDistribution.center++;

      biasScores.push(source.knownBias);
    }

    // Calculate average bias
    const averageBias: BiasIndicators = {
      politicalLean: this.average(biasScores.map(b => b.politicalLean)),
      sensationalism: this.average(biasScores.map(b => b.sensationalism)),
      factualAccuracy: this.average(biasScores.map(b => b.factualAccuracy)),
      opinionMixing: this.average(biasScores.map(b => b.opinionMixing)),
      transparency: this.average(biasScores.map(b => b.transparency)),
    };

    // Determine coverage balance
    let coverageBalance: CoverageAnalysis['coverageBalance'];
    if (sourceCount < 3) {
      coverageBalance = 'limited';
    } else if (leanDistribution.left > leanDistribution.right * 2) {
      coverageBalance = 'left-heavy';
    } else if (leanDistribution.right > leanDistribution.left * 2) {
      coverageBalance = 'right-heavy';
    } else {
      coverageBalance = 'balanced';
    }

    // Detect framing differences (simplified)
    const framingDifferences = this.detectFramingDifferences(articles);

    return {
      sourceCount,
      leanDistribution,
      averageBias,
      framingDifferences,
      coverageBalance,
    };
  }

  /**
   * Detect different framing across sources
   */
  private detectFramingDifferences(articles: NewsArticle[]): FramingDifference[] {
    // This is a placeholder - real implementation would use NLP
    // to detect different frames, emphasis, word choices, etc.

    // For now, just note title variations
    if (articles.length < 2) return [];

    return [{
      aspect: 'headline',
      perspectives: articles.slice(0, 3).map(a => ({
        sourceId: a.sourceId,
        framing: a.title,
      })),
    }];
  }

  /**
   * Calculate average of numbers
   */
  private average(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}

/**
 * Create a default story aggregator
 */
export function createStoryAggregator(
  config?: Partial<AggregationConfig>
): StoryAggregator {
  return new StoryAggregator(config);
}
