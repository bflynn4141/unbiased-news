export type PoliticalLean = 'left' | 'left-center' | 'center' | 'right-center' | 'right';

// ─────────────────────────────────────────────────────────────────────────────
// Article Types (Raw ingested articles before clustering into stories)
// ─────────────────────────────────────────────────────────────────────────────

export interface Article {
  id: string; // Hash of URL for deduplication
  title: string;
  description: string | null;
  content: string | null; // Truncated content from NewsAPI
  url: string;
  urlToImage: string | null;
  publishedAt: string; // ISO timestamp
  source: {
    id: string | null;
    name: string;
  };
  // Enriched fields (added during ingestion)
  biasScore: number;
  lean: PoliticalLean;
  ingestedAt: string; // When we fetched it
  storyId?: string; // Set after clustering
}

export type StoryVelocity = 'fast' | 'medium' | 'slow';

export interface Source {
  name: string;
  lean: PoliticalLean;
  biasScore: number; // 0-100 (0=far left, 100=far right)
  url: string;
  headline: string;
  snippet: string;
  publishedAt: string;
}

export interface BiasAnalysis {
  leftPerspective: string;
  rightPerspective: string;
  agreedFacts: string[];
  keyDifferences: string[];
  unansweredQuestions: string[];
}

export interface PredictionMarket {
  platform: 'polymarket' | 'kalshi';
  question: string;
  probability: number;
  volume: number;
  url: string;
  updatedAt: string; // ISO timestamp of last price update
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  velocity: StoryVelocity;
  velocityScore: number; // Number of new articles (fast=last hour, medium=today)
  updatedAt: string;
  sources: Source[];
  analysis: BiasAnalysis;
  predictionMarkets?: PredictionMarket[];
  coverageBalance: {
    left: number;
    center: number;
    right: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Balanced Summary Types (Wikipedia NPOV-style comprehensive summaries)
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  date: string;
  event: string;
  sources: string[];
}

export interface KeyFigure {
  name: string;
  role: string;
  background: string;
  sources: string[];
}

export interface VerifiedFact {
  fact: string;
  sources: string[];
}

export interface DisputedTopic {
  topic: string;
  perspectives: {
    source: string;
    position: string;
  }[];
}

export interface BalancedSummary {
  overview: string;
  timeline: TimelineEvent[];
  keyFigures: KeyFigure[];
  verifiedFacts: VerifiedFact[];
  disputed: DisputedTopic[];
  context: string;
  unclearQuestions: string[];
  generatedAt: string;
  sourceCount: number;
}
