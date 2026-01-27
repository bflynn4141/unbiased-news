/**
 * News Source Registry
 *
 * Contains pre-configured news sources with their bias ratings.
 *
 * Bias ratings are compiled from:
 * - AllSides Media Bias Ratings
 * - Media Bias/Fact Check
 * - Ad Fontes Media Bias Chart
 *
 * These are starting points, not absolute truths. The goal is balance
 * in aggregate, not perfect accuracy for any single source.
 */

import type { NewsSource, BiasIndicators } from '../../types/index.js';

// ============================================================================
// Bias Presets (for readability)
// ============================================================================

const BIAS = {
  // Political lean presets
  FAR_LEFT: -0.8,
  LEFT: -0.5,
  LEAN_LEFT: -0.25,
  CENTER: 0,
  LEAN_RIGHT: 0.25,
  RIGHT: 0.5,
  FAR_RIGHT: 0.8,
} as const;

/**
 * Helper to create bias indicators with sensible defaults
 */
function createBias(
  politicalLean: number,
  overrides: Partial<BiasIndicators> = {}
): BiasIndicators {
  return {
    politicalLean,
    sensationalism: 0.3,      // Default moderate
    factualAccuracy: 0.8,     // Default high
    opinionMixing: 0.3,       // Default moderate
    transparency: 0.7,        // Default good
    ...overrides,
  };
}

// ============================================================================
// Wire Services (Most Neutral)
// ============================================================================

const wireSources: NewsSource[] = [
  {
    id: 'ap',
    name: 'Associated Press',
    url: 'https://apnews.com',
    feeds: [
      { url: 'https://rsshub.app/apnews/topics/apf-topnews', section: 'Top News', priority: 1 },
      { url: 'https://rsshub.app/apnews/topics/apf-politics', section: 'Politics', priority: 2 },
      { url: 'https://rsshub.app/apnews/topics/apf-business', section: 'Business', priority: 3 },
    ],
    knownBias: createBias(BIAS.CENTER, {
      sensationalism: 0.1,
      factualAccuracy: 0.95,
      opinionMixing: 0.1,
      transparency: 0.9,
    }),
    reliabilityScore: 0.95,
    category: 'wire',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1846,
      ownership: 'Cooperative (member news organizations)',
    },
  },
  {
    id: 'reuters',
    name: 'Reuters',
    url: 'https://www.reuters.com',
    feeds: [
      { url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best', section: 'Top News', priority: 1 },
    ],
    knownBias: createBias(BIAS.CENTER, {
      sensationalism: 0.1,
      factualAccuracy: 0.95,
      opinionMixing: 0.1,
      transparency: 0.9,
    }),
    reliabilityScore: 0.95,
    category: 'wire',
    enabled: true,
    metadata: {
      country: 'UK',
      language: 'en',
      founded: 1851,
      ownership: 'Thomson Reuters',
    },
  },
];

// ============================================================================
// Mainstream Print Media
// ============================================================================

const mainstreamSources: NewsSource[] = [
  {
    id: 'nyt',
    name: 'The New York Times',
    url: 'https://www.nytimes.com',
    feeds: [
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', section: 'Home', priority: 1 },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', section: 'Politics', priority: 2 },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', section: 'US', priority: 3 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.2,
      factualAccuracy: 0.85,
      opinionMixing: 0.4,
      transparency: 0.8,
    }),
    reliabilityScore: 0.85,
    category: 'mainstream',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1851,
      ownership: 'The New York Times Company',
    },
  },
  {
    id: 'wsj',
    name: 'The Wall Street Journal',
    url: 'https://www.wsj.com',
    feeds: [
      { url: 'https://feeds.a]wsj.com/rss/RSSWorldNews.xml', section: 'World', priority: 1 },
      { url: 'https://feeds.wsj.com/rss/RSSOpinion.xml', section: 'Opinion', priority: 2 },
    ],
    knownBias: createBias(BIAS.LEAN_RIGHT, {
      sensationalism: 0.2,
      factualAccuracy: 0.85,
      opinionMixing: 0.5,  // Strong opinion section
      transparency: 0.8,
    }),
    reliabilityScore: 0.85,
    category: 'mainstream',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1889,
      ownership: 'News Corp (Murdoch)',
    },
  },
  {
    id: 'wapo',
    name: 'The Washington Post',
    url: 'https://www.washingtonpost.com',
    feeds: [
      { url: 'https://feeds.washingtonpost.com/rss/national', section: 'National', priority: 1 },
      { url: 'https://feeds.washingtonpost.com/rss/politics', section: 'Politics', priority: 2 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.3,
      factualAccuracy: 0.85,
      opinionMixing: 0.4,
      transparency: 0.8,
    }),
    reliabilityScore: 0.85,
    category: 'mainstream',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1877,
      ownership: 'Jeff Bezos',
    },
  },
];

// ============================================================================
// Broadcast Networks
// ============================================================================

