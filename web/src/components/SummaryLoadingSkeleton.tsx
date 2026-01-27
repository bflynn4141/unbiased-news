'use client';

export default function SummaryLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Overview skeleton */}
      <section>
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
      </section>

      {/* Timeline skeleton */}
      <section>
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Key Figures skeleton */}
      <section>
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      </section>

      {/* Verified Facts skeleton */}
      <section>
        <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Disputed skeleton */}
      <section>
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            ))}
          </div>
        </div>
      </section>

      {/* Loading message */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Generating balanced summary with Claude...</span>
        </div>
      </div>
    </div>
  );
}
