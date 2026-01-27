/**
 * Aggregate Command
 *
 * Groups related articles into stories.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns';
import { createStoryAggregator } from '../../core/aggregator/story-aggregator.js';
import { createRssAdapter } from '../../core/sources/rss-adapter.js';
import { getEnabledSources, getSource, getBalancedSources } from '../../core/sources/registry.js';
import type { AggregatedStory, AggregationConfig } from '../../types/index.js';

export function aggregateCommand(program: Command): void {
  program
    .command('aggregate')
    .description('Group articles into stories')
    .option('-s, --sources <ids>', 'Comma-separated source IDs')
    .option('-b, --balanced', 'Use balanced source selection')
    .option('--min-sources <n>', 'Minimum sources per story', '2')
    .option('--time-window <hours>', 'Time window in hours', '48')
    .option('--similarity <threshold>', 'Similarity threshold (0-1)', '0.3')
    .option('--max-stories <n>', 'Maximum stories to show', '10')
    .option('-q, --quiet', 'Minimal output')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        await runAggregate(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

interface AggregateOptions {
  sources?: string;
  balanced?: boolean;
  minSources?: string;
  timeWindow?: string;
  similarity?: string;
  maxStories?: string;
  quiet?: boolean;
  json?: boolean;
}

async function runAggregate(options: AggregateOptions): Promise<void> {
  // Get sources
  let sources;
  if (options.sources) {
    const ids = options.sources.split(',').map(s => s.trim());
    sources = ids.map(id => getSource(id)).filter(s => s !== undefined);
  } else if (options.balanced) {
    sources = getBalancedSources(9);
  } else {
    sources = getEnabledSources();
  }

  if (!options.quiet) {
    console.log(chalk.bold(`\nFetching from ${sources.length} sources...\n`));
  }

  // Fetch articles
  const adapter = createRssAdapter({ maxArticlesPerFeed: 15 });
  const results = await adapter.fetchSources(sources);
  const allArticles = results.flatMap(r => r.articles);

  if (!options.quiet) {
    console.log(chalk.dim(`Fetched ${allArticles.length} articles\n`));
    console.log(chalk.bold('Aggregating into stories...\n'));
  }

  // Aggregate
  const config: Partial<AggregationConfig> = {
    minArticlesPerStory: parseInt(options.minSources || '2', 10),
    timeWindowHours: parseInt(options.timeWindow || '48', 10),
    similarityThreshold: parseFloat(options.similarity || '0.3'),
  };

  const aggregator = createStoryAggregator(config);
  const stories = aggregator.aggregate(allArticles);

  // Limit stories
  const maxStories = parseInt(options.maxStories || '10', 10);
  const displayStories = stories.slice(0, maxStories);

  // Output
  if (options.json) {
    outputJson(displayStories);
  } else {
    outputText(displayStories, allArticles.length, options.quiet);
  }
}

function outputJson(stories: AggregatedStory[]): void {
  const output = {
    aggregatedAt: new Date().toISOString(),
    storyCount: stories.length,
    stories: stories.map(story => ({
      id: story.id,
      headline: story.headline,
      summary: story.summary,
      keywords: story.keywords,
      commonEntities: story.commonEntities,
      articleCount: story.articles.length,
      articles: story.articles.map(a => ({
        id: a.id,
        title: a.title,
        source: a.sourceId,
        url: a.url,
        publishedAt: a.publishedAt.toISOString(),
      })),
      coverage: {
        sourceCount: story.coverageAnalysis.sourceCount,
        leanDistribution: story.coverageAnalysis.leanDistribution,
        balance: story.coverageAnalysis.coverageBalance,
        averageBias: story.coverageAnalysis.averageBias,
      },
      firstSeen: story.firstSeen.toISOString(),
      lastUpdated: story.lastUpdated.toISOString(),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

function outputText(
  stories: AggregatedStory[],
  totalArticles: number,
  quiet?: boolean
): void {
  if (stories.length === 0) {
    console.log(chalk.yellow('No stories found. Try adjusting --similarity or --min-sources'));
    return;
  }

  console.log(chalk.bold(`Found ${stories.length} stories from ${totalArticles} articles\n`));
  console.log(chalk.dim('═'.repeat(75)));

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    if (!story) continue;

    // Story number and headline
    console.log(chalk.bold.cyan(`\n[${i + 1}] ${story.headline}`));

    // Coverage info
    const coverage = story.coverageAnalysis;
    const balanceColor =
      coverage.coverageBalance === 'balanced' ? chalk.green :
      coverage.coverageBalance === 'limited' ? chalk.yellow :
      chalk.red;

    console.log(
      chalk.dim('    Coverage: ') +
      chalk.bold(coverage.sourceCount) + chalk.dim(' sources') +
      chalk.dim(' | ') +
      chalk.blue(`L:${coverage.leanDistribution.left}`) +
      chalk.dim(' / ') +
      chalk.gray(`C:${coverage.leanDistribution.center}`) +
      chalk.dim(' / ') +
      chalk.red(`R:${coverage.leanDistribution.right}`) +
      chalk.dim(' | ') +
      balanceColor(coverage.coverageBalance)
    );

    // Time info
    console.log(
      chalk.dim('    First: ') +
      formatDistanceToNow(story.firstSeen, { addSuffix: true }) +
      chalk.dim(' | Last: ') +
      formatDistanceToNow(story.lastUpdated, { addSuffix: true })
    );

    // Keywords
    if (story.keywords.length > 0 && !quiet) {
      console.log(chalk.dim('    Keywords: ') + story.keywords.slice(0, 5).join(', '));
    }

    // Show articles from each source
    if (!quiet) {
      console.log(chalk.dim('\n    Sources:'));

      for (const article of story.articles.slice(0, 5)) {
        const source = getSource(article.sourceId);
        const leanIndicator = source ? getLeanIndicator(source.knownBias.politicalLean) : '  ';

        console.log(
          chalk.dim('      ') +
          leanIndicator +
          chalk.dim(' ') +
          chalk.bold((source?.name || article.sourceId).slice(0, 15).padEnd(15)) +
          chalk.dim(' │ ') +
          article.title.slice(0, 45) + (article.title.length > 45 ? '...' : '')
        );
      }

      if (story.articles.length > 5) {
        console.log(chalk.dim(`      ... and ${story.articles.length - 5} more`));
      }
    }

    console.log(chalk.dim('\n' + '─'.repeat(75)));
  }

  // Summary
  console.log(chalk.bold('\nSummary:'));
  console.log(`  Stories: ${stories.length}`);
  console.log(`  Total articles grouped: ${stories.reduce((s, st) => s + st.articles.length, 0)}`);

  const balanced = stories.filter(s => s.coverageAnalysis.coverageBalance === 'balanced').length;
  const leftHeavy = stories.filter(s => s.coverageAnalysis.coverageBalance === 'left-heavy').length;
  const rightHeavy = stories.filter(s => s.coverageAnalysis.coverageBalance === 'right-heavy').length;

  console.log(`  Balance: ${chalk.green(balanced)} balanced, ${chalk.blue(leftHeavy)} left-heavy, ${chalk.red(rightHeavy)} right-heavy`);
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
