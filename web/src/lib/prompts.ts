import { Source, Story } from '@/types/story';

// Format sources into a structured context block for Claude
function formatSourcesForPrompt(sources: Source[]): string {
  return sources
    .map((source, i) => {
      const leanLabel = {
        'left': 'Left-leaning',
        'left-center': 'Left-center',
        'center': 'Center',
        'right-center': 'Right-center',
        'right': 'Right-leaning',
      }[source.lean];

      return `
[SOURCE ${i + 1}: ${source.name}]
Political Lean: ${leanLabel} (bias score: ${source.biasScore}/100)
Published: ${new Date(source.publishedAt).toLocaleDateString()}
Headline: ${source.headline}
Content: ${source.snippet}
URL: ${source.url}
`.trim();
    })
    .join('\n\n');
}

export function buildSummaryPrompt(story: Story): string {
  const sourcesContext = formatSourcesForPrompt(story.sources);

  return `You are a neutral Wikipedia editor writing about a current news event. Your goal is to create a comprehensive, balanced summary that a reader from ANY political perspective would consider fair.

## THE STORY
Title: ${story.title}
Brief Summary: ${story.summary}
Last Updated: ${new Date(story.updatedAt).toLocaleDateString()}

## SOURCE COVERAGE
${sourcesContext}

## EXISTING ANALYSIS (for context)
Left Perspective: ${story.analysis.leftPerspective}
Right Perspective: ${story.analysis.rightPerspective}
Agreed Facts: ${story.analysis.agreedFacts.join('; ')}
Key Differences: ${story.analysis.keyDifferences.join('; ')}
Unanswered Questions: ${story.analysis.unansweredQuestions.join('; ')}

---

## YOUR TASK

Write a comprehensive, Wikipedia-style neutral summary with the following sections. Output as JSON matching this exact structure:

{
  "overview": "2-3 sentence neutral summary of the news event",
  "timeline": [
    {"date": "YYYY-MM-DD or descriptive", "event": "What happened", "sources": ["Source names"]}
  ],
  "keyFigures": [
    {"name": "Person/Org name", "role": "Their role in this story", "background": "Relevant neutral background", "sources": ["Source names"]}
  ],
  "verifiedFacts": [
    {"fact": "Something multiple sources agree on", "sources": ["Source names"]}
  ],
  "disputed": [
    {
      "topic": "What is being disputed",
      "perspectives": [
        {"source": "Source name", "position": "Their framing/claim"}
      ]
    }
  ],
  "context": "Historical/background context needed to understand this story (1-2 paragraphs)",
  "unclearQuestions": ["Important questions that remain unanswered"]
}

## WIKIPEDIA NPOV GUIDELINES

1. **Neutral language**: Use passive voice for claims ("According to X...", "X reported that...")
2. **No judgment adjectives**: Instead of "controversial", say "disputed" or "debated"
3. **Equal weight**: Present opposing viewpoints with similar depth and tone
4. **Source attribution**: Always note which outlet/source makes which claim
5. **Language differences**: Note when sources use different terms for the same thing (e.g., "protesters" vs "rioters")
6. **NEVER use**: "slammed", "blasted", "fired back", "critics say", "some argue" (weasel words)

Output ONLY the JSON object, no additional text.`;
}

// Validate the AI response matches our expected structure
export function validateSummaryResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const summary = data as Record<string, unknown>;

  const requiredFields = [
    'overview',
    'timeline',
    'keyFigures',
    'verifiedFacts',
    'disputed',
    'context',
    'unclearQuestions',
  ];

  for (const field of requiredFields) {
    if (!(field in summary)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Type checks
  if (typeof summary.overview !== 'string') return false;
  if (!Array.isArray(summary.timeline)) return false;
  if (!Array.isArray(summary.keyFigures)) return false;
  if (!Array.isArray(summary.verifiedFacts)) return false;
  if (!Array.isArray(summary.disputed)) return false;
  if (typeof summary.context !== 'string') return false;
  if (!Array.isArray(summary.unclearQuestions)) return false;

  return true;
}
