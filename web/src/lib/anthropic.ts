import Anthropic from '@anthropic-ai/sdk';

// Singleton pattern for Anthropic client
// Reuses the same client instance across requests
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Add it to your .env.local file.'
      );
    }

    client = new Anthropic({ apiKey });
  }

  return client;
}

// Model selection - Sonnet for balance of speed and quality
export const SUMMARY_MODEL = 'claude-sonnet-4-20250514';

// Token limits
export const MAX_INPUT_TOKENS = 8000;  // Context for sources
export const MAX_OUTPUT_TOKENS = 4000; // Comprehensive summary
