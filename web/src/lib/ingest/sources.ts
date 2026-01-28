/**
 * News Source Bias Metadata
 *
 * Political bias ratings for major news sources.
 * Scores are 0-100 where:
 * - 0-20: Far Left
 * - 20-40: Left / Left-Center
 * - 40-60: Center
 * - 60-80: Right-Center / Right
 * - 80-100: Far Right
 *
 * Sources: AllSides Media Bias Ratings, Ad Fontes Media Bias Chart
 */

import { PoliticalLean } from '@/types/story';

export interface SourceBias {
  lean: PoliticalLean;
  score: number; // 0-100
  reliability: 'high' | 'medium' | 'low'; // Factual reliability
  type: 'mainstream' | 'cable' | 'wire' | 'digital' | 'opinion';
}

/**
 * Static bias ratings for known news sources
 * Used to tag articles and calculate coverage balance
 * Sources: AllSides Media Bias Ratings, Ad Fontes Media Bias Chart
 */
export const SOURCE_BIAS: Record<string, SourceBias> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Wire Services (Most Neutral) - Score: 48-52
  // ═══════════════════════════════════════════════════════════════════════════
  'AP News': { lean: 'center', score: 50, reliability: 'high', type: 'wire' },
  'Associated Press': { lean: 'center', score: 50, reliability: 'high', type: 'wire' },
  Reuters: { lean: 'center', score: 50, reliability: 'high', type: 'wire' },
  AFP: { lean: 'center', score: 50, reliability: 'high', type: 'wire' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Public Broadcasting - Score: 46-52
  // ═══════════════════════════════════════════════════════════════════════════
  PBS: { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  NPR: { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  'NPR Politics': { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  'PBS NewsHour': { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  BBC: { lean: 'center', score: 50, reliability: 'high', type: 'mainstream' },
  'BBC News': { lean: 'center', score: 50, reliability: 'high', type: 'mainstream' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Center / Business - Score: 45-55
  // ═══════════════════════════════════════════════════════════════════════════
  'The Hill': { lean: 'center', score: 52, reliability: 'high', type: 'digital' },
  Bloomberg: { lean: 'center', score: 52, reliability: 'high', type: 'mainstream' },
  CNBC: { lean: 'center', score: 51, reliability: 'high', type: 'cable' },
  'CBS News': { lean: 'center', score: 50, reliability: 'high', type: 'mainstream' },
  'ABC News': { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  'USA Today': { lean: 'center', score: 50, reliability: 'medium', type: 'mainstream' },
  Axios: { lean: 'center', score: 50, reliability: 'high', type: 'digital' },
  Politico: { lean: 'center', score: 48, reliability: 'high', type: 'digital' },
  'The Economist': { lean: 'center', score: 52, reliability: 'high', type: 'mainstream' },
  'Financial Times': { lean: 'center', score: 52, reliability: 'high', type: 'mainstream' },
  MarketWatch: { lean: 'center', score: 51, reliability: 'medium', type: 'digital' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Left-Center - Score: 30-44
  // ═══════════════════════════════════════════════════════════════════════════
  'New York Times': { lean: 'left-center', score: 33, reliability: 'high', type: 'mainstream' },
  'The New York Times': { lean: 'left-center', score: 33, reliability: 'high', type: 'mainstream' },
  'Washington Post': { lean: 'left-center', score: 35, reliability: 'high', type: 'mainstream' },
  'The Washington Post': { lean: 'left-center', score: 35, reliability: 'high', type: 'mainstream' },
  CNN: { lean: 'left-center', score: 35, reliability: 'medium', type: 'cable' },
  'CNN Politics': { lean: 'left-center', score: 35, reliability: 'medium', type: 'cable' },
  'NBC News': { lean: 'left-center', score: 32, reliability: 'high', type: 'mainstream' },
  'LA Times': { lean: 'left-center', score: 35, reliability: 'high', type: 'mainstream' },
  'Los Angeles Times': { lean: 'left-center', score: 35, reliability: 'high', type: 'mainstream' },
  Guardian: { lean: 'left-center', score: 30, reliability: 'high', type: 'mainstream' },
  'The Guardian': { lean: 'left-center', score: 30, reliability: 'high', type: 'mainstream' },
  'The Guardian US': { lean: 'left-center', score: 30, reliability: 'high', type: 'mainstream' },
  'The Atlantic': { lean: 'left-center', score: 35, reliability: 'high', type: 'digital' },
  MSNBC: { lean: 'left-center', score: 28, reliability: 'medium', type: 'cable' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Left / Progressive - Score: 20-30
  // ═══════════════════════════════════════════════════════════════════════════
  Vox: { lean: 'left', score: 25, reliability: 'medium', type: 'digital' },
  'The Intercept': { lean: 'left', score: 22, reliability: 'high', type: 'digital' },
  ProPublica: { lean: 'left-center', score: 38, reliability: 'high', type: 'digital' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Libertarian - Score: 55-60
  // ═══════════════════════════════════════════════════════════════════════════
  Reason: { lean: 'center', score: 55, reliability: 'high', type: 'digital' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Right-Center - Score: 56-70
  // ═══════════════════════════════════════════════════════════════════════════
  'Wall Street Journal': { lean: 'right-center', score: 62, reliability: 'high', type: 'mainstream' },
  'The Wall Street Journal': { lean: 'right-center', score: 62, reliability: 'high', type: 'mainstream' },
  WSJ: { lean: 'right-center', score: 62, reliability: 'high', type: 'mainstream' },
  'New York Post': { lean: 'right-center', score: 68, reliability: 'medium', type: 'mainstream' },
  'Washington Times': { lean: 'right-center', score: 70, reliability: 'medium', type: 'mainstream' },
  'The Washington Times': { lean: 'right-center', score: 70, reliability: 'medium', type: 'mainstream' },
  'Washington Examiner': { lean: 'right-center', score: 68, reliability: 'medium', type: 'digital' },
  'Daily Mail': { lean: 'right-center', score: 65, reliability: 'low', type: 'mainstream' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Right - Score: 71-85
  // ═══════════════════════════════════════════════════════════════════════════
  'Fox News': { lean: 'right', score: 78, reliability: 'medium', type: 'cable' },
  'Fox News Politics': { lean: 'right', score: 78, reliability: 'medium', type: 'cable' },
  'Fox Business': { lean: 'right', score: 75, reliability: 'medium', type: 'cable' },
  'Daily Wire': { lean: 'right', score: 80, reliability: 'medium', type: 'digital' },
  'The Daily Wire': { lean: 'right', score: 80, reliability: 'medium', type: 'digital' },
  Newsmax: { lean: 'right', score: 82, reliability: 'low', type: 'cable' },
  Breitbart: { lean: 'right', score: 85, reliability: 'low', type: 'digital' },

  // ═══════════════════════════════════════════════════════════════════════════
  // International (Generally center, outside US bubble)
  // ═══════════════════════════════════════════════════════════════════════════
  'Al Jazeera': { lean: 'center', score: 45, reliability: 'high', type: 'mainstream' },
  'France 24': { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  'DW News': { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },
  'Sky News': { lean: 'center', score: 52, reliability: 'medium', type: 'mainstream' },
  'Globe and Mail': { lean: 'center', score: 48, reliability: 'high', type: 'mainstream' },

  // ═══════════════════════════════════════════════════════════════════════════
  // Tech (Generally center-left on social issues)
  // ═══════════════════════════════════════════════════════════════════════════
  'Ars Technica': { lean: 'center', score: 45, reliability: 'high', type: 'digital' },
  Wired: { lean: 'left-center', score: 38, reliability: 'high', type: 'digital' },
  'The Verge': { lean: 'left-center', score: 40, reliability: 'medium', type: 'digital' },
};

/**
 * Get bias information for a source name
 * Tries to match exactly first, then tries partial matching
 */
export function getSourceBias(sourceName: string): SourceBias {
  // Exact match
  if (SOURCE_BIAS[sourceName]) {
    return SOURCE_BIAS[sourceName];
  }

  // Try case-insensitive match
  const normalized = sourceName.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_BIAS)) {
    if (key.toLowerCase() === normalized) {
      return value;
    }
  }

  // Try partial match (source name contains key or vice versa)
  for (const [key, value] of Object.entries(SOURCE_BIAS)) {
    if (
      normalized.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(normalized)
    ) {
      return value;
    }
  }

  // Default to center if unknown
  return {
    lean: 'center',
    score: 50,
    reliability: 'medium',
    type: 'digital',
  };
}

/**
 * Get lean category label from bias score
 */
export function getLeanFromScore(score: number): PoliticalLean {
  if (score <= 30) return 'left';
  if (score <= 45) return 'left-center';
  if (score <= 55) return 'center';
  if (score <= 70) return 'right-center';
  return 'right';
}

/**
 * Calculate coverage balance from a list of sources
 */
export function calculateCoverageBalance(
  sources: { name: string; biasScore?: number }[]
): { left: number; center: number; right: number } {
  let left = 0;
  let center = 0;
  let right = 0;

  for (const source of sources) {
    const score = source.biasScore ?? getSourceBias(source.name).score;
    if (score < 40) left++;
    else if (score <= 60) center++;
    else right++;
  }

  const total = sources.length || 1;
  return {
    left: Math.round((left / total) * 100),
    center: Math.round((center / total) * 100),
    right: Math.round((right / total) * 100),
  };
}
