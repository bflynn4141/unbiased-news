/**
 * Core types for the unbiased news aggregator
 *
 * Design Philosophy:
 * - Types are immutable where possible (readonly)
 * - Bias is multi-dimensional, not a single left-right score
 * - Articles are linked to sources, sources have known characteristics
 * - Aggregated stories group articles covering the same event/topic
 */

import { z } from 'zod';

// ============================================================================
// Bias & Reliability Types
// ============================================================================

/**
 * Political lean on a -1 to 1 scale
 * -1 = far left, 0 = center, 1 = far right
 *
 * Note: This is an oversimplification. Real bias is multi-dimensional.
 * We use this as a starting heuristic, not gospel truth.
 */
export type PoliticalLean = number;

/**
 * Multi-dimensional bias indicators
 * Rather than reducing bias to left/right, we track multiple dimensions
 */
export interface BiasIndicators {
  /** Political lean (-1 to 1) - the traditional spectrum */
  politicalLean: PoliticalLean;

  /** Sensationalism score (0-1) - clickbait, emotional manipulation */
  sensationalism: number;

  /** Factual accuracy (0-1) - based on fact-check history */
  factualAccuracy: number;

  /** Opinion vs news mixing (0-1) - 0 = pure news, 1 = heavy opinion */
  opinionMixing: number;

  /** Source transparency (0-1) - do they cite sources, show methodology */
  transparency: number;
}

/**
 * Bias analysis result for an article or source
 */
export interface BiasAnalysis {
  /** The indicators themselves */
  indicators: BiasIndicators;

  /** Confidence in the analysis (0-1) */
  confidence: number;

  /** Human-readable explanation */
  summary: string;

  /** Specific examples from the content that informed the analysis */
  evidence: BiasEvidence[];

  /** How was this analysis generated? */
  method: 'static' | 'heuristic' | 'llm' | 'combined';
}

export interface BiasEvidence {
  /** The text snippet that shows bias */
  text: string;

  /** What type of bias indicator this represents */
  indicatorType: keyof BiasIndicators;

  /** Explanation of why this is evidence of bias */
  explanation: string;
}

// ============================================================================
// News Source Types
// ============================================================================

/**
 * A news source/outlet configuration
 */
export interface NewsSource {
  /** Unique identifier (e.g., 'nyt', 'fox-news', 'ap') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Source's main URL */
  url: string;

  /** RSS feed URLs for this source */
  feeds: RssFeed[];

  /** Pre-computed bias indicators for this source */
  knownBias: BiasIndicators;

  /** How reliable is this source overall? (0-1) */
  reliabilityScore: number;

  /** Source category */
  category: SourceCategory;

  /** Is this source currently enabled for fetching? */
  enabled: boolean;

  /** Additional metadata */
  metadata: {
    /** Country of origin */
    country?: string;
    /** Primary language */
    language?: string;
    /** Founded year */
    founded?: number;
    /** Ownership info */
    ownership?: string;
  };
}

export type SourceCategory =
  | 'mainstream'      // Major national outlets (NYT, WSJ, etc.)
  | 'wire'            // Wire services (AP, Reuters, AFP)
  | 'broadcast'       // TV networks (CNN, Fox, MSNBC)
  | 'digital-native'  // Born online (Vox, Daily Wire, Axios)
  | 'public'          // Public broadcasters (NPR, BBC, PBS)
  | 'local'           // Local news
  | 'international'   // Foreign outlets covering US (Guardian, Al Jazeera)
  | 'independent';    // Independent/alternative media

export interface RssFeed {
  /** Feed URL */
  url: string;

  /** What section/topic this feed covers */
  section: string;

  /** Priority for fetching (lower = fetch first) */
  priority: number;
}

// ============================================================================
// Article Types
// ============================================================================

/**
 * A single news article
 */
export interface NewsArticle {
  /** Unique identifier (hash of url) */
  id: string;

  /** Article title */
  title: string;

  /** Source this came from */
  sourceId: string;

  /** Direct URL to the article */
  url: string;

  /** When the article was published */
  publishedAt: Date;

