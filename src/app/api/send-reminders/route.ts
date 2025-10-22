import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/resend';
import { sendSMS } from '@/lib/twilio-sms';

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for sending reminders

/**
 * This endpoint should be called by a cron job every hour
 * It sends reminders for appointments that are:
 * - 1 day away (24 hours)
 * - 15 minutes away
 */
export async function GET(req: Request) {
  try {
    // Verify API secret for security (optional but recommended)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log('⏰ Checking for appointments needing reminders...');

    // Get all upcoming appointments in the next 24 hours + 1 hour buffer
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        metadata
      `)
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', oneDayFromNow.toISOString().split('T')[0]);

    if (error) {
      console.error('❌ Error fetching events:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      console.log('✅ No upcoming appointments found');
      return NextResponse.json({ message: 'No reminders to send' });
    }

    let remindersSent = 0;

    for (const event of events) {
      const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
      const timeDiff = eventDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const minutesDiff = timeDiff / (1000 * 60);

      // Extract customer info from description
      const description = event.description || '';
      const emailMatch = description.match(/Email: ([^\n]+)/);
      const phoneMatch = description.match(/Phone: ([^\n]+)/);
      const nameMatch = event.title.match(/Call with (.+)/);

      const customerEmail = emailMatch?.[1]?.trim();
      const customerPhone = phoneMatch?.[1]?.trim();
      const customerName = nameMatch?.[1]?.trim() || 'there';

      // Extract Meet link from metadata
      const metadata = (event.metadata || {}) as Record<string, unknown>;
      const meetLink = (metadata?.meetLink || metadata?.meet_link || 'Check your calendar') as string;

      // Check if we should send 1-day reminder
      if (hoursDiff >= 23.5 && hoursDiff <= 24.5) {
        const reminderSent = metadata?.reminder_1day_sent;

        if (!reminderSent) {
          // Send 1-day reminder email
          if (customerEmail && customerEmail !== 'N/A') {
            try {
              await sendEmail({
                to: customerEmail,
                subject: `Reminder: Meeting with Jorge Tomorrow`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                      <h2 style="color: white; margin: 0;">Tomorrow's Meeting Reminder ⏰</h2>
                    </div>

                    <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                      <p style="font-size: 16px; color: #2d3748;">Hi ${customerName},</p>

                      <p style="font-size: 16px; color: #2d3748;">Just a friendly reminder about your call with Jorge tomorrow!</p>

                      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <p style="margin: 5px 0; color: #2d3748;"><strong>📅 Date:</strong> ${event.event_date}</p>
                        <p style="margin: 5px 0; color: #2d3748;"><strong>🕐 Time:</strong> ${event.start_time}</p>
                        <p style="margin: 5px 0; color: #2d3748;"><strong>📹 Meeting Link:</strong></p>
                        <a href="${meetLink}" style="color: #667eea; word-break: break-all;">${meetLink}</a>
                      </div>

                      <p style="font-size: 14px; color: #718096; margin-top: 20px;">
                        See you tomorrow!<br>
                        <strong>- Jorge & The Boston Builders AI Team</strong>
                      </p>
                    </div>
                  </div>
                `,
              });
              console.log('✅ 1-day reminder email sent to:', customerEmail);
            } catch (error) {
              console.error('❌ Error sending 1-day reminder email:', error);
            }
          }

          // Send 1-day reminder SMS
          if (customerPhone && customerPhone !== 'N/A') {
            try {
              await sendSMS({
                to: customerPhone,
                body: `Hi ${customerName}! Reminder: Your call with Jorge is tomorrow at ${event.start_time}. Meeting link: ${meetLink}`
              });
              console.log('✅ 1-day reminder SMS sent to:', customerPhone);
            } catch (error) {
              console.error('❌ Error sending 1-day reminder SMS:', error);
            }
          }

          // Mark reminder as sent
          await supabase
            .from('calendar_events')
            .update({
              metadata: {
                ...metadata,
                reminder_1day_sent: true,
                reminder_1day_sent_at: new Date().toISOString(),
              },
            })
            .eq('id', event.id);

          remindersSent++;
        }
      }

      // Check if we should send 15-minute reminder
      if (minutesDiff >= 14 && minutesDiff <= 16) {
        const reminderSent = metadata?.reminder_15min_sent;

        if (!reminderSent) {
          // Send 15-minute reminder email
          if (customerEmail && customerEmail !== 'N/A') {
            try {
              await sendEmail({
                to: customerEmail,
                subject: `Starting Soon: Meeting with Jorge in 15 Minutes`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                      <h2 style="color: white; margin: 0;">Meeting Starting Soon! 🚀</h2>
                    </div>

                    <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                      <p style="font-size: 16px; color: #2d3748;">Hi ${customerName},</p>

                      <p style="font-size: 16px; color: #2d3748;">Your call with Jorge starts in 15 minutes!</p>

                      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <p style="margin: 5px 0; color: #2d3748;"><strong>🕐 Time:</strong> ${event.start_time}</p>
                        <p style="margin: 5px 0; color: #2d3748;"><strong>📹 Join Now:</strong></p>
                        <a href="${meetLink}" style="display: inline-block; margin-top: 10px; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Meeting</a>
                      </div>

                      <p style="font-size: 14px; color: #718096; margin-top: 20px;">
                        See you in a few minutes!<br>
                        <strong>- Jorge & The Boston Builders AI Team</strong>
                      </p>
                    </div>
                  </div>
                `,
              });
              console.log('✅ 15-minute reminder email sent to:', customerEmail);
            } catch (error) {
              console.error('❌ Error sending 15-minute reminder email:', error);
            }
          }

          // Send 15-minute reminder SMS
          if (customerPhone && customerPhone !== 'N/A') {
            try {
              await sendSMS({
                to: customerPhone,
                body: `Hi ${customerName}! Your call with Jorge starts in 15 minutes. Join now: ${meetLink}`
              });
              console.log('✅ 15-minute reminder SMS sent to:', customerPhone);
            } catch (error) {
              console.error('❌ Error sending 15-minute reminder SMS:', error);
            }
          }

          // Mark reminder as sent
          await supabase
            .from('calendar_events')
            .update({
              metadata: {
                ...metadata,
                reminder_15min_sent: true,
                reminder_15min_sent_at: new Date().toISOString(),
              },
            })
            .eq('id', event.id);

          remindersSent++;
        }
      }
    }

    console.log(`✅ Sent ${remindersSent} reminders`);

    return NextResponse.json({
      success: true,
      message: `Checked ${events.length} events, sent ${remindersSent} reminders`,
      remindersSent,
    });
  } catch (error) {
    console.error('❌ Error in send-reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
