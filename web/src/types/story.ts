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
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  velocity: StoryVelocity;
  velocityScore: number; // 1-100, how fast story is developing
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
