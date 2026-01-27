'use client';

import { useRef, useCallback } from 'react';
import { Story } from '@/types/story';
import { VelocityIndicator } from './VelocityIndicator';
import { prefetchSummary } from '@/lib/prefetch';
import Link from 'next/link';

interface StoryCardProps {
  story: Story;
  rank: number;
}

export function StoryCard({ story, rank }: StoryCardProps) {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Prefetch on hover with 100ms delay
  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      prefetchSummary(story.id, story);
    }, 100);
  }, [story]);

  // Cancel prefetch if user leaves quickly
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Mobile: prefetch on touch start
  const handleTouchStart = useCallback(() => {
    prefetchSummary(story.id, story);
  }, [story]);

  return (
    <div
      className="cartoon-border bg-white dark:bg-[#151515] p-0 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      {/* Main row - Reddit style */}
      <div className="flex">
        {/* Rank column */}
        <div className="flex flex-col items-center justify-center px-4 py-4 border-r-2 border-black dark:border-white bg-gray-50 dark:bg-black">
          <span className="text-2xl font-black">{rank}</span>
        </div>

        {/* Content column */}
        <div className="flex-1 p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Link href={`/story/${story.id}`}>
                <h2 className="text-lg font-bold leading-tight cursor-pointer hover:underline">
                  {story.title}
                </h2>
              </Link>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {story.summary}
              </p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <VelocityIndicator velocity={story.velocity} score={story.velocityScore} />

            <span className="text-xs text-gray-500">
              Updated {timeAgo(story.updatedAt)}
            </span>

            <span className="text-xs text-gray-500">
              {story.sources.length} sources
            </span>
          </div>

          {/* Prediction Market */}
          <div className="mt-3 text-sm">
            {story.predictionMarkets && story.predictionMarkets.length > 0 ? (
              <a
                href={story.predictionMarkets[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <span>📊</span>
                <span className="font-bold text-black dark:text-white">
                  {Math.round(story.predictionMarkets[0].probability * 100)}%
                </span>
                <span className="truncate">{story.predictionMarkets[0].question}</span>
              </a>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                <span>📊</span>
                <span>No prediction markets for this story</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
