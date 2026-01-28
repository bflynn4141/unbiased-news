/**
 * Polymarket API Client
 *
 * Fetches prediction market data from Polymarket's public API.
 * No authentication required for read-only access.
 *
 * API Documentation: https://docs.polymarket.com/
 */

import { PredictionMarket } from '@/types/story';

const GAMMA_API = 'https://gamma-api.polymarket.com';

/**
 * Raw market data from Polymarket API
 */
interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  markets: {
    id: string;
    question: string;
    outcomes: string[];
    outcomePrices: string[]; // Decimal strings like "0.75"
    volume: string; // Volume in cents
    active: boolean;
    closed: boolean;
  }[];
  active: boolean;
  closed: boolean;
  tags: string[];
  startDate: string;
  endDate: string;
}

interface PolymarketResponse {
  data: PolymarketEvent[];
  next_cursor?: string;
}

/**
 * Simplified market data for our use
 */
export interface PolymarketData {
  id: string;
  eventId: string;
  question: string;
  probability: number; // 0-1 for "Yes" outcome
  volume: number; // In dollars
  url: string;
  tags: string[];
  updatedAt: string;
}

/**
 * Convert raw API response to our format
 */
function transformMarket(event: PolymarketEvent): PolymarketData[] {
  return event.markets
    .filter((m) => m.active && !m.closed)
    .map((market) => {
      // Get "Yes" probability (usually first outcome)
      const yesIndex = market.outcomes.findIndex(
        (o) => o.toLowerCase() === 'yes'
      );
      const probability =
        yesIndex >= 0
          ? parseFloat(market.outcomePrices[yesIndex])
          : parseFloat(market.outcomePrices[0]);

      return {
        id: market.id,
        eventId: event.id,
        question: market.question || event.title,
        probability: isNaN(probability) ? 0.5 : probability,
        volume: parseFloat(market.volume) / 100, // Convert cents to dollars
        url: `https://polymarket.com/event/${event.slug}`,
        tags: event.tags || [],
        updatedAt: new Date().toISOString(),
      };
    });
}

/**
 * Fetch active political/news markets from Polymarket
 */
export async function fetchPoliticalMarkets(): Promise<PolymarketData[]> {
  const markets: PolymarketData[] = [];

  try {
    // Fetch events tagged as politics, elections, or news
    const categories = ['politics', 'elections', 'news', 'us-politics'];

    for (const tag of categories) {
      const url = `${GAMMA_API}/events?tag=${tag}&active=true&closed=false&limit=50`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'UnbiasedNews/1.0',
        },
        next: { revalidate: 0 }, // Don't cache
      });

      if (!response.ok) {
        console.warn(`Polymarket API error for tag ${tag}: ${response.status}`);
        continue;
      }

      const data: PolymarketEvent[] = await response.json();

      for (const event of data) {
        const eventMarkets = transformMarket(event);
        markets.push(...eventMarkets);
      }
    }

    // Deduplicate by market ID
    const seen = new Set<string>();
    return markets.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  } catch (error) {
    console.error('Error fetching from Polymarket:', error);
    return [];
  }
}

/**
 * Search markets by keyword
 */
export async function searchMarkets(query: string): Promise<PolymarketData[]> {
  try {
    const url = `${GAMMA_API}/events?search=${encodeURIComponent(query)}&active=true&closed=false&limit=20`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UnbiasedNews/1.0',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.warn(`Polymarket search error: ${response.status}`);
      return [];
    }

    const data: PolymarketEvent[] = await response.json();

    const markets: PolymarketData[] = [];
    for (const event of data) {
      markets.push(...transformMarket(event));
    }

    return markets;
  } catch (error) {
    console.error('Error searching Polymarket:', error);
    return [];
  }
}

/**
 * Convert PolymarketData to our PredictionMarket type
 */
export function toPredictionMarket(data: PolymarketData): PredictionMarket {
  return {
    platform: 'polymarket',
    question: data.question,
    probability: data.probability,
    volume: data.volume,
    url: data.url,
    updatedAt: data.updatedAt,
  };
}