  /** When we fetched this article */
  fetchedAt: Date;

  /** Article summary/description from RSS */
  summary: string;

  /** Full article content (if fetched) */
  content?: string;

  /** Author(s) if available */
  authors: string[];

  /** Categories/tags from the source */
  categories: string[];

  /** Extracted entities (people, places, organizations) */
  entities: ExtractedEntity[];

  /** Bias analysis (if performed) */
  biasAnalysis?: BiasAnalysis;

  /** Image URL if available */
  imageUrl?: string;
}

export interface ExtractedEntity {
  /** The entity text */
  text: string;

  /** Entity type */
  type: 'person' | 'organization' | 'location' | 'event' | 'other';

  /** How many times this entity appears */
  count: number;
}

// ============================================================================
// Aggregation Types
// ============================================================================

/**
 * An aggregated story groups multiple articles covering the same event/topic
 * This is the key to showing "how different sources cover the same story"
 */
export interface AggregatedStory {
  /** Unique identifier */
  id: string;

  /** Generated headline that represents the story */
  headline: string;

  /** Brief summary of the story */
  summary: string;

  /** Articles that are part of this story */
  articles: NewsArticle[];

  /** Common entities across articles */
  commonEntities: ExtractedEntity[];

  /** Keywords that link these articles */
  keywords: string[];

  /** When the story first appeared */
  firstSeen: Date;

  /** When the story was last updated */
  lastUpdated: Date;

  /** Aggregate bias analysis across sources */
  coverageAnalysis: CoverageAnalysis;
}

/**
 * Analysis of how a story is covered across sources
 */
export interface CoverageAnalysis {
  /** How many sources are covering this? */
  sourceCount: number;

  /** Distribution of political lean across coverage */
  leanDistribution: {
    left: number;    // Count of left-leaning sources
    center: number;  // Count of center sources
    right: number;   // Count of right-leaning sources
  };

  /** Average bias indicators across all articles */
  averageBias: BiasIndicators;

  /** Key differences in how sources frame the story */
  framingDifferences: FramingDifference[];

  /** Is this story getting balanced coverage? */
  coverageBalance: 'balanced' | 'left-heavy' | 'right-heavy' | 'limited';
}

export interface FramingDifference {
  /** What aspect differs */
  aspect: string;

  /** How different sources frame it */
  perspectives: {
    sourceId: string;
    framing: string;
  }[];
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const BiasIndicatorsSchema = z.object({
  politicalLean: z.number().min(-1).max(1),
  sensationalism: z.number().min(0).max(1),
  factualAccuracy: z.number().min(0).max(1),
  opinionMixing: z.number().min(0).max(1),
  transparency: z.number().min(0).max(1),
});

export const NewsSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  feeds: z.array(z.object({
    url: z.string().url(),
    section: z.string(),
    priority: z.number(),
  })),
  knownBias: BiasIndicatorsSchema,
  reliabilityScore: z.number().min(0).max(1),
  category: z.enum([
    'mainstream', 'wire', 'broadcast', 'digital-native',
    'public', 'local', 'international', 'independent'
  ]),
  enabled: z.boolean(),
  metadata: z.object({
    country: z.string().optional(),
    language: z.string().optional(),
    founded: z.number().optional(),
    ownership: z.string().optional(),
  }),
});

// ============================================================================
// Utility Types
// ============================================================================

export interface FetchResult {
  source: NewsSource;
  articles: NewsArticle[];
  errors: string[];
  fetchedAt: Date;
}

export interface AggregationConfig {
  /** Minimum similarity score to group articles (0-1) */
  similarityThreshold: number;

  /** Maximum time window for grouping (hours) */
  timeWindowHours: number;

  /** Minimum articles needed to form a story */
  minArticlesPerStory: number;
}

export interface AnalysisConfig {
  /** Which analysis method to use */
  method: 'static' | 'heuristic' | 'llm' | 'combined';

  /** For LLM analysis: which model to use */
  llmModel?: string;

  /** Include evidence snippets? */
  includeEvidence: boolean;
}
