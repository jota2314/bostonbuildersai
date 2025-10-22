import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio-sms';
import { saveCommunication } from '@/lib/db-operations';

export async function POST(req: NextRequest) {
  try {
    const { leadId, phoneNumber, leadName } = await req.json();

    if (!leadId || !phoneNumber) {
      return NextResponse.json(
        { error: 'leadId and phoneNumber are required' },
        { status: 400 }
      );
    }

    const name = leadName || 'there';

    // Send initial SMS with discovery questions
    const smsBody = `Hey ${name}! It's Jorge's assistant from Boston Builders AI. I have a few quick questions to help Jorge prep for your call. Reply whenever you have a sec!

1️⃣ Do you currently have a website for your business?`;

    await sendSMS({
      to: phoneNumber,
      body: smsBody
    });

    console.log('📱 SMS discovery follow-up sent to:', phoneNumber);

    // Save SMS to communications
    await saveCommunication({
      lead_id: leadId,
      type: 'sms',
      direction: 'outbound',
      body: smsBody,
      from_address: process.env.TWILIO_PHONE_NUMBER || '+18773695137',
      to_address: phoneNumber,
      status: 'sent',
      metadata: {
        type: 'discovery_sms',
        question_number: 1
      }
    });

    console.log('✅ SMS saved to communications');

    return NextResponse.json({
      success: true,
      message: 'Discovery SMS sent',
    });
  } catch (error) {
    console.error('❌ Error sending discovery SMS:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
