import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { saveCommunication } from '@/lib/db-operations';

export async function POST(req: NextRequest) {
  try {
    // Verify API secret key (security)
    const authHeader = req.headers.get('Authorization');
    const apiSecret = process.env.API_SECRET_KEY;

    if (!authHeader || authHeader !== `Bearer ${apiSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      leadId,
      callSid,
      discoveryNotes,
      transcript,
      willFollowUpSms
    } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Get lead info
    const { data: lead } = await supabase
      .from('leads')
      .select('id, contact_name, phone, email, notes')
      .eq('id', leadId)
      .single();

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Update lead notes with discovery information
    if (discoveryNotes) {
      const existingNotes = lead.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}${discoveryNotes}` : discoveryNotes.trim();

      await supabase
        .from('leads')
        .update({ notes: updatedNotes })
        .eq('id', leadId);

      console.log('✅ Discovery notes added to lead:', leadId);
    }

    // Save call transcript to communications table
    if (transcript) {
      await saveCommunication({
        lead_id: leadId,
        type: 'sms', // Using 'sms' type for voice transcript (you could add 'voice' type to enum)
        direction: 'outbound',
        subject: 'Discovery Call Transcript',
        body: transcript,
        from_address: process.env.TWILIO_PHONE_NUMBER || '+18773695137',
        to_address: lead.phone || 'Unknown',
        status: 'sent',
        metadata: {
          call_sid: callSid,
          type: 'voice_transcript'
        }
      });

      console.log('✅ Call transcript saved to communications');
    }

    // If they were busy and need SMS follow-up, trigger it
    if (willFollowUpSms && lead.phone) {
      console.log('📱 Triggering SMS follow-up for:', lead.contact_name);

      // Trigger SMS discovery conversation
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/discovery-followup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          phoneNumber: lead.phone,
          leadName: lead.contact_name,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Discovery information saved successfully',
    });
  } catch (error) {
    console.error('❌ Error saving discovery info:', error);
    return NextResponse.json(
      { error: 'Failed to save discovery information', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
