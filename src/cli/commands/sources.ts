/**
 * Sources Command
 *
 * List and manage news sources.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  ALL_SOURCES,
  getSource,
  getSourcesByCategory,
  getSourcesByLean,
  getBalancedSources,
} from '../../core/sources/registry.js';
import type { NewsSource, SourceCategory } from '../../types/index.js';

export function sourcesCommand(program: Command): void {
  const sources = program
    .command('sources')
    .description('List and manage news sources');

  // List subcommand
  sources
    .command('list')
    .description('List available sources')
    .option('-c, --category <cat>', 'Filter by category')
    .option('-l, --lean <direction>', 'Filter by lean: left, center, right')
    .option('-b, --balanced', 'Show balanced selection')
    .option('--enabled', 'Only show enabled sources')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        runList(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Info subcommand
  sources
    .command('info <id>')
    .description('Show detailed info about a source')
    .action((id) => {
      runInfo(id);
    });

  // Stats subcommand
  sources
    .command('stats')
    .description('Show source statistics')
    .action(() => {
      runStats();
    });
}

interface ListOptions {
  category?: SourceCategory;
  lean?: 'left' | 'center' | 'right';
  balanced?: boolean;
  enabled?: boolean;
  json?: boolean;
}

function runList(options: ListOptions): void {
  let sources: NewsSource[] = ALL_SOURCES;

  // Apply filters
  if (options.category) {
    sources = getSourcesByCategory(options.category);
  }

  if (options.lean) {
    switch (options.lean) {
      case 'left':
        sources = sources.filter(s => s.knownBias.politicalLean < -0.2);
        break;
      case 'center':
        sources = sources.filter(s => s.knownBias.politicalLean >= -0.2 && s.knownBias.politicalLean <= 0.2);
        break;
      case 'right':
        sources = sources.filter(s => s.knownBias.politicalLean > 0.2);
        break;
    }
  }

  if (options.balanced) {
    sources = getBalancedSources(9);
  }

  if (options.enabled) {
    sources = sources.filter(s => s.enabled);
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify(sources.map(formatSourceForJson), null, 2));
    return;
  }

  // Text output
  console.log(chalk.bold(`\n${sources.length} Sources\n`));
  console.log(chalk.dim('─'.repeat(85)));
  console.log(
    chalk.bold('ID'.padEnd(15)) +
    chalk.bold('Name'.padEnd(25)) +
    chalk.bold('Category'.padEnd(14)) +
    chalk.bold('Lean'.padEnd(12)) +
    chalk.bold('Reliability')
  );
  console.log(chalk.dim('─'.repeat(85)));

  for (const source of sources) {
    const leanBar = createMiniLeanBar(source.knownBias.politicalLean);
    const reliabilityBar = createReliabilityBar(source.reliabilityScore);

    console.log(
      (source.enabled ? chalk.white : chalk.dim)(source.id.padEnd(15)) +
      (source.enabled ? chalk.white : chalk.dim)(source.name.slice(0, 24).padEnd(25)) +
      chalk.dim(source.category.padEnd(14)) +
      leanBar.padEnd(20) +
      reliabilityBar
    );
  }

  console.log(chalk.dim('─'.repeat(85)));
  console.log(chalk.dim(`\nUse 'unbiased sources info <id>' for detailed information`));
}

function runInfo(id: string): void {
  const source = getSource(id);

  if (!source) {
    console.error(chalk.red(`Source '${id}' not found`));
    console.log(chalk.dim('\nAvailable sources:'), ALL_SOURCES.map(s => s.id).join(', '));
    process.exit(1);
  }

  console.log(chalk.bold(`\n${source.name}`));
  console.log(chalk.dim('═'.repeat(50)));

  // Basic info
  console.log(chalk.bold('\nBasic Info:'));
  console.log(`  ID:       ${source.id}`);
  console.log(`  URL:      ${chalk.cyan(source.url)}`);
  console.log(`  Category: ${source.category}`);
  console.log(`  Enabled:  ${source.enabled ? chalk.green('Yes') : chalk.red('No')}`);

  // Metadata
  if (Object.keys(source.metadata).length > 0) {
    console.log(chalk.bold('\nMetadata:'));
    if (source.metadata.country) console.log(`  Country:   ${source.metadata.country}`);
    if (source.metadata.language) console.log(`  Language:  ${source.metadata.language}`);
    if (source.metadata.founded) console.log(`  Founded:   ${source.metadata.founded}`);
    if (source.metadata.ownership) console.log(`  Ownership: ${source.metadata.ownership}`);
  }

  // Bias indicators
  console.log(chalk.bold('\nBias Profile:'));
  console.log(`  Political Lean:   ${createMiniLeanBar(source.knownBias.politicalLean)} ${getLeanLabel(source.knownBias.politicalLean)}`);
  console.log(`  Sensationalism:   ${createPercentBar(source.knownBias.sensationalism)} ${formatPercent(source.knownBias.sensationalism)}`);
  console.log(`  Factual Accuracy: ${createPercentBar(source.knownBias.factualAccuracy)} ${formatPercent(source.knownBias.factualAccuracy)}`);
  console.log(`  Opinion Mixing:   ${createPercentBar(source.knownBias.opinionMixing)} ${formatPercent(source.knownBias.opinionMixing)}`);
  console.log(`  Transparency:     ${createPercentBar(source.knownBias.transparency)} ${formatPercent(source.knownBias.transparency)}`);

  console.log(chalk.bold('\nReliability Score:'));
  console.log(`  ${createReliabilityBar(source.reliabilityScore)} ${(source.reliabilityScore * 100).toFixed(0)}%`);

  // Feeds
  console.log(chalk.bold('\nRSS Feeds:'));
  for (const feed of source.feeds) {
    console.log(`  ${chalk.dim(`[${feed.priority}]`)} ${feed.section}`);
    console.log(chalk.dim(`      ${feed.url}`));
  }

  console.log();
}

function runStats(): void {
  console.log(chalk.bold('\nSource Statistics\n'));
  console.log(chalk.dim('═'.repeat(50)));

  // By category
  console.log(chalk.bold('\nBy Category:'));
  const categories = ['wire', 'mainstream', 'broadcast', 'public', 'digital-native', 'international', 'local', 'independent'] as SourceCategory[];
  for (const cat of categories) {
    const count = getSourcesByCategory(cat).length;
    if (count > 0) {
      console.log(`  ${cat.padEnd(15)} ${chalk.cyan(count)}`);
    }
  }

  // By lean
  console.log(chalk.bold('\nBy Political Lean:'));
  const left = ALL_SOURCES.filter(s => s.knownBias.politicalLean < -0.2).length;
  const center = ALL_SOURCES.filter(s => s.knownBias.politicalLean >= -0.2 && s.knownBias.politicalLean <= 0.2).length;
  const right = ALL_SOURCES.filter(s => s.knownBias.politicalLean > 0.2).length;

  const maxCount = Math.max(left, center, right);
  const scale = 20 / maxCount;

  console.log(`  Left   ${chalk.blue('█'.repeat(Math.round(left * scale)).padEnd(20))} ${left}`);
  console.log(`  Center ${chalk.gray('█'.repeat(Math.round(center * scale)).padEnd(20))} ${center}`);
  console.log(`  Right  ${chalk.red('█'.repeat(Math.round(right * scale)).padEnd(20))} ${right}`);

  // Reliability distribution
  console.log(chalk.bold('\nReliability Distribution:'));
  const high = ALL_SOURCES.filter(s => s.reliabilityScore >= 0.8).length;
  const medium = ALL_SOURCES.filter(s => s.reliabilityScore >= 0.6 && s.reliabilityScore < 0.8).length;
  const low = ALL_SOURCES.filter(s => s.reliabilityScore < 0.6).length;

  console.log(`  High (≥80%)   ${chalk.green('█'.repeat(high))} ${high}`);
  console.log(`  Medium (60-79%) ${chalk.yellow('█'.repeat(medium))} ${medium}`);
  console.log(`  Low (<60%)    ${chalk.red('█'.repeat(low))} ${low}`);

  // Summary
  console.log(chalk.bold('\nSummary:'));
  console.log(`  Total sources: ${ALL_SOURCES.length}`);
  console.log(`  Enabled:       ${ALL_SOURCES.filter(s => s.enabled).length}`);
  console.log(`  Total feeds:   ${ALL_SOURCES.reduce((s, src) => s + src.feeds.length, 0)}`);

  console.log();
}

// Helper functions

function formatSourceForJson(source: NewsSource) {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    category: source.category,
    enabled: source.enabled,
    bias: {
      politicalLean: source.knownBias.politicalLean,
      leanLabel: getLeanLabel(source.knownBias.politicalLean).replace(/\u001b\[\d+m/g, ''),
    },
    reliabilityScore: source.reliabilityScore,
    feedCount: source.feeds.length,
    metadata: source.metadata,
  };
}

function createMiniLeanBar(lean: number): string {
  const position = Math.round((lean + 1) * 4); // 0-8
  let bar = '';
  for (let i = 0; i < 9; i++) {
    if (i === 4) {
      bar += chalk.dim('│');
    } else if (i === position) {
      bar += lean < -0.2 ? chalk.blue('●') : lean > 0.2 ? chalk.red('●') : chalk.gray('●');
    } else {
      bar += chalk.dim('─');
    }
  }
  return bar;
}

function createPercentBar(value: number): string {
  const filled = Math.round(value * 10);
  const empty = 10 - filled;

  const color = value > 0.7 ? chalk.green : value > 0.4 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

function createReliabilityBar(value: number): string {
  const filled = Math.round(value * 10);
  const empty = 10 - filled;

  const color = value >= 0.8 ? chalk.green : value >= 0.6 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

function getLeanLabel(lean: number): string {
  if (lean <= -0.6) return chalk.blue('Far Left');
  if (lean <= -0.3) return chalk.blue('Left');
  if (lean <= -0.1) return chalk.blue('Lean Left');
  if (lean >= 0.6) return chalk.red('Far Right');
  if (lean >= 0.3) return chalk.red('Right');
  if (lean >= 0.1) return chalk.red('Lean Right');
  return chalk.gray('Center');
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
