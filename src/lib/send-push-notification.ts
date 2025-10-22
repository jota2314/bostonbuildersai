/**
 * Server-side utility to send push notifications
 * Use this in API routes to notify users
 */

interface SendPushNotificationParams {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  url?: string;
}

export async function sendPushNotification({
  userId,
  title,
  body,
  icon,
  badge,
  data,
  url,
}: SendPushNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the internal API to send the notification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        icon,
        badge,
        data,
        url,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to send notification' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper functions for common notification scenarios
 */

export async function notifyNewLead(userId: string, leadName: string, leadId: string) {
  return sendPushNotification({
    userId,
    title: '🎉 New Lead!',
    body: `${leadName} just submitted their information`,
    url: `/dashboard/leads/${leadId}`,
    data: { type: 'new_lead', leadId },
  });
}

export async function notifyNewMessage(
  userId: string,
  leadName: string,
  messageType: 'email' | 'sms',
  leadId: string
) {
  const icon = messageType === 'email' ? '📧' : '💬';
  return sendPushNotification({
    userId,
    title: `${icon} New ${messageType === 'email' ? 'Email' : 'SMS'}`,
    body: `${leadName} sent you a message`,
    url: `/dashboard/leads/${leadId}`,
    data: { type: 'new_message', leadId, messageType },
  });
}

export async function notifyMeetingBooked(
  userId: string,
  leadName: string,
  meetingDate: string,
  leadId: string
) {
  return sendPushNotification({
    userId,
    title: '📅 Meeting Booked!',
    body: `${leadName} scheduled a meeting for ${meetingDate}`,
    url: `/dashboard/calendar`,
    data: { type: 'meeting_booked', leadId },
  });
}

export async function notifyMeetingReminder(
  userId: string,
  leadName: string,
  minutesUntilMeeting: number,
  meetingId: string
) {
  const timeText = minutesUntilMeeting === 1440 ? '24 hours' : `${minutesUntilMeeting} minutes`;
  return sendPushNotification({
    userId,
    title: '⏰ Meeting Reminder',
    body: `Meeting with ${leadName} in ${timeText}`,
    url: `/dashboard/calendar`,
    data: { type: 'meeting_reminder', meetingId },
  });
}
