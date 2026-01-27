/**
 * Fetch Command
 *
 * Fetches articles from configured news sources.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createRssAdapter } from '../../core/sources/rss-adapter.js';
import {
  getEnabledSources,
  getSource,
  getBalancedSources,
} from '../../core/sources/registry.js';
import type { NewsSource, FetchResult } from '../../types/index.js';

export function fetchCommand(program: Command): void {
  program
    .command('fetch')
    .description('Fetch articles from news sources')
    .option('-s, --sources <ids>', 'Comma-separated source IDs to fetch from')
    .option('-b, --balanced', 'Use a balanced selection of sources')
    .option('-c, --count <n>', 'Number of balanced sources to use', '6')
    .option('--concurrency <n>', 'Max concurrent fetches', '5')
    .option('--timeout <ms>', 'Timeout per feed in milliseconds', '10000')
    .option('--max-articles <n>', 'Max articles per feed', '20')
    .option('-q, --quiet', 'Minimal output')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        await runFetch(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

interface FetchOptions {
  sources?: string;
  balanced?: boolean;
  count?: string;
  concurrency?: string;
  timeout?: string;
  maxArticles?: string;
  quiet?: boolean;
  json?: boolean;
}

async function runFetch(options: FetchOptions): Promise<void> {
  // Determine which sources to fetch
  let sources: NewsSource[];

  if (options.sources) {
    // Specific sources requested
    const ids = options.sources.split(',').map(s => s.trim());
    sources = ids
      .map(id => getSource(id))
      .filter((s): s is NewsSource => s !== undefined);

    if (sources.length === 0) {
      throw new Error(`No valid sources found. Available: ${getEnabledSources().map(s => s.id).join(', ')}`);
    }
  } else if (options.balanced) {
    // Balanced selection
    const count = parseInt(options.count || '6', 10);
    sources = getBalancedSources(count);
  } else {
    // All enabled sources
    sources = getEnabledSources();
  }

  if (!options.quiet) {
    console.log(chalk.bold(`\nFetching from ${sources.length} sources...\n`));
  }

  // Create adapter and fetch
  const adapter = createRssAdapter({
    concurrency: parseInt(options.concurrency || '5', 10),
    timeout: parseInt(options.timeout || '10000', 10),
    maxArticlesPerFeed: parseInt(options.maxArticles || '20', 10),
  });

  const startTime = Date.now();
  const results = await adapter.fetchSources(sources);
  const elapsed = Date.now() - startTime;

  // Output results
  if (options.json) {
    outputJson(results);
  } else {
    outputText(results, elapsed, options.quiet);
  }
}

function outputJson(results: FetchResult[]): void {
  const output = {
    fetchedAt: new Date().toISOString(),
    results: results.map(r => ({
      source: {
        id: r.source.id,
        name: r.source.name,
      },
      articleCount: r.articles.length,
      articles: r.articles.map(a => ({
        id: a.id,
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt.toISOString(),
        summary: a.summary.slice(0, 200),
      })),
      errors: r.errors,
    })),
    summary: {
      totalArticles: results.reduce((sum, r) => sum + r.articles.length, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      sourcesWithArticles: results.filter(r => r.articles.length > 0).length,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

function outputText(results: FetchResult[], elapsed: number, quiet?: boolean): void {
  const totalArticles = results.reduce((sum, r) => sum + r.articles.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  // Show per-source summary
  if (!quiet) {
    console.log(chalk.dim('─'.repeat(60)));

    for (const result of results) {
      const statusIcon = result.articles.length > 0
        ? chalk.green('✓')
        : result.errors.length > 0
          ? chalk.red('✗')
          : chalk.yellow('○');

      const leanIndicator = getLeanIndicator(result.source.knownBias.politicalLean);

      console.log(
        `${statusIcon} ${chalk.bold(result.source.name.padEnd(25))} ` +
        `${leanIndicator} ` +
        `${chalk.cyan(result.articles.length.toString().padStart(3))} articles`
      );

      // Show errors if any
      for (const error of result.errors) {
        console.log(chalk.red(`    └─ ${error}`));
      }
    }

    console.log(chalk.dim('─'.repeat(60)));
  }

  // Summary
  console.log(
    `\n${chalk.bold('Summary:')} ` +
    `${chalk.green(totalArticles)} articles ` +
    `from ${chalk.cyan(results.filter(r => r.articles.length > 0).length)} sources ` +
    `in ${chalk.yellow((elapsed / 1000).toFixed(1))}s`
  );

  if (totalErrors > 0) {
    console.log(chalk.yellow(`  ${totalErrors} feed errors (see above)`));
  }

  // Show sample headlines
  if (!quiet) {
    console.log(chalk.bold('\nSample Headlines:'));
    const sampleArticles = results
      .flatMap(r => r.articles)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 5);

    for (const article of sampleArticles) {
      const source = getSource(article.sourceId);
      console.log(
        `  ${chalk.dim('•')} ${article.title.slice(0, 70)}${article.title.length > 70 ? '...' : ''}`
      );
      console.log(chalk.dim(`    ${source?.name || article.sourceId}`));
    }
  }
}

/**
 * Get a visual indicator for political lean
 */
function getLeanIndicator(lean: number): string {
  if (lean <= -0.5) return chalk.blue('◀◀');
  if (lean <= -0.2) return chalk.blue('◀ ');
  if (lean >= 0.5) return chalk.red('▶▶');
  if (lean >= 0.2) return chalk.red(' ▶');
  return chalk.gray('◆ ');
}
