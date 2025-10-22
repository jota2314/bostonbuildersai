import { google } from 'googleapis';

// Initialize Google Calendar API client
function getCalendarClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Google Calendar credentials not configured');
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

export interface GoogleCalendarEvent {
  summary: string; // Event title
  description?: string;
  startDateTime: string; // ISO 8601 format
  endDateTime: string; // ISO 8601 format
  attendeeEmail: string; // Customer's email
  attendeeName: string; // Customer's name
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  meetLink?: string;
  htmlLink?: string;
  error?: string;
}

/**
 * Create a Google Calendar event with Google Meet link
 */
export async function createCalendarEvent(
  eventData: GoogleCalendarEvent
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      throw new Error('GOOGLE_CALENDAR_ID not configured');
    }

    // Create event (Jorge will add Google Meet link manually - personal Gmail limitation)
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startDateTime,
        timeZone: 'America/New_York', // Adjust timezone as needed
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 15 }, // 15 minutes before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'none', // Don't send automatic invites (service account limitation)
    });

    const meetLink = process.env.STATIC_MEET_LINK || 'https://meet.google.com/emq-intn-ckr';

    console.log('✅ Google Calendar event created:', response.data.id);
    console.log('📹 Google Meet link:', meetLink);

    return {
      success: true,
      eventId: response.data.id || undefined,
      meetLink: meetLink,
      htmlLink: response.data.htmlLink || undefined,
    };
  } catch (error) {
    console.error('❌ Error creating Google Calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      throw new Error('GOOGLE_CALENDAR_ID not configured');
    }

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'none', // Don't send automatic notifications
    });

    console.log('✅ Google Calendar event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Google Calendar event:', error);
    return false;
  }
}

/**
 * Update a Google Calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  eventData: Partial<GoogleCalendarEvent>
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      throw new Error('GOOGLE_CALENDAR_ID not configured');
    }

    const updateData: any = {};

    if (eventData.summary) {
      updateData.summary = eventData.summary;
    }
    if (eventData.description) {
      updateData.description = eventData.description;
    }
    if (eventData.startDateTime && eventData.endDateTime) {
      updateData.start = {
        dateTime: eventData.startDateTime,
        timeZone: 'America/New_York',
      };
      updateData.end = {
        dateTime: eventData.endDateTime,
        timeZone: 'America/New_York',
      };
    }

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updateData,
      sendUpdates: 'none', // Don't send automatic notifications
    });

    const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;

    console.log('✅ Google Calendar event updated:', eventId);

    return {
      success: true,
      eventId: response.data.id || undefined,
      meetLink: meetLink || undefined,
      htmlLink: response.data.htmlLink || undefined,
    };
  } catch (error) {
    console.error('❌ Error updating Google Calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
