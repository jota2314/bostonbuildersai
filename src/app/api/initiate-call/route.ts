import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { createPhoneCall } from '@/lib/db-operations';
import type { PhoneCall } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { phoneNumber, leadId, leadName } = await req.json();

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
    const userId = process.env.USER_ID;

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Get the Cloudflare Worker WebSocket URL
    // IMPORTANT: Replace this with your actual Cloudflare Worker URL after deployment
    const wsUrl = process.env.CLOUDFLARE_WORKER_URL || 'wss://boston-builders-voice-ai.YOUR-NAME.workers.dev';

    // Make a call that connects to our WebSocket
    const call = await client.calls.create({
      to: phoneNumber,
      from: twilioPhoneNumber,
      twiml: `<Response>
        <Connect>
          <Stream url="${wsUrl}">
            <Parameter name="leadId" value="${leadId || ''}" />
            <Parameter name="leadName" value="${leadName || 'there'}" />
          </Stream>
        </Connect>
      </Response>`,
    });

    console.log('✅ Call initiated:', call.sid);

    // Store phone call in database
    const phoneCallData: PhoneCall = {
      lead_id: leadId || null,
      call_sid: call.sid,
      phone_number: phoneNumber,
      status: 'initiated',
      user_id: userId || null,
    };

    const result = await createPhoneCall(phoneCallData);

    if (!result.success) {
      console.error('Failed to store phone call in database:', result.error);
    }

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    console.error('❌ Error initiating call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
