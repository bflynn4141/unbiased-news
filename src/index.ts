/**
 * Unbiased News Aggregator
 *
 * Main entry point exporting all public APIs.
 */

// Types
export * from './types/index.js';

// Core modules
export { RssAdapter, createRssAdapter } from './core/sources/rss-adapter.js';
export {
  ALL_SOURCES,
  getSource,
  getEnabledSources,
  getSourcesByCategory,
  getSourcesByLean,
  getBalancedSources,
} from './core/sources/registry.js';

export { BiasAnalyzer, createBiasAnalyzer } from './core/bias/analyzer.js';

export {
  StoryAggregator,
  createStoryAggregator,
  extractEntities,
  extractKeywords,
  calculateSimilarity,
} from './core/aggregator/story-aggregator.js';

// API types (placeholder)
export type {
  ApiResponse,
  PaginatedResponse,
  GetNewsRequest,
  GetStoriesRequest,
  AnalyzeBiasRequest,
  ArticleDto,
  StoryDto,
  SourceDto,
  BiasAnalysisDto,
} from './api/index.js';
