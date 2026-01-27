'use client';

import { Story } from '@/types/story';
import { VelocityIndicator } from './VelocityIndicator';
import { BiasSpectrum } from './BiasSpectrum';
import Link from 'next/link';

interface StoryCardProps {
  story: Story;
  rank: number;
}

export function StoryCard({ story, rank }: StoryCardProps) {
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getBiasLabel = (score: number) => {
    if (score <= 30) return { label: 'L', class: 'source-left' };
    if (score <= 45) return { label: 'LC', class: 'source-left' };
    if (score <= 55) return { label: 'C', class: 'source-center' };
    if (score <= 70) return { label: 'RC', class: 'source-right' };
    return { label: 'R', class: 'source-right' };
  };

  return (
    <div className="cartoon-border bg-white dark:bg-[#151515] p-0 overflow-hidden">
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

          {/* Source pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {story.sources.slice(0, 5).map((source, i) => {
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
            {story.sources.length > 5 && (
              <span className="text-xs text-gray-500 self-center">
                +{story.sources.length - 5} more
              </span>
            )}
          </div>

          {/* Bias spectrum */}
          <div className="mt-4 max-w-xs">
            <BiasSpectrum coverageBalance={story.coverageBalance} />
          </div>
        </div>
      </div>
    </div>
  );
}
