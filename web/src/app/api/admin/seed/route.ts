/**
 * POST /api/admin/seed
 *
 * Seeds the database with mock stories.
 * Useful for initial setup or testing.
 *
 * Requires CRON_SECRET for authentication in production.
 */

import { NextResponse } from 'next/server';
import { seedDatabase, getStoryCount } from '@/lib/db/stories';

export async function POST(request: Request) {
  // Check authentication in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const before = await getStoryCount();
    const result = await seedDatabase();
    const after = await getStoryCount();

    return NextResponse.json({
      success: true,
      message: `Seeded ${result.seeded} stories`,
      before,
      after,
      seededAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed database',
      },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing in browser
export async function GET(request: Request) {
  return POST(request);
}
