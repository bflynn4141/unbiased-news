/**
 * Analyze Command
 *
 * Analyzes bias in articles.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createBiasAnalyzer } from '../../core/bias/analyzer.js';
import { createRssAdapter } from '../../core/sources/rss-adapter.js';
import { getEnabledSources, getSource } from '../../core/sources/registry.js';
import type { NewsArticle, BiasAnalysis, AnalysisConfig } from '../../types/index.js';

export function analyzeCommand(program: Command): void {
  program
    .command('analyze')
    .description('Analyze bias in articles')
    .option('-m, --method <method>', 'Analysis method: static, heuristic, combined', 'combined')
    .option('-s, --sources <ids>', 'Comma-separated source IDs')
    .option('--max-articles <n>', 'Max articles to analyze', '10')
    .option('--no-evidence', 'Skip evidence collection')
    .option('-q, --quiet', 'Minimal output')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        await runAnalyze(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

interface AnalyzeOptions {
  method: 'static' | 'heuristic' | 'combined';
  sources?: string;
  maxArticles?: string;
  evidence?: boolean;
  quiet?: boolean;
  json?: boolean;
}

async function runAnalyze(options: AnalyzeOptions): Promise<void> {
  // Get sources
  let sourceIds: string[];
  if (options.sources) {
    sourceIds = options.sources.split(',').map(s => s.trim());
  } else {
    sourceIds = getEnabledSources().slice(0, 3).map(s => s.id);
  }

  if (!options.quiet) {
    console.log(chalk.bold(`\nAnalyzing articles from ${sourceIds.length} sources using ${options.method} method...\n`));
  }

  // Fetch articles first
  const adapter = createRssAdapter({ maxArticlesPerFeed: 5 });
  const sources = sourceIds
    .map(id => getSource(id))
    .filter(s => s !== undefined);

  const results = await adapter.fetchSources(sources);
  const allArticles = results.flatMap(r => r.articles);

  // Limit articles
  const maxArticles = parseInt(options.maxArticles || '10', 10);
  const articles = allArticles.slice(0, maxArticles);

  if (articles.length === 0) {
    console.log(chalk.yellow('No articles to analyze.'));
    return;
  }

  // Analyze
  const config: Partial<AnalysisConfig> = {
    method: options.method,
    includeEvidence: options.evidence !== false,
  };

  const analyzer = createBiasAnalyzer(config);
  const analyses = await analyzer.analyzeMany(articles);

  // Output
  if (options.json) {
    outputJson(articles, analyses);
  } else {
    outputText(articles, analyses, options.quiet);
  }
}

function outputJson(
  articles: NewsArticle[],
  analyses: Map<string, BiasAnalysis>
): void {
  const output = {
    analyzedAt: new Date().toISOString(),
    articles: articles.map(article => {
      const analysis = analyses.get(article.id);
      return {
        id: article.id,
        title: article.title,
        source: article.sourceId,
        url: article.url,
        analysis: analysis ? {
          indicators: analysis.indicators,
          confidence: analysis.confidence,
          summary: analysis.summary,
          method: analysis.method,
          evidenceCount: analysis.evidence.length,
        } : null,
      };
    }),
  };

  console.log(JSON.stringify(output, null, 2));
}

function outputText(
  articles: NewsArticle[],
  analyses: Map<string, BiasAnalysis>,
  quiet?: boolean
): void {
  console.log(chalk.dim('─'.repeat(70)));

  for (const article of articles) {
    const analysis = analyses.get(article.id);
    const source = getSource(article.sourceId);

    // Title
    console.log(chalk.bold(article.title.slice(0, 65) + (article.title.length > 65 ? '...' : '')));
    console.log(chalk.dim(`Source: ${source?.name || article.sourceId}`));

    if (analysis) {
      // Bias visualization
      const leanBar = createLeanBar(analysis.indicators.politicalLean);
      console.log(`Political Lean: ${leanBar} ${getLeanLabel(analysis.indicators.politicalLean)}`);

      // Other indicators
      if (!quiet) {
        console.log(chalk.dim(
          `Sensationalism: ${formatPercent(analysis.indicators.sensationalism)} | ` +
          `Opinion Mix: ${formatPercent(analysis.indicators.opinionMixing)} | ` +
          `Factual: ${formatPercent(analysis.indicators.factualAccuracy)}`
        ));
      }

      // Summary
      console.log(chalk.cyan(`→ ${analysis.summary}`));

      // Evidence (if available and not quiet)
      if (!quiet && analysis.evidence.length > 0) {
        console.log(chalk.dim('  Evidence:'));
        for (const ev of analysis.evidence.slice(0, 3)) {
          console.log(chalk.dim(`    • ${ev.explanation}`));
        }
      }

      console.log(chalk.dim(`  Confidence: ${(analysis.confidence * 100).toFixed(0)}% | Method: ${analysis.method}`));
    } else {
      console.log(chalk.red('  Analysis failed'));
    }

    console.log(chalk.dim('─'.repeat(70)));
  }

  // Summary stats
  const validAnalyses = Array.from(analyses.values());
  const avgLean = validAnalyses.reduce((s, a) => s + a.indicators.politicalLean, 0) / validAnalyses.length;
  const avgSensation = validAnalyses.reduce((s, a) => s + a.indicators.sensationalism, 0) / validAnalyses.length;

  console.log(chalk.bold('\nAggregate Stats:'));
  console.log(`  Average Lean: ${createLeanBar(avgLean)} ${getLeanLabel(avgLean)}`);
  console.log(`  Average Sensationalism: ${formatPercent(avgSensation)}`);
  console.log(`  Articles Analyzed: ${articles.length}`);
}

/**
 * Create a visual lean bar
 */
function createLeanBar(lean: number): string {
  const barLength = 20;
  const center = barLength / 2;
  const position = Math.round(center + (lean * center));

  let bar = '';
  for (let i = 0; i < barLength; i++) {
    if (i === center - 1 || i === center) {
      bar += chalk.dim('│');
    } else if (i === position) {
      bar += lean < -0.2
        ? chalk.blue('●')
        : lean > 0.2
          ? chalk.red('●')
          : chalk.gray('●');
    } else if (i < center) {
      bar += chalk.blue('─');
    } else {
      bar += chalk.red('─');
    }
  }

  return `[${bar}]`;
}

/**
 * Get label for lean value
 */
function getLeanLabel(lean: number): string {
  if (lean <= -0.6) return chalk.blue('Far Left');
  if (lean <= -0.3) return chalk.blue('Left');
  if (lean <= -0.1) return chalk.blue('Lean Left');
  if (lean >= 0.6) return chalk.red('Far Right');
  if (lean >= 0.3) return chalk.red('Right');
  if (lean >= 0.1) return chalk.red('Lean Right');
  return chalk.gray('Center');
}

/**
 * Format a 0-1 value as percentage
 */
function formatPercent(value: number): string {
  const pct = Math.round(value * 100);
  if (pct > 70) return chalk.red(`${pct}%`);
  if (pct > 40) return chalk.yellow(`${pct}%`);
  return chalk.green(`${pct}%`);
}
