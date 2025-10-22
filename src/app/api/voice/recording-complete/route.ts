import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const callSid = formData.get('CallSid') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;

    console.log('🎙️ Recording complete:', recordingSid);
    console.log('📞 Call SID:', callSid);
    console.log('⏱️ Duration:', recordingDuration, 'seconds');

    if (!recordingUrl || !recordingSid) {
      return NextResponse.json({ error: 'Missing recording data' }, { status: 400 });
    }

    // Download the recording from Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    // Get the recording binary data
    const recording = await client.recordings(recordingSid).fetch();
    const audioUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;

    // Download the audio file
    const audioResponse = await fetch(audioUrl, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });

    if (!audioResponse.ok) {
      console.error('Failed to download recording from Twilio');
      return NextResponse.json({ error: 'Failed to download recording' }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    // Upload to Supabase Storage
    const supabase = getServerSupabase();
    const fileName = `call-recordings/${callSid}-${recordingSid}.mp3`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError);
      return NextResponse.json({ error: 'Failed to upload recording' }, { status: 500 });
    }

    console.log('✅ Recording saved to Supabase:', fileName);

    // Update phone_calls table with recording info
    const { error: updateError } = await supabase
      .from('phone_calls')
      .update({
        recording_url: fileName,
        recording_duration: parseInt(recordingDuration || '0'),
        status: 'completed',
      })
      .eq('call_sid', callSid);

    if (updateError) {
      console.error('Error updating phone_calls table:', updateError);
    }

    return NextResponse.json({ success: true, fileName });
  } catch (error) {
    console.error('Error handling recording:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
