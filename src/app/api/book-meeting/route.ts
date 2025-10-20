import { NextResponse } from 'next/server';
import { createCalendarEvent } from '@/lib/db-operations';
import type { CalendarEvent } from '@/lib/types';

export async function POST(req: Request) {
  try {
    // Verify API secret key (security)
    const authHeader = req.headers.get('Authorization');
    const apiSecret = process.env.API_SECRET_KEY;

    if (!authHeader || authHeader !== `Bearer ${apiSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      leadId,
      contactName,
      businessType,
      annualRevenue,
      notes,
      date,
      startTime,
      endTime,
      userId,
      description
    } = await req.json();

    // Validate required fields
    if (!date || !startTime || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startTime, userId' },
        { status: 400 }
      );
    }

    // Create title with contact name if available
    const title = contactName
      ? `Interview - ${contactName}`
      : 'Interview Meeting';

    // Use custom description if provided, otherwise build one
    const eventDescription = description ||
      (leadId ? `Scheduled via AI call - Lead ID: ${leadId}` : 'Scheduled via AI call');

    // Create calendar event
    const eventData: CalendarEvent = {
      title,
      description: eventDescription,
      event_date: date,
      start_time: startTime,
      end_time: endTime || null,
      user_id: userId,
    };

    const result = await createCalendarEvent(eventData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    console.log('✅ Meeting booked via AI call:', result.data);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('❌ Error booking meeting:', error);
    return NextResponse.json(
      { error: 'Failed to book meeting', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
