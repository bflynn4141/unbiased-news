'use client';

import { BalancedSummary as BalancedSummaryType } from '@/types/story';

interface Props {
  summary: BalancedSummaryType;
}

export default function BalancedSummary({ summary }: Props) {
  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <section>
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span className="text-2xl">📋</span> Overview
        </h2>
        <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
          {summary.overview}
        </p>
      </section>

      {/* Timeline Section */}
      {summary.timeline.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span> Timeline of Events
          </h2>
          <div className="relative border-l-4 border-black dark:border-white pl-6 space-y-6">
            {summary.timeline.map((event, i) => (
              <div key={i} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[34px] top-1 w-4 h-4 bg-black dark:bg-white rounded-full" />
                <div className="font-mono text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {event.date}
                </div>
                <p className="text-gray-800 dark:text-gray-200">{event.event}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Sources: {event.sources.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Figures Section */}
      {summary.keyFigures.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">👤</span> Key Figures
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.keyFigures.map((figure, i) => (
              <div
                key={i}
                className="cartoon-border bg-white dark:bg-[#1a1a1a] p-4"
              >
                <h3 className="font-bold text-lg">{figure.name}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {figure.role}
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {figure.background}
                </p>
                <div className="text-xs text-gray-400 mt-2">
                  via {figure.sources.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What We Know (Verified Facts) */}
      {summary.verifiedFacts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">✅</span> What We Know
          </h2>
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-300 mb-4 italic">
              Facts that multiple sources agree on
            </p>
            <ul className="space-y-3">
              {summary.verifiedFacts.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <div>
                    <span className="text-gray-800 dark:text-gray-200">
                      {item.fact}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({item.sources.join(', ')})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* What's Disputed */}
      {summary.disputed.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚖️</span> What&apos;s Disputed
          </h2>
          <div className="space-y-4">
            {summary.disputed.map((item, i) => (
              <div
                key={i}
                className="border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4"
              >
                <h3 className="font-semibold mb-3 text-amber-800 dark:text-amber-300">
                  {item.topic}
                </h3>
                <div className="space-y-2">
                  {item.perspectives.map((p, j) => (
                    <div
                      key={j}
                      className="flex gap-2 text-sm border-l-2 border-gray-300 dark:border-gray-600 pl-3"
                    >
                      <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">
                        {p.source}:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        &ldquo;{p.position}&rdquo;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Context & Background */}
      {summary.context && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📚</span> Context & Background
          </h2>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {summary.context}
            </p>
          </div>
        </section>
      )}

      {/* What Remains Unclear */}
      {summary.unclearQuestions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">❓</span> What Remains Unclear
          </h2>
          <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <ul className="space-y-2">
              {summary.unclearQuestions.map((question, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-purple-500 dark:text-purple-400">?</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {question}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Meta info */}
      <footer className="pt-6 border-t-2 border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex flex-wrap gap-4 justify-between">
          <span>
            Generated: {new Date(summary.generatedAt).toLocaleString()}
          </span>
          <span>Based on {summary.sourceCount} sources</span>
        </div>
      </footer>
    </div>
  );
}
