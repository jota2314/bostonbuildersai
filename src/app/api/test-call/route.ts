import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: Request) {
  try {
    const { phoneNumber, message } = await req.json();

    // Validate phone number
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Make a call with TwiML
    const call = await client.calls.create({
      to: phoneNumber,
      from: twilioPhoneNumber,
      twiml: `<Response><Say voice="alice">${message || 'Hello! This is a test call from Boston Builders AI. Your Twilio integration is working perfectly!'}</Say></Response>`,
    });

    console.log('✅ Call initiated:', call.sid);

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    console.error('❌ Error making call:', error);
    return NextResponse.json(
      { error: 'Failed to make call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