const broadcastSources: NewsSource[] = [
  {
    id: 'cnn',
    name: 'CNN',
    url: 'https://www.cnn.com',
    feeds: [
      { url: 'http://rss.cnn.com/rss/cnn_topstories.rss', section: 'Top Stories', priority: 1 },
      { url: 'http://rss.cnn.com/rss/cnn_us.rss', section: 'US', priority: 2 },
      { url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss', section: 'Politics', priority: 3 },
    ],
    knownBias: createBias(BIAS.LEFT, {
      sensationalism: 0.5,
      factualAccuracy: 0.75,
      opinionMixing: 0.6,
      transparency: 0.6,
    }),
    reliabilityScore: 0.7,
    category: 'broadcast',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1980,
      ownership: 'Warner Bros. Discovery',
    },
  },
  {
    id: 'fox',
    name: 'Fox News',
    url: 'https://www.foxnews.com',
    feeds: [
      { url: 'https://moxie.foxnews.com/google-publisher/latest.xml', section: 'Latest', priority: 1 },
      { url: 'https://moxie.foxnews.com/google-publisher/politics.xml', section: 'Politics', priority: 2 },
    ],
    knownBias: createBias(BIAS.RIGHT, {
      sensationalism: 0.6,
      factualAccuracy: 0.65,
      opinionMixing: 0.7,
      transparency: 0.5,
    }),
    reliabilityScore: 0.6,
    category: 'broadcast',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1996,
      ownership: 'Fox Corporation (Murdoch)',
    },
  },
  {
    id: 'msnbc',
    name: 'MSNBC',
    url: 'https://www.msnbc.com',
    feeds: [
      { url: 'https://www.msnbc.com/feeds/latest', section: 'Latest', priority: 1 },
    ],
    knownBias: createBias(BIAS.LEFT, {
      sensationalism: 0.6,
      factualAccuracy: 0.7,
      opinionMixing: 0.75,
      transparency: 0.5,
    }),
    reliabilityScore: 0.6,
    category: 'broadcast',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1996,
      ownership: 'NBCUniversal (Comcast)',
    },
  },
];

// ============================================================================
// Public Broadcasters
// ============================================================================

const publicSources: NewsSource[] = [
  {
    id: 'npr',
    name: 'NPR',
    url: 'https://www.npr.org',
    feeds: [
      { url: 'https://feeds.npr.org/1001/rss.xml', section: 'News', priority: 1 },
      { url: 'https://feeds.npr.org/1014/rss.xml', section: 'Politics', priority: 2 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.15,
      factualAccuracy: 0.9,
      opinionMixing: 0.3,
      transparency: 0.85,
    }),
    reliabilityScore: 0.9,
    category: 'public',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1970,
      ownership: 'Non-profit public',
    },
  },
  {
    id: 'pbs',
    name: 'PBS NewsHour',
    url: 'https://www.pbs.org/newshour',
    feeds: [
      { url: 'https://www.pbs.org/newshour/feeds/rss/headlines', section: 'Headlines', priority: 1 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.1,
      factualAccuracy: 0.9,
      opinionMixing: 0.2,
      transparency: 0.9,
    }),
    reliabilityScore: 0.9,
    category: 'public',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1975,
      ownership: 'Non-profit public',
    },
  },
  {
    id: 'bbc',
    name: 'BBC News',
    url: 'https://www.bbc.com/news',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/news/rss.xml', section: 'Top Stories', priority: 1 },
      { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', section: 'US & Canada', priority: 2 },
    ],
    knownBias: createBias(BIAS.CENTER, {
      sensationalism: 0.2,
      factualAccuracy: 0.9,
      opinionMixing: 0.2,
      transparency: 0.85,
    }),
    reliabilityScore: 0.9,
    category: 'public',
    enabled: true,
    metadata: {
      country: 'UK',
      language: 'en',
      founded: 1922,
      ownership: 'British public (BBC)',
    },
  },
];

// ============================================================================
// Digital Native
// ============================================================================

