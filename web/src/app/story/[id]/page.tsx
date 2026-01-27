import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoryById } from '@/lib/stories';
import { generateSummary } from '@/lib/summary';
import BalancedSummary from '@/components/BalancedSummary';
import { BiasSpectrum } from '@/components/BiasSpectrum';
import { VelocityIndicator } from '@/components/VelocityIndicator';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper function for bias labels
function getBiasLabel(score: number) {
  if (score <= 30) return { label: 'L', class: 'source-left' };
  if (score <= 45) return { label: 'LC', class: 'source-left' };
  if (score <= 55) return { label: 'C', class: 'source-center' };
  if (score <= 70) return { label: 'RC', class: 'source-right' };
  return { label: 'R', class: 'source-right' };
}

export default async function StoryPage({ params }: PageProps) {
  const { id } = await params;

  // Get story data
  const story = getStoryById(id);
  if (!story) {
    notFound();
  }

  // Generate summary server-side (cached after first generation)
  let summary = null;
  let cached = false;
  let error = null;

  try {
    const result = await generateSummary(story);
    summary = result.summary;
    cached = result.cached;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate summary';
    console.error('Summary generation error:', error);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b-4 border-black dark:border-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 border-2 border-black rounded-lg bg-white flex items-center justify-center text-xl">
                📰
              </div>
              <span className="font-black text-lg">UNBIASED NEWS</span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition"
            >
              ← Back to Feed
            </Link>
          </div>
        </div>
      </header>

      {/* Story Header - Clean and minimal */}
      <div className="border-b-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl md:text-3xl font-black leading-tight mb-3">
            {story.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {story.summary}
          </p>

          {/* Minimal meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <VelocityIndicator velocity={story.velocity} score={story.velocityScore} />
            <span className="text-gray-500">
              {story.sources.length} sources
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* The Delta - Quick comparison */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            The Delta
          </h2>
          <div className="cartoon-border bg-white dark:bg-[#151515] p-6">
            {/* Coverage Balance Section */}
            <div className="mb-6 pb-6 border-b-2 border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <h3 className="font-bold text-sm">Coverage Balance</h3>
                <div className="flex-1 max-w-xs">
                  <BiasSpectrum coverageBalance={story.coverageBalance} />
                </div>
              </div>

              {/* Source pills */}
              <div className="flex flex-wrap gap-2">
                {story.sources.map((source, i) => {
                  const bias = getBiasLabel(source.biasScore);
                  return (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${bias.class}`}
                    >
                      <span className="font-bold">{bias.label}</span>
                      <span>{source.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Two perspectives side by side */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Left perspective */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-black">L</span>
                  Left Perspective
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 pl-8">
                  {story.analysis.leftPerspective}
                </p>
              </div>

              {/* Right perspective */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-black">R</span>
                  Right Perspective
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 pl-8">
                  {story.analysis.rightPerspective}
                </p>
              </div>
            </div>

            {/* Agreed Facts */}
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-bold text-sm mb-2">✅ Agreed Facts</h3>
              <ul className="text-sm space-y-1 pl-6">
                {story.analysis.agreedFacts.map((fact, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">• {fact}</li>
                ))}
              </ul>
            </div>

            {/* Key Differences */}
            <div className="mt-4">
              <h3 className="font-bold text-sm mb-2">🔀 Key Differences</h3>
              <ul className="text-sm space-y-1 pl-6">
                {story.analysis.keyDifferences.map((diff, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">• {diff}</li>
                ))}
              </ul>
            </div>

            {/* Unanswered Questions */}
            <div className="mt-4">
              <h3 className="font-bold text-sm mb-2">❓ Unanswered Questions</h3>
              <ul className="text-sm space-y-1 pl-6">
                {story.analysis.unansweredQuestions.map((q, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">• {q}</li>
                ))}
              </ul>
            </div>

            {/* Prediction Markets (if available) */}
            {story.predictionMarkets && story.predictionMarkets.length > 0 && (
              <div className="mt-4 p-3 border-2 border-dashed border-gray-400 rounded-lg">
                <h3 className="font-bold text-sm mb-2">📊 What Bettors Think</h3>
                {story.predictionMarkets.map((market, i) => {
                  const updatedAgo = Math.floor((Date.now() - new Date(market.updatedAt).getTime()) / 60000);
                  const timeLabel = updatedAgo < 60 ? `${updatedAgo}m ago` : `${Math.floor(updatedAgo / 60)}h ago`;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm gap-3">
                      <a
                        href={market.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex-1"
                      >
                        {market.question} ↗
                      </a>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">{timeLabel}</span>
                        <span className="font-bold">{Math.round(market.probability * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Balanced Summary badge */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">📖</span>
            Full Balanced Summary
          </h2>
          {cached && (
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded font-medium">
              ⚡ Cached
            </span>
          )}
        </div>

        {/* Content area */}
        <div className="cartoon-border bg-white dark:bg-[#151515] p-6 md:p-8">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Make sure ANTHROPIC_API_KEY is set in your environment.
              </p>
            </div>
          ) : summary ? (
            <BalancedSummary summary={summary} />
          ) : null}
        </div>

        {/* Source Headlines Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🗞️</span>
            How Sources Covered It
          </h2>
          <div className="grid gap-3">
            {story.sources.map((source, i) => {
              const bias = getBiasLabel(source.biasScore);
              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cartoon-border bg-white dark:bg-[#151515] p-4 hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${bias.class}`}
                    >
                      {bias.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">{source.name}</div>
                      <h3 className="font-bold text-sm leading-tight mb-1">
                        {source.headline}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {source.snippet}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-500 py-8 border-t-2 border-gray-200 dark:border-gray-800">
          <p className="font-medium">
            🎭 This summary is AI-generated using Wikipedia&apos;s Neutral Point of View guidelines.
          </p>
          <p className="mt-2">
            Always read primary sources and think critically.
          </p>
        </div>
      </main>
    </div>
  );
}
