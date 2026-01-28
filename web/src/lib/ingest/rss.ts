/**
 * RSS News Ingestion
 *
 * Fetches news from major outlets via their public RSS feeds.
 * No API keys required - RSS is a free, open standard.
 *
 * Benefits over NewsAPI:
 * - Unlimited requests (no rate limits)
 * - No account/API key needed
 * - Direct from source (fresher content)
 * - Can't be revoked or rate-limited
 */

import { Article, PoliticalLean } from '@/types/story';
import { getSourceBias } from './sources';

/**
 * News RSS feeds from major outlets
 * Mix of left, center, and right-leaning sources for balance
 * Expanded to 35+ sources across multiple categories
 */
export const RSS_FEEDS: { name: string; url: string; category: string }[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CENTER / WIRE SERVICES (Most neutral, fact-focused)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'AP News', url: 'https://rsshub.app/apnews/topics/politics', category: 'politics' },
  { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best', category: 'general' },
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', category: 'world' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CENTER-LEFT (Mainstream, slightly left-leaning)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml', category: 'politics' },
  { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/politics', category: 'politics' },
  { name: 'The Hill', url: 'https://thehill.com/feed/', category: 'politics' },
  { name: 'Politico', url: 'https://www.politico.com/rss/politicopicks.xml', category: 'politics' },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/politicsheadlines', category: 'politics' },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/politics', category: 'politics' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEFT-LEANING (Progressive/liberal mainstream)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'CNN Politics', url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss', category: 'politics' },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/politics', category: 'politics' },
  { name: 'Washington Post', url: 'https://feeds.washingtonpost.com/rss/politics', category: 'politics' },
  { name: 'New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', category: 'politics' },
  { name: 'The Guardian US', url: 'https://www.theguardian.com/us-news/rss', category: 'politics' },
  { name: 'LA Times', url: 'https://www.latimes.com/politics/rss2.0.xml', category: 'politics' },
  { name: 'MSNBC', url: 'https://www.msnbc.com/feeds/latest', category: 'politics' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CENTER-RIGHT (Business-focused, fiscally conservative)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'world' },
  { name: 'The Economist', url: 'https://www.economist.com/united-states/rss.xml', category: 'politics' },

  // ═══════════════════════════════════════════════════════════════════════════
  // RIGHT-LEANING (Conservative mainstream)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Fox News Politics', url: 'https://moxie.foxnews.com/google-publisher/politics.xml', category: 'politics' },
  { name: 'New York Post', url: 'https://nypost.com/news/feed/', category: 'general' },
  { name: 'Washington Examiner', url: 'https://www.washingtonexaminer.com/section/news/feed', category: 'politics' },
  { name: 'Washington Times', url: 'https://www.washingtontimes.com/rss/headlines/news/politics/', category: 'politics' },
  { name: 'Daily Mail', url: 'https://www.dailymail.co.uk/news/us-politics/index.rss', category: 'politics' },

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEPENDENT / ALTERNATIVE (Various perspectives)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'The Intercept', url: 'https://theintercept.com/feed/?rss', category: 'investigative' },
  { name: 'ProPublica', url: 'https://www.propublica.org/feeds/propublica/main', category: 'investigative' },
  { name: 'Reason', url: 'https://reason.com/feed/', category: 'libertarian' },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNATIONAL (Outside US media bubble)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'world' },
  { name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-all', category: 'world' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/us.xml', category: 'world' },
  { name: 'Globe and Mail', url: 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/', category: 'world' },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS / ECONOMY
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/politics/news.rss', category: 'politics' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/10000113/device/rss/rss.html', category: 'economy' },
  { name: 'Financial Times', url: 'https://www.ft.com/rss/home/us', category: 'economy' },
  { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'economy' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECH / SCIENCE (Policy implications)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/features', category: 'tech' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
];

/**
 * Simple RSS parser - extracts articles from RSS XML
 * Uses built-in DOMParser-like approach without external dependencies
 */
interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
}

async function parseRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UnbiasedNews/1.0 (RSS Reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.warn(`RSS fetch failed for ${url}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items: RSSItem[] = [];

    // Simple regex-based parsing (works server-side without DOM)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link') || extractTag(itemXml, 'guid');
      const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'content:encoded');
      const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date');

      if (title && link) {
        items.push({
          title: decodeHTMLEntities(title),
          link: link.trim(),
          description: decodeHTMLEntities(stripHTML(description || '')).slice(0, 500),
          pubDate: pubDate || new Date().toISOString(),
          guid: extractTag(itemXml, 'guid') || link,
        });
      }
    }

    return items;
  } catch (error) {
    console.error(`Error parsing RSS feed ${url}:`, error);
    return [];
  }
}

/**
 * Extract content from an XML tag
 */
function extractTag(xml: string, tagName: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1];

  // Handle regular tags
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * Strip HTML tags from text
 */
function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

/**
 * Generate article ID from URL
 */
function generateArticleId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `art_${Math.abs(hash).toString(36)}`;
}

/**
 * Convert RSS item to Article
 */
function rssItemToArticle(item: RSSItem, sourceName: string): Article {
  const sourceBias = getSourceBias(sourceName);

  return {
    id: generateArticleId(item.link),
    title: item.title,
    description: item.description || null,
    content: null,
    url: item.link,
    urlToImage: null,
    publishedAt: new Date(item.pubDate).toISOString(),
    source: {
      id: null,
      name: sourceName,
    },
    biasScore: sourceBias.score,
    lean: sourceBias.lean as PoliticalLean,
    ingestedAt: new Date().toISOString(),
  };
}

/**
 * Fetch articles from a single RSS feed
 */
export async function fetchFromFeed(
  feedName: string,
  feedUrl: string,
  limit: number = 20
): Promise<Article[]> {
  const items = await parseRSSFeed(feedUrl);
  return items.slice(0, limit).map((item) => rssItemToArticle(item, feedName));
}

/**
 * Fetch political news from all configured RSS feeds
 * Returns deduplicated articles sorted by date
 */
export async function fetchPoliticalNewsRSS(): Promise<Article[]> {
  console.log(`[RSS] Fetching from ${RSS_FEEDS.length} feeds...`);

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) =>
      fetchFromFeed(feed.name, feed.url, 15).then((articles) => ({
        source: feed.name,
        articles,
      }))
    )
  );

  // Collect successful results
  const articleMap = new Map<string, Article>();
  let successCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successCount++;
      for (const article of result.value.articles) {
        // Deduplicate by ID (based on URL hash)
        if (!articleMap.has(article.id)) {
          articleMap.set(article.id, article);
        }
      }
      console.log(`[RSS] ${result.value.source}: ${result.value.articles.length} articles`);
    } else {
      console.warn(`[RSS] Feed failed:`, result.reason);
    }
  }

  console.log(
    `[RSS] Successfully fetched from ${successCount}/${RSS_FEEDS.length} feeds, ` +
      `${articleMap.size} unique articles`
  );

  // Sort by publication date (newest first)
  return Array.from(articleMap.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/**
 * Quick health check - fetch one article from each feed
 */
export async function checkRSSHealth(): Promise<{
  healthy: string[];
  failed: string[];
}> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const items = await parseRSSFeed(feed.url);
      if (items.length === 0) throw new Error('No items');
      return feed.name;
    })
  );

  const healthy: string[] = [];
  const failed: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      healthy.push(result.value);
    } else {
      failed.push(RSS_FEEDS[i].name);
    }
  });

  return { healthy, failed };
}
