/**
 * Bias Analyzer
 *
 * Analyzes articles for various types of bias.
 *
 * Three analysis methods:
 * 1. Static: Uses pre-computed source bias ratings
 * 2. Heuristic: Analyzes text for bias indicators (word choice, framing, etc.)
 * 3. LLM: Uses an AI model for nuanced analysis (not implemented here)
 *
 * The heuristic method looks for:
 * - Loaded language (emotionally charged words)
 * - Sensationalism (clickbait patterns, hyperbole)
 * - Opinion mixing (subjective statements in news)
 * - Attribution patterns (anonymous sources, lack of citation)
 */

import type {
  NewsArticle,
  NewsSource,
  BiasAnalysis,
  BiasIndicators,
  BiasEvidence,
  AnalysisConfig,
} from '../../types/index.js';
import { getSource } from '../sources/registry.js';

// ============================================================================
// Lexicons for Heuristic Analysis
// ============================================================================

/**
 * Words that indicate emotional loading or bias
 * Organized by political lean tendency
 */
const LOADED_LANGUAGE = {
  left: [
    'radical right', 'far-right', 'extremist', 'racist', 'bigot', 'fascist',
    'authoritarian', 'hateful', 'divisive', 'dangerous', 'misinformation',
    'conspiracy theory', 'climate denier', 'assault weapon', 'anti-choice',
    'dark money', 'voter suppression', 'systemic racism', 'white supremacy',
  ],
  right: [
    'radical left', 'far-left', 'socialist', 'communist', 'woke', 'liberal elite',
    'mainstream media', 'fake news', 'deep state', 'open borders', 'defund',
    'cancel culture', 'big government', 'coastal elite', 'pro-abortion',
    'illegal alien', 'indoctrination', 'activist judge', 'weaponized',
  ],
  sensational: [
    'shocking', 'explosive', 'bombshell', 'devastating', 'outrage', 'fury',
    'slam', 'blast', 'rip', 'destroy', 'eviscerate', 'annihilate', 'epic',
    'unbelievable', 'incredible', 'breaking', 'urgent', 'must-see',
    'you won\'t believe', 'what they don\'t want you to know',
  ],
};

/**
 * Patterns indicating opinion mixed with news
 */
const OPINION_INDICATORS = [
  /\b(clearly|obviously|undoubtedly|certainly)\b/gi,
  /\b(should|must|need to|ought to)\b/gi,
  /\b(good|bad|wrong|right|evil|great|terrible|horrible)\b/gi,
  /\b(unfortunately|thankfully|hopefully|surprisingly)\b/gi,
  /\b(critics say|supporters claim|experts warn|some argue)\b/gi,
];

/**
 * Patterns indicating hedging or weak attribution
 */
const WEAK_ATTRIBUTION = [
  /sources? (say|claim|suggest|indicate)/gi,
  /according to (sources|reports|officials)/gi,
  /it is (believed|thought|reported|said)/gi,
  /some (say|believe|think|argue)/gi,
  /many (people|experts|critics)/gi,
  /a source (close to|familiar with)/gi,
];

// ============================================================================
// Bias Analyzer Class
// ============================================================================

