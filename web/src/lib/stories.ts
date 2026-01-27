import { Story } from '@/types/story';

// Mock data - this will come from our pipeline API
// Exported so both the feed and detail pages can access stories
export const mockStories: Story[] = [
  {
    id: '1',
    title: 'Government Shutdown Looms as Democrats Block DHS Funding',
    summary: 'Federal funding expires Jan 31 as immigration enforcement dispute escalates between parties.',
    velocity: 'fast',
    velocityScore: 12, // 12 new articles in last hour
    updatedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    sources: [
      { name: 'Fox News', lean: 'right', biasScore: 78, url: 'https://www.foxnews.com/politics/house-democrats-break-jeffries-pass-dhs-funding-despite-ice-backlash', headline: 'Democrats join Republicans to pass DHS bill despite party opposition', snippet: 'Seven Democrats voted with Republicans to pass a Department of Homeland Security spending bill, despite opposition from their own leadership over unmet demands for additional guardrails on ICE operations.', publishedAt: new Date().toISOString() },
      { name: 'NBC News', lean: 'left-center', biasScore: 32, url: 'https://www.nbcnews.com/politics/congress/dhs-funding-bill-senate-hurdles-killed-minneapolis-rcna255769', headline: 'Senate Democrats threaten to block DHS funding bill after another person killed in Minneapolis', snippet: 'Senate Democrats vow opposition to ICE tactics following reports of aggressive enforcement actions in communities. Civil rights groups call for oversight and accountability measures before any funding approval.', publishedAt: new Date().toISOString() },
      { name: 'CNBC', lean: 'center', biasScore: 51, url: 'https://www.cnbc.com/2026/01/25/minneapolis-shooting-government-shutdown.html', headline: 'Government shutdown odds grow over DHS funding', snippet: 'Tax season delays, federal workers furloughed if no deal reached by Friday midnight. Economic analysts warn of GDP impact and disrupted government services affecting millions of Americans.', publishedAt: new Date().toISOString() },
      { name: 'PBS', lean: 'center', biasScore: 48, url: 'https://www.pbs.org/newshour/show/democrats-vow-to-block-homeland-security-funding-after-minnesota-shooting', headline: 'Democrats vow to block Homeland Security funding after Minnesota shooting', snippet: 'Bipartisan tensions rise as deadline approaches. Both parties accuse the other of putting politics above national interests as federal employees brace for potential furloughs.', publishedAt: new Date().toISOString() },
      { name: 'NPR', lean: 'center', biasScore: 48, url: 'https://www.npr.org/2026/01/26/nx-s1-5686473/senate-democrats-to-vote-against-dhs-funding-setting-up-potential-partial-shutdown', headline: 'Senate Democrats to vote against DHS funding', snippet: 'With hours until deadline, negotiations remain stalled on Department of Homeland Security funding. Congressional leaders scheduled emergency meeting as markets react to uncertainty.', publishedAt: new Date().toISOString() },
      { name: 'The Hill', lean: 'center', biasScore: 52, url: 'https://thehill.com/homenews/senate/5703928-dhs-funding-minneapolis-shooting-shutdown/', headline: 'Second fatal Minneapolis shooting puts Congress on verge of shutdown', snippet: 'Congressional insiders give shutdown 70% probability without last-minute deal. Both parties prepare blame messaging while moderate lawmakers seek compromise solution.', publishedAt: new Date().toISOString() },
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
    predictionMarkets: [
      {
        platform: 'polymarket',
        question: 'Will there be a US government shutdown by January 31?',
        probability: 0.80,
        volume: 11000000,
        url: 'https://polymarket.com/event/will-there-be-another-us-government-shutdown-by-january-31',
        updatedAt: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      },
    ],
  },
  {
    id: '2',
    title: 'Trump Signs Executive Orders on Day One',
    summary: 'New administration begins with sweeping policy changes on immigration, energy, and federal workforce.',
    velocity: 'medium',
    velocityScore: 5, // 5 new articles today
    updatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    sources: [
      { name: 'CNN', lean: 'left-center', biasScore: 35, url: 'https://www.cnn.com/2025/01/20/politics/executive-actions-trump-day-1/index.html', headline: 'Executive actions Trump has taken so far', snippet: 'Critics call moves unconstitutional as new president signs record number of day-one actions. Legal experts warn several orders will face immediate court challenges.', publishedAt: new Date().toISOString() },
      { name: 'Washington Post', lean: 'left-center', biasScore: 35, url: 'https://www.washingtonpost.com/politics/2025/01/20/trump-executive-orders-list/', headline: 'The list of executive orders Trump signed on Day 1 in office', snippet: 'Sweeping orders target immigration policy, environmental regulations, and diversity programs. Civil rights organizations announce legal challenges.', publishedAt: new Date().toISOString() },
      { name: 'NPR', lean: 'center', biasScore: 48, url: 'https://www.npr.org/2025/01/20/g-s1-43698/trump-inauguration-executive-orders-2025-day-1', headline: 'Trump signs executive actions on Jan. 6, TikTok, immigration and more', snippet: 'Orders cover immigration, energy, federal hiring freeze, and withdrawal from international agreements. Total count exceeds any previous inauguration day.', publishedAt: new Date().toISOString() },
      { name: 'NBC News', lean: 'left-center', biasScore: 32, url: 'https://www.nbcnews.com/politics/donald-trump/live-blog/trump-inauguration-2025-live-updates-rcna184510', headline: 'President Trump signs executive orders and pardons Jan. 6 defendants', snippet: 'Markets react positively to deregulation signals. Business leaders praise decisive action on energy permits and federal hiring freeze.', publishedAt: new Date().toISOString() },
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
    velocityScore: 2, // 2 new articles today (stable story)
    updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    sources: [
      { name: 'Bloomberg', lean: 'center', biasScore: 52, url: 'https://www.bloomberg.com/news/articles/2025-12-02/federal-reserve-interest-rate-decision-likely-to-show-divide', headline: 'Federal Reserve Interest-Rate Decision Likely to Show Divide', snippet: 'Inflation data supports pause in cuts as Fed officials signal patience. Markets pricing in no change at upcoming FOMC meeting.', publishedAt: new Date().toISOString() },
      { name: 'CBS News', lean: 'center', biasScore: 50, url: 'https://www.cbsnews.com/news/federal-reserve-fomc-meeting-january-28-interest-rate-decision-jerome-powell/', headline: 'Federal Reserve meets Wednesday for its first interest rate decision of 2026', snippet: 'Economic indicators point to steady policy as central bank balances growth and inflation concerns. Employment remains strong while price pressures ease.', publishedAt: new Date().toISOString() },
      { name: 'CNBC', lean: 'center', biasScore: 51, url: 'https://www.cnbc.com/2026/01/27/fed-preview-january-2026.html', headline: 'The Fed releases its latest interest rate decision Wednesday', snippet: 'Central bankers eye tariff implications and fiscal policy changes. Minutes from December meeting revealed divided opinions on rate path.', publishedAt: new Date().toISOString() },
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
    predictionMarkets: [
      {
        platform: 'polymarket',
        question: 'Fed keeps rates unchanged in January?',
        probability: 0.99,
        volume: 471000000,
        url: 'https://polymarket.com/event/fed-decision-in-january',
        updatedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      },
    ],
  },
];

// Helper to find a story by ID
export function getStoryById(id: string): Story | undefined {
  return mockStories.find((story) => story.id === id);
}
