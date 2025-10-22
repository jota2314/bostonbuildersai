import { NextRequest, NextResponse } from 'next/server';
import { getEventsByUserAndDate } from '@/lib/db-operations';

const JORGE_USER_ID = 'b01606c2-dcb3-4566-826f-f1d7453d84ce';

export async function POST(req: NextRequest) {
  try {
    const { date } = await req.json();

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    console.log('📅 Checking availability for:', date);
    console.log('📅 Jorge User ID:', JORGE_USER_ID);

    const availabilityResult = await getEventsByUserAndDate(JORGE_USER_ID, date);

    console.log('📅 Database query result:', {
      success: availabilityResult.success,
      error: availabilityResult.error,
      eventCount: availabilityResult.data?.length || 0
    });

    const events = (availabilityResult.data || []) as Array<{ start_time?: string | null; end_time?: string | null }>;

    console.log('📅 Found events:', events);

    // Calendar hours: 7 AM to 10 PM (22:00) every day
    const workStart = 7;
    const workEnd = 22;

    const busySlots = events.map((e: { start_time?: string | null; end_time?: string | null }) => ({
      start: e.start_time || '',
      end: e.end_time || '',
    })).filter(slot => slot.start && slot.end);

    console.log('📅 Busy slots:', busySlots);

    const slots = [];

    // Generate 1-hour slots
    for (let hour = workStart; hour < workEnd; hour++) {
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

      // Check if this slot conflicts with any busy slots
      const hasConflict = busySlots.some(busy => {
        const conflict = (
          (startTime >= busy.start && startTime < busy.end) ||
          (endTime > busy.start && endTime <= busy.end) ||
          (startTime <= busy.start && endTime >= busy.end)
        );

        if (conflict) {
          console.log(`⚠️ Conflict detected for ${startTime}-${endTime} with busy slot ${busy.start}-${busy.end}`);
        }

        return conflict;
      });

      if (!hasConflict) {
        slots.push({ time: startTime, end: endTime });
      }
    }

    // Limit to first 8 slots
    const availableSlots = slots.slice(0, 8);

    console.log(`✅ Found ${availableSlots.length} available slots for ${date}:`, availableSlots.map(s => s.time));

    return NextResponse.json({
      success: true,
      date,
      slots: availableSlots,
      totalSlots: availableSlots.length
    });
  } catch (error) {
    console.error('❌ Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
