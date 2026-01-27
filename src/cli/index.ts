#!/usr/bin/env node
/**
 * Unbiased News CLI
 *
 * Command-line interface for the news aggregator.
 *
 * Commands:
 * - fetch: Fetch articles from news sources
 * - analyze: Analyze bias in articles
 * - aggregate: Group articles into stories
 * - sources: List and manage news sources
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { fetchCommand } from './commands/fetch.js';
import { analyzeCommand } from './commands/analyze.js';
import { aggregateCommand } from './commands/aggregate.js';
import { sourcesCommand } from './commands/sources.js';

const program = new Command();

program
  .name('unbiased')
  .description('An unbiased news aggregator with bias detection')
  .version('0.1.0');

// Register commands
fetchCommand(program);
analyzeCommand(program);
aggregateCommand(program);
sourcesCommand(program);

// Add some helpful examples
program.addHelpText('after', `

${chalk.bold('Examples:')}
  ${chalk.dim('# Fetch news from all enabled sources')}
  $ unbiased fetch

  ${chalk.dim('# Fetch from specific sources')}
  $ unbiased fetch --sources ap,reuters,nyt

  ${chalk.dim('# Analyze bias in recent articles')}
  $ unbiased analyze --method combined

  ${chalk.dim('# Aggregate articles into stories')}
  $ unbiased aggregate --min-sources 3

  ${chalk.dim('# List all available sources')}
  $ unbiased sources list

  ${chalk.dim('# Show sources by political lean')}
  $ unbiased sources list --lean left
`);

// Parse arguments
program.parse();
