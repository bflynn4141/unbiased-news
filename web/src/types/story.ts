export type PoliticalLean = 'left' | 'left-center' | 'center' | 'right-center' | 'right';

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
