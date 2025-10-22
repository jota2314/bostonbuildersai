import { NextRequest, NextResponse } from 'next/server';
import { createCalendarEvent as createGoogleEvent } from '@/lib/google-calendar';
import { createCalendarEvent, createLead } from '@/lib/db-operations';
import { sendEmail } from '@/lib/resend';
import { sendSMS } from '@/lib/twilio-sms';
import type { CalendarEvent, LeadData } from '@/lib/types';

const JORGE_USER_ID = 'b01606c2-dcb3-4566-826f-f1d7453d84ce';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, company, date, start_time, end_time, purpose } = await req.json();

    if (!name || !email || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('📞 Booking appointment for:', name);

    // Create Google Calendar event
    const startDateTime = `${date}T${start_time}:00`;
    const endDateTime = `${date}T${end_time}:00`;

    const googleResult = await createGoogleEvent({
      summary: `Call with ${name}`,
      description: `📋 Lead Info:\nName: ${name}\nCompany: ${company || 'N/A'}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nPurpose: ${purpose || 'Discovery call'}\n\n👉 Please add Google Meet link to this event`,
      startDateTime,
      endDateTime,
      attendeeEmail: email,
      attendeeName: name,
    });

    if (!googleResult.success) {
      console.error('❌ Error creating Google Calendar event:', googleResult.error);
    }

    const meetLink = googleResult.meetLink || process.env.STATIC_MEET_LINK || 'https://meet.google.com/emq-intn-ckr';

    // Save to local database
    const eventData: CalendarEvent = {
      title: `Call with ${name}`,
      description: `Company: ${company || 'N/A'}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nPurpose: ${purpose || 'Discovery call'}\nMeet Link: ${meetLink}\nGoogle Event ID: ${googleResult.eventId || 'N/A'}`,
      event_date: date,
      start_time,
      end_time,
      user_id: JORGE_USER_ID,
    };

    const dbResult = await createCalendarEvent(eventData);

    if (!dbResult.success) {
      console.error('❌ Error saving to database:', dbResult.error);
      return NextResponse.json(
        { error: 'Could not save appointment' },
        { status: 500 }
      );
    }

    // Create lead entry
    const leadData: LeadData = {
      company_name: company || 'N/A',
      contact_name: name,
      email,
      phone: phone || null,
      business_type: 'Construction/Contractor',
      source: 'Website Booking Calendar',
      status: 'new',
      priority: 'high',
      user_id: JORGE_USER_ID,
      notes: `Meeting scheduled for ${date} at ${start_time}. Purpose: ${purpose || 'Discovery call'}`,
      consent_to_contact: true,
      consent_date: new Date().toISOString(),
    };

    console.log('📝 Creating lead with data:', {
      company_name: leadData.company_name,
      contact_name: leadData.contact_name,
      email: leadData.email,
      user_id: leadData.user_id
    });

    const leadResult = await createLead(leadData);

    if (!leadResult.success) {
      console.error('❌ Error creating lead:', leadResult.error);
      console.error('❌ Full error details:', JSON.stringify(leadResult, null, 2));
      // Don't fail the whole request if lead creation fails
    } else {
      console.log('✅ Lead created successfully with ID:', leadResult.data?.id);
    }

    // Send email confirmation
    try {
      await sendEmail({
        to: email,
        subject: `Meeting Confirmed: Call with Jorge on ${date}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Meeting Confirmed! 📅</h1>
            </div>

            <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #2d3748;">Hi ${name},</p>

              <p style="font-size: 16px; color: #2d3748;">Your call with Jorge is all set!</p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 5px 0; color: #2d3748;"><strong>📅 Date:</strong> ${date}</p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>🕐 Time:</strong> ${start_time}</p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>📹 Meeting Link:</strong></p>
                <a href="${meetLink}" style="color: #667eea; word-break: break-all;">${meetLink}</a>
              </div>

              <p style="font-size: 14px; color: #718096; margin-top: 20px;">
                We'll send you a reminder 1 day before and 15 minutes before the meeting.
              </p>
            </div>
          </div>
        `,
      });
      console.log('✅ Confirmation email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending email:', error);
    }

    // Send SMS confirmation
    if (phone) {
      try {
        await sendSMS({
          to: phone,
          body: `Hi ${name}! Your call with Jorge is confirmed for ${date} at ${start_time}. Meeting link: ${meetLink}`
        });
        console.log('✅ Confirmation SMS sent to:', phone);
      } catch (error) {
        console.error('❌ Error sending SMS:', error);
      }
    }

    console.log('✅ Appointment booked successfully');

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully',
      eventId: dbResult.data?.id,
      meetLink
    });
  } catch (error) {
    console.error('❌ Error booking appointment:', error);
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    );
  }
}
