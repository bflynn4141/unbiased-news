import { StoryCard } from '@/components/StoryCard';
import { getStories } from '@/lib/db/stories';

export default async function Home() {
  // Fetch stories from database (falls back to mock data if KV unavailable)
  const stories = await getStories();
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b-4 border-black dark:border-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* Logo - cartoon newspaper */}
            <div className="w-12 h-12 border-3 border-black rounded-lg bg-white flex items-center justify-center text-2xl">
              📰
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">UNBIASED NEWS</h1>
              <p className="text-xs text-gray-500 font-medium">See the whole story. Spot the spin.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Subheader */}
      <div className="border-b-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">Today&apos;s Top Stories</span>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Live updates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {stories.map((story, index) => (
            <StoryCard key={story.id} story={story} rank={index + 1} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-xs text-gray-500 py-8 border-t-2 border-gray-200 dark:border-gray-800">
          <p className="font-medium">🎭 No news source is truly unbiased. We show you all sides so you can decide.</p>
          <p className="mt-2">Built with AI analysis • Updated every hour • <a href="https://github.com/bflynn4141/unbiased-news" className="underline">Open source</a></p>
        </div>
      </main>
    </div>
  );
}
