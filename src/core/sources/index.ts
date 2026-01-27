/**
 * News Sources Module
 *
 * Provides news source configurations and RSS fetching.
 */

export { RssAdapter, createRssAdapter } from './rss-adapter.js';
export {
  ALL_SOURCES,
  getSource,
  getEnabledSources,
  getSourcesByCategory,
  getSourcesByLean,
  getBalancedSources,
} from './registry.js';
