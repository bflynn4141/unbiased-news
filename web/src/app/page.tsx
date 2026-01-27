import { StoryCard } from '@/components/StoryCard';
import { Story } from '@/types/story';

// Mock data - this will come from our pipeline API
const mockStories: Story[] = [
  {
    id: '1',
    title: 'Government Shutdown Looms as Democrats Block DHS Funding',
    summary: 'Federal funding expires Jan 31 as immigration enforcement dispute escalates between parties.',
    velocity: 'fast',
    velocityScore: 78,
    updatedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    sources: [
      { name: 'Fox News', lean: 'right', biasScore: 78, url: '#', headline: 'Freedom Caucus to Trump: DHS funding must stay', snippet: 'Conservative members demand full funding...', publishedAt: new Date().toISOString() },
      { name: 'NBC News', lean: 'left-center', biasScore: 32, url: '#', headline: 'Democrats threaten to block DHS funding after another killed', snippet: 'Senate Democrats vow opposition to ICE tactics...', publishedAt: new Date().toISOString() },
      { name: 'CNBC', lean: 'center', biasScore: 51, url: '#', headline: 'Government may shut down early Saturday', snippet: 'Tax season delays, federal workers furloughed...', publishedAt: new Date().toISOString() },
      { name: 'PBS', lean: 'center', biasScore: 48, url: '#', headline: 'Democrats vow to block Homeland Security funding', snippet: 'Bipartisan tensions rise as deadline approaches...', publishedAt: new Date().toISOString() },
    ],
    analysis: {
      leftPerspective: 'The Trump administration is using ICE to conduct abusive raids that "rip apart families" and violate due process. Democrats are standing up for immigrant rights and oversight.',
      rightPerspective: 'Democrats are "siding with criminal illegal aliens" over American citizens. Full DHS funding is essential for law and order and protecting communities.',
      agreedFacts: [
        'Government funding expires January 31 at midnight',
        'Democrats are blocking the DHS funding bill',
        '~875,000 federal employees would be furloughed',
        'Dispute centers on immigration enforcement',
      ],
      keyDifferences: [
        'Language: "criminal illegal aliens" (Fox) vs "undocumented immigrants" (NBC)',
        'Victim framing: American citizens at risk (right) vs immigrant families separated (left)',
        'Solution: Full ICE funding (right) vs pause raids and oversight (left)',
      ],
      unansweredQuestions: [
        'What specific ICE actions triggered Democratic opposition?',
        'What is the actual economic cost of a shutdown?',
        'Is there a compromise proposal being discussed?',
        'How does public opinion break down on this issue?',
      ],
    },
    coverageBalance: { left: 35, center: 30, right: 35 },
  },
  {
    id: '2',
    title: 'Trump Signs Executive Orders on Day One',
    summary: 'New administration begins with sweeping policy changes on immigration, energy, and federal workforce.',
    velocity: 'medium',
    velocityScore: 45,
    updatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    sources: [
      { name: 'CNN', lean: 'left-center', biasScore: 35, url: '#', headline: 'Trump signs flurry of executive orders', snippet: 'Critics call moves unconstitutional...', publishedAt: new Date().toISOString() },
      { name: 'Wall Street Journal', lean: 'right-center', biasScore: 62, url: '#', headline: 'Trump moves quickly on policy priorities', snippet: 'Markets react positively to deregulation...', publishedAt: new Date().toISOString() },
      { name: 'AP News', lean: 'center', biasScore: 50, url: '#', headline: 'Trump signs executive orders on first day', snippet: 'Orders cover immigration, energy, federal hiring...', publishedAt: new Date().toISOString() },
    ],
    analysis: {
      leftPerspective: 'Trump is bypassing Congress with a "flurry" of executive orders, many of which are likely unconstitutional. Critics warn of authoritarian overreach.',
      rightPerspective: 'Trump is delivering on campaign promises swiftly and decisively. Markets and businesses welcome the deregulatory agenda.',
      agreedFacts: [
        'Trump signed multiple executive orders on inauguration day',
        'Orders address immigration, energy, and federal workforce',
        'This is a historically high number of day-one executive actions',
      ],
      keyDifferences: [
        'Tone: "flurry" suggesting chaos (left) vs "swift action" suggesting leadership (right)',
        'Focus: Constitutional concerns (left) vs market reaction (right)',
      ],
      unansweredQuestions: [
        'Which executive orders will face legal challenges?',
        'How do these compare to previous administrations\' first days?',
      ],
    },
    coverageBalance: { left: 40, center: 25, right: 35 },
  },
  {
    id: '3',
    title: 'Fed Rate Decision Expected Wednesday',
    summary: 'Markets anticipate Federal Reserve will hold rates steady amid mixed economic signals.',
    velocity: 'slow',
    velocityScore: 15,
    updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    sources: [
      { name: 'Bloomberg', lean: 'center', biasScore: 52, url: '#', headline: 'Fed expected to hold rates in January', snippet: 'Inflation data supports pause in cuts...', publishedAt: new Date().toISOString() },
      { name: 'Reuters', lean: 'center', biasScore: 50, url: '#', headline: 'Federal Reserve rate decision looms', snippet: 'Economic indicators point to steady policy...', publishedAt: new Date().toISOString() },
    ],
    analysis: {
      leftPerspective: 'The Fed should prioritize employment and avoid choking off economic recovery with premature rate hikes.',
      rightPerspective: 'Inflation remains a concern. The Fed should maintain vigilance and not cut rates too quickly.',
      agreedFacts: [
        'Fed meeting scheduled for January 29',
        'Markets expect rates to remain unchanged',
        'Inflation has cooled but remains above 2% target',
      ],
      keyDifferences: [
        'Priority: Employment (left) vs inflation control (right)',
      ],
      unansweredQuestions: [
        'When will the next rate cut occur?',
        'How will tariff policies affect inflation expectations?',
      ],
    },
    coverageBalance: { left: 20, center: 60, right: 20 },
  },
];

export default function Home() {
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
          {mockStories.map((story, index) => (
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
