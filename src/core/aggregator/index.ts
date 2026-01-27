/**
 * Story Aggregation Module
 *
 * Groups related articles into stories for cross-source comparison.
 */

export {
  StoryAggregator,
  createStoryAggregator,
  extractEntities,
  extractKeywords,
  calculateSimilarity,
} from './story-aggregator.js';
