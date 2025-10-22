import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const leadId = formData.get('leadId') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('📞 Making call to:', to);
    console.log('📋 Lead ID:', leadId);
    console.log('📋 Call SID:', callSid);

    if (!to) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Error: No phone number provided</Say>
        </Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Get the base URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bostonbuildersai.vercel.app';

    // Generate TwiML to dial the lead and record the call with transcription
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial
    callerId="${process.env.TWILIO_PHONE_NUMBER}"
    record="record-from-answer-dual-channel"
    recordingStatusCallback="${baseUrl}/api/voice/recording-complete"
    recordingStatusCallbackMethod="POST"
    recordingStatusCallbackEvent="completed"
    transcribe="true"
    transcribeCallback="${baseUrl}/api/voice/transcription-complete"
  >
    <Number>${to}</Number>
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error generating TwiML:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred while connecting your call</Say>
      </Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}
