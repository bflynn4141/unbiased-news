#!/usr/bin/env node
/**
 * MCP Server for Unbiased News
 *
 * Exposes the news aggregator functionality through the Model Context Protocol.
 *
 * Tools:
 * - get_news: Fetch latest news from sources
 * - analyze_bias: Analyze bias in articles or text
 * - compare_sources: Compare how different sources cover a story
 * - list_sources: List available news sources
 *
 * Resources:
 * - news://sources - List of configured sources
 * - news://stories - Aggregated stories
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { createRssAdapter } from '../core/sources/rss-adapter.js';
import { createBiasAnalyzer } from '../core/bias/analyzer.js';
import { createStoryAggregator, extractKeywords, extractEntities } from '../core/aggregator/story-aggregator.js';
import {
  ALL_SOURCES,
  getSource,
  getEnabledSources,
  getBalancedSources,
} from '../core/sources/registry.js';
import type { NewsArticle, AggregatedStory } from '../types/index.js';

// ============================================================================
// Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'unbiased-news',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Cache for recent fetches
let articleCache: NewsArticle[] = [];
let storyCache: AggregatedStory[] = [];
let lastFetchTime: Date | null = null;

// ============================================================================
// Tool Definitions
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_news',
        description: 'Fetch the latest news from multiple sources. Returns articles grouped by source with bias indicators. Use this to get a diverse view of current events.',
        inputSchema: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific source IDs to fetch from (e.g., ["ap", "nyt", "fox"]). If not provided, uses a balanced selection.',
            },
            balanced: {
              type: 'boolean',
              description: 'If true, automatically selects sources from across the political spectrum',
              default: true,
            },
            maxArticles: {
              type: 'number',
              description: 'Maximum articles to return per source',
              default: 10,
            },
            topic: {
              type: 'string',
              description: 'Filter articles containing this topic/keyword',
            },
          },
        },
      },
      {
        name: 'analyze_bias',
        description: 'Analyze bias indicators in a piece of text or article. Returns political lean, sensationalism, opinion mixing, and other metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze for bias',
            },
            articleUrl: {
              type: 'string',
              description: 'URL of an article to analyze (alternative to text)',
            },
            method: {
              type: 'string',
              enum: ['static', 'heuristic', 'combined'],
              description: 'Analysis method. "combined" gives the most balanced result.',
              default: 'combined',
            },
            includeEvidence: {
              type: 'boolean',
              description: 'Include specific examples that indicate bias',
              default: true,
            },
          },
        },
      },
      {
        name: 'compare_sources',
        description: 'Compare how different news sources cover the same story. Shows framing differences, bias distribution, and coverage balance.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic or keywords to find related coverage',
            },
            storyId: {
              type: 'string',
              description: 'ID of a previously aggregated story to analyze',
            },
            minSources: {
              type: 'number',
              description: 'Minimum number of sources that must cover the story',
              default: 3,
            },
          },
        },
      },
      {
        name: 'list_sources',
        description: 'List available news sources with their bias profiles. Useful for understanding the source landscape.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['wire', 'mainstream', 'broadcast', 'public', 'digital-native', 'international', 'local', 'independent'],
              description: 'Filter by source category',
            },
            lean: {
              type: 'string',
              enum: ['left', 'center', 'right'],
              description: 'Filter by political lean',
            },
          },
        },
      },
    ],
  };
});

// ============================================================================
// Tool Handlers
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Ensure args is defined
  const toolArgs = args ?? {};

  switch (name) {
    case 'get_news':
      return handleGetNews(toolArgs);
    case 'analyze_bias':
      return handleAnalyzeBias(toolArgs);
    case 'compare_sources':
      return handleCompareSources(toolArgs);
    case 'list_sources':
      return handleListSources(toolArgs);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function handleGetNews(args: Record<string, unknown>) {
  const sourceIds = args.sources as string[] | undefined;
  const balanced = args.balanced as boolean ?? true;
  const maxArticles = args.maxArticles as number ?? 10;
  const topic = args.topic as string | undefined;

  // Determine sources
  let sources;
  if (sourceIds && sourceIds.length > 0) {
    sources = sourceIds.map(id => getSource(id)).filter(s => s !== undefined);
  } else if (balanced) {
    sources = getBalancedSources(6);
  } else {
    sources = getEnabledSources();
  }

  // Fetch articles
  const adapter = createRssAdapter({ maxArticlesPerFeed: maxArticles });
  const results = await adapter.fetchSources(sources);

  // Flatten and optionally filter
  let articles = results.flatMap(r => r.articles);

  if (topic) {
    const topicLower = topic.toLowerCase();
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(topicLower) ||
      a.summary.toLowerCase().includes(topicLower)
    );
  }

  // Update cache
  articleCache = articles;
  lastFetchTime = new Date();

  // Format response
  const response = {
    fetchedAt: lastFetchTime.toISOString(),
    articleCount: articles.length,
    sources: results.map(r => ({
      id: r.source.id,
      name: r.source.name,
      lean: getLeanLabel(r.source.knownBias.politicalLean),
      articleCount: r.articles.length,
      errors: r.errors,
    })),
    articles: articles.slice(0, 20).map(formatArticleForResponse),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

async function handleAnalyzeBias(args: Record<string, unknown>) {
  const text = args.text as string | undefined;
  const method = (args.method as 'static' | 'heuristic' | 'combined') ?? 'combined';
  const includeEvidence = args.includeEvidence as boolean ?? true;

  if (!text) {
    throw new Error('Either "text" or "articleUrl" is required');
  }

  // Create a pseudo-article for analysis
  const article: NewsArticle = {
    id: 'analysis',
    title: text.slice(0, 100),
    sourceId: 'unknown',
    url: '',
    publishedAt: new Date(),
    fetchedAt: new Date(),
    summary: text.slice(0, 500),
    content: text,
    authors: [],
    categories: [],
    entities: extractEntities(text),
  };

  const analyzer = createBiasAnalyzer({ method, includeEvidence });
  const analysis = await analyzer.analyze(article);

  const response = {
    analysis: {
      politicalLean: {
        score: analysis.indicators.politicalLean,
        label: getLeanLabel(analysis.indicators.politicalLean),
      },
      sensationalism: {
        score: analysis.indicators.sensationalism,
        level: analysis.indicators.sensationalism > 0.6 ? 'high' : analysis.indicators.sensationalism > 0.3 ? 'moderate' : 'low',
      },
      opinionMixing: {
        score: analysis.indicators.opinionMixing,
        level: analysis.indicators.opinionMixing > 0.5 ? 'significant' : analysis.indicators.opinionMixing > 0.25 ? 'some' : 'minimal',
      },
      factualAccuracy: {
        score: analysis.indicators.factualAccuracy,
        note: 'Based on source profile; content fact-checking not performed',
      },
      transparency: {
        score: analysis.indicators.transparency,
        level: analysis.indicators.transparency > 0.7 ? 'good' : analysis.indicators.transparency > 0.4 ? 'moderate' : 'weak',
      },
    },
    summary: analysis.summary,
    confidence: analysis.confidence,
    method: analysis.method,
    evidence: includeEvidence ? analysis.evidence : undefined,
    keywords: extractKeywords(text, 5),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

async function handleCompareSources(args: Record<string, unknown>) {
  const topic = args.topic as string | undefined;
  const storyId = args.storyId as string | undefined;
  const minSources = args.minSources as number ?? 3;

  // If we have cached articles, use them; otherwise fetch
  if (articleCache.length === 0 || !lastFetchTime || Date.now() - lastFetchTime.getTime() > 30 * 60 * 1000) {
    const sources = getBalancedSources(9);
    const adapter = createRssAdapter({ maxArticlesPerFeed: 15 });
    const results = await adapter.fetchSources(sources);
    articleCache = results.flatMap(r => r.articles);
    lastFetchTime = new Date();
  }

  // Aggregate
  const aggregator = createStoryAggregator({ minArticlesPerStory: minSources });
  storyCache = aggregator.aggregate(articleCache);

  // Find relevant story
  let story: AggregatedStory | undefined;

  if (storyId) {
    story = storyCache.find(s => s.id === storyId);
  } else if (topic) {
    const topicLower = topic.toLowerCase();
    story = storyCache.find(s =>
      s.headline.toLowerCase().includes(topicLower) ||
      s.keywords.some(k => k.includes(topicLower))
    );
  } else {
    story = storyCache[0]; // Most covered story
  }

  if (!story) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'No matching story found',
            availableStories: storyCache.slice(0, 5).map(s => ({
              id: s.id,
              headline: s.headline,
              sourceCount: s.coverageAnalysis.sourceCount,
            })),
          }, null, 2),
        },
      ],
    };
  }

  const response = {
    story: {
      id: story.id,
      headline: story.headline,
      summary: story.summary,
      keywords: story.keywords,
    },
    coverage: {
      sourceCount: story.coverageAnalysis.sourceCount,
      balance: story.coverageAnalysis.coverageBalance,
      distribution: {
        left: story.coverageAnalysis.leanDistribution.left,
        center: story.coverageAnalysis.leanDistribution.center,
        right: story.coverageAnalysis.leanDistribution.right,
      },
      averageBias: {
        politicalLean: story.coverageAnalysis.averageBias.politicalLean,
        sensationalism: story.coverageAnalysis.averageBias.sensationalism,
      },
    },
    perspectives: story.articles.map(a => {
      const source = getSource(a.sourceId);
      return {
        source: source?.name || a.sourceId,
        lean: source ? getLeanLabel(source.knownBias.politicalLean) : 'Unknown',
        headline: a.title,
        url: a.url,
      };
    }),
    framingDifferences: story.coverageAnalysis.framingDifferences,
    timing: {
      firstSeen: story.firstSeen.toISOString(),
      lastUpdated: story.lastUpdated.toISOString(),
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

function handleListSources(args: Record<string, unknown>) {
  let sources = ALL_SOURCES;

  const category = args.category as string | undefined;
  const lean = args.lean as string | undefined;

  if (category) {
    sources = sources.filter(s => s.category === category);
  }

  if (lean) {
    switch (lean) {
      case 'left':
        sources = sources.filter(s => s.knownBias.politicalLean < -0.2);
        break;
      case 'center':
        sources = sources.filter(s => s.knownBias.politicalLean >= -0.2 && s.knownBias.politicalLean <= 0.2);
        break;
      case 'right':
        sources = sources.filter(s => s.knownBias.politicalLean > 0.2);
        break;
    }
  }

  const response = {
    count: sources.length,
    sources: sources.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      url: s.url,
      bias: {
        politicalLean: s.knownBias.politicalLean,
        leanLabel: getLeanLabel(s.knownBias.politicalLean),
        sensationalism: s.knownBias.sensationalism,
        factualAccuracy: s.knownBias.factualAccuracy,
      },
      reliabilityScore: s.reliabilityScore,
      feedCount: s.feeds.length,
      enabled: s.enabled,
    })),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

// ============================================================================
// Resource Definitions
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'news://sources',
        name: 'News Sources',
        description: 'List of all configured news sources with bias profiles',
        mimeType: 'application/json',
      },
      {
        uri: 'news://stories',
        name: 'Aggregated Stories',
        description: 'Recently aggregated stories (requires fetch first)',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'news://sources':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              ALL_SOURCES.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                politicalLean: getLeanLabel(s.knownBias.politicalLean),
                reliabilityScore: s.reliabilityScore,
              })),
              null,
              2
            ),
          },
        ],
      };

    case 'news://stories':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                cached: storyCache.length > 0,
                lastFetch: lastFetchTime?.toISOString() || null,
                stories: storyCache.slice(0, 10).map(s => ({
                  id: s.id,
                  headline: s.headline,
                  sourceCount: s.coverageAnalysis.sourceCount,
                  balance: s.coverageAnalysis.coverageBalance,
                })),
              },
              null,
              2
            ),
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// ============================================================================
// Helpers
// ============================================================================

function getLeanLabel(lean: number): string {
  if (lean <= -0.6) return 'Far Left';
  if (lean <= -0.3) return 'Left';
  if (lean <= -0.1) return 'Lean Left';
  if (lean >= 0.6) return 'Far Right';
  if (lean >= 0.3) return 'Right';
  if (lean >= 0.1) return 'Lean Right';
  return 'Center';
}

function formatArticleForResponse(article: NewsArticle) {
  const source = getSource(article.sourceId);
  return {
    id: article.id,
    title: article.title,
    source: {
      id: article.sourceId,
      name: source?.name || article.sourceId,
      lean: source ? getLeanLabel(source.knownBias.politicalLean) : 'Unknown',
    },
    url: article.url,
    publishedAt: article.publishedAt.toISOString(),
    summary: article.summary.slice(0, 200),
  };
}

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Unbiased News MCP server running');
}

main().catch(console.error);