export class BiasAnalyzer {
  private config: AnalysisConfig;

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      method: 'combined',
      includeEvidence: true,
      ...config,
    };
  }

  /**
   * Analyze bias in a single article
   */
  async analyze(article: NewsArticle): Promise<BiasAnalysis> {
    const source = getSource(article.sourceId);

    switch (this.config.method) {
      case 'static':
        return this.analyzeStatic(article, source);
      case 'heuristic':
        return this.analyzeHeuristic(article, source);
      case 'llm':
        // Placeholder - would integrate with Claude or other LLM
        throw new Error('LLM analysis not implemented yet');
      case 'combined':
      default:
        return this.analyzeCombined(article, source);
    }
  }

  /**
   * Analyze multiple articles
   */
  async analyzeMany(articles: NewsArticle[]): Promise<Map<string, BiasAnalysis>> {
    const results = new Map<string, BiasAnalysis>();

    for (const article of articles) {
      const analysis = await this.analyze(article);
      results.set(article.id, analysis);
    }

    return results;
  }

  /**
   * Static analysis: Just use source's known bias
   */
  private analyzeStatic(article: NewsArticle, source?: NewsSource): BiasAnalysis {
    if (!source) {
      return this.createUnknownAnalysis('Source not found in registry');
    }

    return {
      indicators: source.knownBias,
      confidence: 0.6, // Lower confidence since we're not analyzing content
      summary: `Based on ${source.name}'s historical bias profile. Political lean: ${this.leanToLabel(source.knownBias.politicalLean)}. Reliability: ${Math.round(source.reliabilityScore * 100)}%.`,
      evidence: [],
      method: 'static',
    };
  }

  /**
   * Heuristic analysis: Analyze text patterns
   */
  private analyzeHeuristic(article: NewsArticle, source?: NewsSource): BiasAnalysis {
    const text = `${article.title} ${article.summary} ${article.content || ''}`.toLowerCase();
    const evidence: BiasEvidence[] = [];

    // Calculate each indicator
    const politicalLean = this.detectPoliticalLean(text, evidence);
    const sensationalism = this.detectSensationalism(text, article.title, evidence);
    const opinionMixing = this.detectOpinionMixing(text, evidence);
    const transparency = this.detectTransparency(text, evidence);

    // Factual accuracy can't be determined from text alone
    // Use source's rating or default
    const factualAccuracy = source?.knownBias.factualAccuracy ?? 0.7;

    const indicators: BiasIndicators = {
      politicalLean,
      sensationalism,
      factualAccuracy,
      opinionMixing,
      transparency: 1 - transparency, // Higher transparency = good, but we count weak attribution
    };

    // Calculate confidence based on text length
    const textLength = text.length;
    const confidence = Math.min(0.9, 0.5 + (textLength / 5000) * 0.4);

    return {
      indicators,
      confidence,
      summary: this.generateSummary(indicators),
      evidence: this.config.includeEvidence ? evidence : [],
      method: 'heuristic',
    };
  }

  /**
   * Combined analysis: Merge static and heuristic
   */
  private analyzeCombined(article: NewsArticle, source?: NewsSource): BiasAnalysis {
    const staticAnalysis = this.analyzeStatic(article, source);
    const heuristicAnalysis = this.analyzeHeuristic(article, source);

    // Weight towards heuristic if we have content, static if we don't
    const hasContent = article.content && article.content.length > 200;
    const staticWeight = hasContent ? 0.3 : 0.7;
    const heuristicWeight = 1 - staticWeight;

    const indicators: BiasIndicators = {
      politicalLean:
        staticAnalysis.indicators.politicalLean * staticWeight +
        heuristicAnalysis.indicators.politicalLean * heuristicWeight,
      sensationalism:
        staticAnalysis.indicators.sensationalism * staticWeight +
        heuristicAnalysis.indicators.sensationalism * heuristicWeight,
      factualAccuracy:
        staticAnalysis.indicators.factualAccuracy * staticWeight +
        heuristicAnalysis.indicators.factualAccuracy * heuristicWeight,
      opinionMixing:
        staticAnalysis.indicators.opinionMixing * staticWeight +
        heuristicAnalysis.indicators.opinionMixing * heuristicWeight,
      transparency:
        staticAnalysis.indicators.transparency * staticWeight +
        heuristicAnalysis.indicators.transparency * heuristicWeight,
    };

    const confidence =
      staticAnalysis.confidence * staticWeight +
      heuristicAnalysis.confidence * heuristicWeight;

    return {
      indicators,
      confidence,
      summary: this.generateSummary(indicators),
      evidence: heuristicAnalysis.evidence,
      method: 'combined',
    };
  }

  /**
   * Detect political lean from loaded language
   */
  private detectPoliticalLean(text: string, evidence: BiasEvidence[]): number {
    let leftScore = 0;
    let rightScore = 0;

    for (const term of LOADED_LANGUAGE.left) {
      const matches = text.match(new RegExp(term, 'gi'));
      if (matches) {
        leftScore += matches.length;
        if (this.config.includeEvidence) {
          evidence.push({
            text: term,
            indicatorType: 'politicalLean',
            explanation: `Left-leaning framing: "${term}"`,
          });
        }
      }
    }

    for (const term of LOADED_LANGUAGE.right) {
      const matches = text.match(new RegExp(term, 'gi'));
      if (matches) {
        rightScore += matches.length;
        if (this.config.includeEvidence) {
          evidence.push({
            text: term,
            indicatorType: 'politicalLean',
            explanation: `Right-leaning framing: "${term}"`,
          });
        }
      }
    }

    // Normalize to -1 to 1 scale
    const total = leftScore + rightScore;
    if (total === 0) return 0;

    // More right terms = positive, more left terms = negative
    return (rightScore - leftScore) / total;
  }

  /**
   * Detect sensationalism from word choice and title patterns
   */
  private detectSensationalism(
    text: string,
    title: string,
    evidence: BiasEvidence[]
  ): number {
    let score = 0;
    const maxScore = 10;

    // Check for sensational words
    for (const term of LOADED_LANGUAGE.sensational) {
      const matches = text.match(new RegExp(`\\b${term}\\b`, 'gi'));
      if (matches) {
        score += matches.length * 0.5;
        if (this.config.includeEvidence && matches.length > 0) {
          evidence.push({
            text: term,
            indicatorType: 'sensationalism',
            explanation: `Sensational language: "${term}"`,
          });
        }
      }
    }

    // Check title for clickbait patterns
    const titleLower = title.toLowerCase();
    if (titleLower.includes('!')) score += 1;
    if (titleLower.includes('?') && titleLower.length < 50) score += 0.5;
    if (/\d+ (things|reasons|ways)/.test(titleLower)) score += 1;
    if (/you (won't|need to|should)/.test(titleLower)) score += 1.5;
    if (title === title.toUpperCase()) score += 2;

    return Math.min(1, score / maxScore);
  }

  /**
   * Detect opinion mixing with news
   */
  private detectOpinionMixing(text: string, evidence: BiasEvidence[]): number {
    let score = 0;
    const textLength = text.length;
    const maxScore = Math.max(5, textLength / 500); // Scale with text length

    for (const pattern of OPINION_INDICATORS) {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * 0.5;
        if (this.config.includeEvidence && matches.length > 0) {
          evidence.push({
            text: matches[0] || '',
            indicatorType: 'opinionMixing',
            explanation: `Opinion indicator: "${matches[0]}"`,
          });
        }
      }
    }

    return Math.min(1, score / maxScore);
  }

  /**
   * Detect transparency issues (weak attribution)
   */
  private detectTransparency(text: string, evidence: BiasEvidence[]): number {
    let score = 0;
    const maxScore = 5;

    for (const pattern of WEAK_ATTRIBUTION) {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
        if (this.config.includeEvidence && matches.length > 0) {
          evidence.push({
            text: matches[0] || '',
            indicatorType: 'transparency',
            explanation: `Weak attribution: "${matches[0]}"`,
          });
        }
      }
    }

    return Math.min(1, score / maxScore);
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(indicators: BiasIndicators): string {
    const parts: string[] = [];

    // Political lean
    const leanLabel = this.leanToLabel(indicators.politicalLean);
    parts.push(`Political lean: ${leanLabel}`);

    // Sensationalism
    if (indicators.sensationalism > 0.6) {
      parts.push('High sensationalism detected');
    } else if (indicators.sensationalism > 0.3) {
      parts.push('Moderate sensationalism');
    }

    // Opinion mixing
    if (indicators.opinionMixing > 0.5) {
      parts.push('Opinion mixed with news');
    }

    // Transparency
    if (indicators.transparency < 0.5) {
      parts.push('Weak source attribution');
    }

    return parts.join('. ') + '.';
  }

  /**
   * Convert numeric lean to label
   */
  private leanToLabel(lean: number): string {
    if (lean <= -0.6) return 'Far Left';
    if (lean <= -0.3) return 'Left';
    if (lean <= -0.1) return 'Lean Left';
    if (lean >= 0.6) return 'Far Right';
    if (lean >= 0.3) return 'Right';
    if (lean >= 0.1) return 'Lean Right';
    return 'Center';
  }

  /**
   * Create an analysis for unknown sources
   */
  private createUnknownAnalysis(reason: string): BiasAnalysis {
    return {
      indicators: {
        politicalLean: 0,
        sensationalism: 0.5,
        factualAccuracy: 0.5,
        opinionMixing: 0.5,
        transparency: 0.5,
      },
      confidence: 0.1,
      summary: `Unable to analyze: ${reason}`,
      evidence: [],
      method: 'static',
    };
  }
}

/**
 * Create a default bias analyzer
 */
export function createBiasAnalyzer(config?: Partial<AnalysisConfig>): BiasAnalyzer {
  return new BiasAnalyzer(config);
}
