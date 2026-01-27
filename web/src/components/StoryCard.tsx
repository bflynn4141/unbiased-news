'use client';

import { Story } from '@/types/story';
import { VelocityIndicator } from './VelocityIndicator';
import { BiasSpectrum } from './BiasSpectrum';
import { useState } from 'react';
import Link from 'next/link';

interface StoryCardProps {
  story: Story;
  rank: number;
}

export function StoryCard({ story, rank }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);

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
              <h2
                className="text-lg font-bold leading-tight cursor-pointer hover:underline"
                onClick={() => setExpanded(!expanded)}
              >
                {story.title}
              </h2>
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

      {/* Expanded view */}
      {expanded && (
        <div className="border-t-2 border-black dark:border-white p-4 bg-gray-50 dark:bg-black">
          {/* The Delta */}
          <div className="grid md:grid-cols-2 gap-6">
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
          <div className="mt-6">
            <h3 className="font-bold text-sm mb-2">✅ Agreed Facts</h3>
            <ul className="text-sm space-y-1 pl-6">
              {story.analysis.agreedFacts.map((fact, i) => (
                <li key={i} className="text-gray-700 dark:text-gray-300">• {fact}</li>
              ))}
            </ul>
          </div>

          {/* Key Differences */}
          <div className="mt-4">
            <h3 className="font-bold text-sm mb-2">⚡ Key Differences</h3>
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
              {story.predictionMarkets.map((market, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{market.question}</span>
                  <span className="font-bold">{Math.round(market.probability * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex border-t-2 border-black dark:border-white">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-[#0a0a0a] transition-colors"
        >
          {expanded ? '▲ Collapse' : '▼ See the Delta'}
        </button>
        <Link
          href={`/story/${story.id}`}
          className="flex-1 py-2 text-xs font-bold text-center text-gray-500 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-[#0a0a0a] border-l-2 border-black dark:border-white transition-colors"
        >
          📖 Full Summary
        </Link>
      </div>
    </div>
  );
}