const digitalNativeSources: NewsSource[] = [
  {
    id: 'axios',
    name: 'Axios',
    url: 'https://www.axios.com',
    feeds: [
      { url: 'https://api.axios.com/feed/', section: 'Main', priority: 1 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.3,
      factualAccuracy: 0.85,
      opinionMixing: 0.35,
      transparency: 0.75,
    }),
    reliabilityScore: 0.8,
    category: 'digital-native',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 2016,
      ownership: 'Cox Enterprises',
    },
  },
  {
    id: 'politico',
    name: 'Politico',
    url: 'https://www.politico.com',
    feeds: [
      { url: 'https://www.politico.com/rss/politicopicks.xml', section: 'Top Picks', priority: 1 },
      { url: 'https://www.politico.com/rss/congress.xml', section: 'Congress', priority: 2 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.35,
      factualAccuracy: 0.8,
      opinionMixing: 0.4,
      transparency: 0.7,
    }),
    reliabilityScore: 0.8,
    category: 'digital-native',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 2007,
      ownership: 'Axel Springer',
    },
  },
  {
    id: 'thehill',
    name: 'The Hill',
    url: 'https://thehill.com',
    feeds: [
      { url: 'https://thehill.com/feed/', section: 'Main', priority: 1 },
    ],
    knownBias: createBias(BIAS.CENTER, {
      sensationalism: 0.4,
      factualAccuracy: 0.75,
      opinionMixing: 0.5,
      transparency: 0.65,
    }),
    reliabilityScore: 0.75,
    category: 'digital-native',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 1994,
      ownership: 'Nexstar Media Group',
    },
  },
  {
    id: 'dailywire',
    name: 'The Daily Wire',
    url: 'https://www.dailywire.com',
    feeds: [
      { url: 'https://www.dailywire.com/feeds/rss.xml', section: 'Main', priority: 1 },
    ],
    knownBias: createBias(BIAS.RIGHT, {
      sensationalism: 0.5,
      factualAccuracy: 0.65,
      opinionMixing: 0.75,
      transparency: 0.5,
    }),
    reliabilityScore: 0.6,
    category: 'digital-native',
    enabled: true,
    metadata: {
      country: 'USA',
      language: 'en',
      founded: 2015,
      ownership: 'Ben Shapiro, Jeremy Boreing',
    },
  },
];

// ============================================================================
// International Sources (covering US)
// ============================================================================

const internationalSources: NewsSource[] = [
  {
    id: 'guardian-us',
    name: 'The Guardian (US)',
    url: 'https://www.theguardian.com/us',
    feeds: [
      { url: 'https://www.theguardian.com/us-news/rss', section: 'US News', priority: 1 },
      { url: 'https://www.theguardian.com/us/rss', section: 'US Edition', priority: 2 },
    ],
    knownBias: createBias(BIAS.LEFT, {
      sensationalism: 0.35,
      factualAccuracy: 0.8,
      opinionMixing: 0.5,
      transparency: 0.8,
    }),
    reliabilityScore: 0.8,
    category: 'international',
    enabled: true,
    metadata: {
      country: 'UK',
      language: 'en',
      founded: 1821,
      ownership: 'Scott Trust (non-profit)',
    },
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera English',
    url: 'https://www.aljazeera.com',
    feeds: [
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', section: 'All', priority: 1 },
    ],
    knownBias: createBias(BIAS.LEAN_LEFT, {
      sensationalism: 0.3,
      factualAccuracy: 0.75,
      opinionMixing: 0.4,
      transparency: 0.7,
    }),
    reliabilityScore: 0.75,
    category: 'international',
    enabled: true,
    metadata: {
      country: 'Qatar',
      language: 'en',
      founded: 1996,
      ownership: 'State-owned (Qatar)',
    },
  },
];

// ============================================================================
// Source Registry
// ============================================================================

/**
 * All available news sources
 */
export const ALL_SOURCES: NewsSource[] = [
  ...wireSources,
  ...mainstreamSources,
  ...broadcastSources,
  ...publicSources,
  ...digitalNativeSources,
  ...internationalSources,
];

/**
 * Get a source by ID
 */
export function getSource(id: string): NewsSource | undefined {
  return ALL_SOURCES.find(s => s.id === id);
}

/**
 * Get all enabled sources
 */
export function getEnabledSources(): NewsSource[] {
  return ALL_SOURCES.filter(s => s.enabled);
}

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: NewsSource['category']): NewsSource[] {
  return ALL_SOURCES.filter(s => s.category === category);
}

/**
 * Get sources by political lean range
 */
export function getSourcesByLean(minLean: number, maxLean: number): NewsSource[] {
  return ALL_SOURCES.filter(
    s => s.knownBias.politicalLean >= minLean && s.knownBias.politicalLean <= maxLean
  );
}

/**
 * Get a balanced set of sources (left, center, right)
 */
export function getBalancedSources(count = 6): NewsSource[] {
  const leftSources = ALL_SOURCES.filter(s => s.knownBias.politicalLean < -0.2);
  const centerSources = ALL_SOURCES.filter(s => s.knownBias.politicalLean >= -0.2 && s.knownBias.politicalLean <= 0.2);
  const rightSources = ALL_SOURCES.filter(s => s.knownBias.politicalLean > 0.2);

  const perSide = Math.floor(count / 3);
  const extra = count % 3;

  // Sort each group by reliability and pick the best
  const sortByReliability = (sources: NewsSource[]) =>
    [...sources].sort((a, b) => b.reliabilityScore - a.reliabilityScore);

  return [
    ...sortByReliability(leftSources).slice(0, perSide),
    ...sortByReliability(centerSources).slice(0, perSide + extra), // Center gets extra
    ...sortByReliability(rightSources).slice(0, perSide),
  ];
}
