/**
 * API Layer (Placeholder)
 *
 * Future home of REST/GraphQL API endpoints.
 *
 * Planned endpoints:
 * - GET /api/news - Fetch latest news
 * - GET /api/news/:id - Get specific article
 * - GET /api/stories - Get aggregated stories
 * - GET /api/stories/:id - Get specific story with all coverage
 * - GET /api/sources - List sources
 * - POST /api/analyze - Analyze bias in text
 *
 * Implementation options:
 * - Express.js for traditional REST
 * - Hono for edge-compatible lightweight API
 * - tRPC for type-safe API
 * - GraphQL with Apollo or Yoga
 *
 * For now, this is just a placeholder. The actual implementation
 * would depend on deployment target (Node.js server, Cloudflare Workers, etc.)
 */

import type { NewsArticle, AggregatedStory, BiasAnalysis, NewsSource } from '../types/index.js';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// API Request Types
// ============================================================================

export interface GetNewsRequest {
  sources?: string[];
  balanced?: boolean;
  topic?: string;
  page?: number;
  perPage?: number;
}

export interface GetStoriesRequest {
  minSources?: number;
  topic?: string;
  page?: number;
  perPage?: number;
}

export interface AnalyzeBiasRequest {
  text: string;
  method?: 'static' | 'heuristic' | 'combined';
  includeEvidence?: boolean;
}

// ============================================================================
// API Response DTOs
// ============================================================================

export interface ArticleDto {
  id: string;
  title: string;
  source: {
    id: string;
    name: string;
    lean: string;
  };
  url: string;
  publishedAt: string;
  summary: string;
  imageUrl?: string;
}

export interface StoryDto {
  id: string;
  headline: string;
  summary: string;
  keywords: string[];
  coverage: {
    sourceCount: number;
    balance: string;
    distribution: {
      left: number;
      center: number;
      right: number;
    };
  };
  articles: ArticleDto[];
  firstSeen: string;
  lastUpdated: string;
}

export interface SourceDto {
  id: string;
  name: string;
  url: string;
  category: string;
  bias: {
    politicalLean: number;
    leanLabel: string;
    sensationalism: number;
    factualAccuracy: number;
  };
  reliabilityScore: number;
  enabled: boolean;
}

export interface BiasAnalysisDto {
  politicalLean: {
    score: number;
    label: string;
  };
  sensationalism: {
    score: number;
    level: string;
  };
  opinionMixing: {
    score: number;
    level: string;
  };
  factualAccuracy: {
    score: number;
  };
  transparency: {
    score: number;
    level: string;
  };
  summary: string;
  confidence: number;
  evidence?: Array<{
    text: string;
    type: string;
    explanation: string;
  }>;
}

// ============================================================================
// Placeholder API Class
// ============================================================================

/**
 * Placeholder API service.
 *
 * In a real implementation, this would be a router/controller
 * for an HTTP framework like Express, Hono, or Fastify.
 */
export class NewsApi {
  /**
   * Example of how the API would be structured.
   * This is just for documentation purposes.
   */
  static routes = {
    'GET /api/news': 'getNews',
    'GET /api/news/:id': 'getArticle',
    'GET /api/stories': 'getStories',
    'GET /api/stories/:id': 'getStory',
    'GET /api/sources': 'getSources',
    'GET /api/sources/:id': 'getSource',
    'POST /api/analyze': 'analyzeBias',
  };

  // These methods would be implemented to work with the core modules
  // For now, they're just type signatures

  async getNews(_request: GetNewsRequest): Promise<PaginatedResponse<ArticleDto>> {
    throw new Error('Not implemented');
  }

  async getStories(_request: GetStoriesRequest): Promise<PaginatedResponse<StoryDto>> {
    throw new Error('Not implemented');
  }

  async analyzeBias(_request: AnalyzeBiasRequest): Promise<ApiResponse<BiasAnalysisDto>> {
    throw new Error('Not implemented');
  }
}

/**
 * Future: Export router factory functions for different frameworks
 */
// export function createExpressRouter(): Router { ... }
// export function createHonoApp(): Hono { ... }
// export function createTRPCRouter(): TRPCRouter { ... }
