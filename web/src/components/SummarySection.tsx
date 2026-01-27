'use client';

import { useEffect, useState } from 'react';
import { Story, BalancedSummary } from '@/types/story';
import { getOrFetchSummary, getReadySummary } from '@/lib/prefetch';
import BalancedSummaryComponent from './BalancedSummary';
import SummaryLoadingSkeleton from './SummaryLoadingSkeleton';

interface SummarySectionProps {
  story: Story;
}

export function SummarySection({ story }: SummarySectionProps) {
  const [summary, setSummary] = useState<BalancedSummary | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already prefetched
    const ready = getReadySummary(story.id);
    if (ready) {
      setSummary(ready.summary);
      setCached(ready.cached);
      setLoading(false);
      return;
    }

    // Otherwise fetch (will use prefetch if in progress)
    getOrFetchSummary(story.id, story)
      .then((result) => {
        setSummary(result.summary);
        setCached(result.cached);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load summary');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [story]);

  return (
    <>
      {/* Balanced Summary badge */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">📖</span>
          Full Balanced Summary
        </h2>
        {cached && !loading && (
          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded font-medium">
            ⚡ Cached
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="cartoon-border bg-white dark:bg-[#151515] p-6 md:p-8">
        {loading ? (
          <SummaryLoadingSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Make sure ANTHROPIC_API_KEY is set in your environment.
            </p>
          </div>
        ) : summary ? (
          <BalancedSummaryComponent summary={summary} />
        ) : null}
      </div>
    </>
  );
}
