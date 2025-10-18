import { NextRequest, NextResponse } from 'next/server';
import { getEventsByUserAndDate, getUserById } from '@/lib/db-operations';

export async function POST(req: NextRequest) {
  try {
    const { userId, date } = await req.json();

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'Missing userId or date' },
        { status: 400 }
      );
    }

    // Get all events for this user on this date
    const eventsResult = await getEventsByUserAndDate(userId, date);
    if (!eventsResult.success) {
      return NextResponse.json(
        { error: eventsResult.error || 'Failed to fetch events' },
        { status: 500 }
      );
    }
    const events = (eventsResult.data || []) as Array<{ start_time?: string | null; end_time?: string | null }>;

    // Get user's email for reference
    const userResult = await getUserById(userId);
    const userData = userResult.data as { user?: { email?: string } } | undefined;

    // Calendar hours: 7 AM to 10 PM (22:00) every day
    const workStart = 7;
    const workEnd = 22;

    const busySlots: Array<{ start: string; end: string }> = [];

    // Add all events as busy
    events?.forEach((event) => {
      if (event.start_time && event.end_time) {
        busySlots.push({
          start: event.start_time,
          end: event.end_time,
        });
      }
    });

    return NextResponse.json({
      date,
      userEmail: userData?.user?.email || 'Unknown',
      workHours: {
        start: workStart,
        end: workEnd,
      },
      busySlots,
      events: events || [],
    });
  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
