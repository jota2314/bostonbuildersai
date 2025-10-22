import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { saveCommunication } from '@/lib/db-operations';
import { openai, models } from '@/lib/ai/provider';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;
    const callSid = formData.get('CallSid') as string;
    const recordingSid = formData.get('RecordingSid') as string;

    console.log('📝 Transcription complete for call:', callSid);
    console.log('✅ Status:', transcriptionStatus);

    if (!transcriptionText || transcriptionStatus !== 'completed') {
      console.log('⚠️ Transcription not ready or failed');
      return NextResponse.json({ message: 'Transcription not ready' });
    }

    const supabase = getServerSupabase();

    // Get phone call record to find lead_id
    const { data: phoneCall } = await supabase
      .from('phone_calls')
      .select('lead_id, phone_number')
      .eq('call_sid', callSid)
      .single();

    if (!phoneCall || !phoneCall.lead_id) {
      console.log('⚠️ Could not find lead for call:', callSid);
      return NextResponse.json({ message: 'Lead not found' });
    }

    console.log('✅ Found lead:', phoneCall.lead_id);

    // Use AI to generate a summary of the call
    const summaryPrompt = `You are analyzing a phone call transcript between Jorge (salesperson) and a potential client.

TRANSCRIPT:
${transcriptionText}

Generate a concise summary in this format:

**Key Points:**
- [Main topic 1]
- [Main topic 2]
- [Main topic 3]

**Client Needs:**
- [Need 1]
- [Need 2]

**Next Steps:**
- [Action item 1]
- [Action item 2]

Keep it under 200 words. Focus on actionable insights.`;

    const result = await generateText({
      model: openai(models.default),
      prompt: summaryPrompt,
      temperature: 0.3,
    });

    const summary = result.text.trim();

    console.log('✅ AI Summary generated');

    // Save to communications table
    await saveCommunication({
      lead_id: phoneCall.lead_id,
      type: 'phone',
      direction: 'outbound',
      subject: 'Phone Call',
      body: summary,
      from_address: process.env.TWILIO_PHONE_NUMBER || '',
      to_address: phoneCall.phone_number,
      status: 'completed',
      provider_id: callSid,
      metadata: {
        transcript: transcriptionText,
        recording_sid: recordingSid,
        call_sid: callSid,
      },
    });

    console.log('✅ Call summary saved to communications');

    // Update phone_calls table with transcript
    await supabase
      .from('phone_calls')
      .update({
        transcript: transcriptionText,
        summary,
      })
      .eq('call_sid', callSid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling transcription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
