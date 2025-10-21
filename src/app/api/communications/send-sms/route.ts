import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio-sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, leadId } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const result = await sendSMS({ to, body: message, leadId });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Send SMS API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
