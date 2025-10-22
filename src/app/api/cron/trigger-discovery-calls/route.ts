import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

const JORGE_USER_ID = 'b01606c2-dcb3-4566-826f-f1d7453d84ce';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to ensure only Vercel can call this
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Cron: Checking for appointments needing discovery calls...');

    const supabase = getServerSupabase();

    // Get appointments created 5 minutes ago (with 1 minute window)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);

    const { data: recentEvents, error } = await supabase
      .from('calendar_events')
      .select('id, title, description, user_id, created_at')
      .gte('created_at', fiveMinutesAgo.toISOString())
      .lte('created_at', fourMinutesAgo.toISOString())
      .eq('user_id', JORGE_USER_ID);

    if (error) {
      console.error('❌ Error fetching recent events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!recentEvents || recentEvents.length === 0) {
      console.log('✅ No appointments found needing calls');
      return NextResponse.json({
        success: true,
        message: 'No appointments to call',
        checked: fiveMinutesAgo.toISOString()
      });
    }

    console.log(`📞 Found ${recentEvents.length} appointment(s) to call`);

    // For each event, extract lead info and trigger call
    const results = [];
    for (const event of recentEvents) {
      try {
        // Parse event description to get email and phone
        const description = event.description || '';
        const emailMatch = description.match(/Email:\s*([^\n]+)/);
        const phoneMatch = description.match(/Phone:\s*([^\n]+)/);

        const email = emailMatch?.[1]?.trim();
        const phone = phoneMatch?.[1]?.trim();

        // Skip if no phone number
        if (!phone || phone === 'N/A') {
          console.log(`⏭️  Skipping event ${event.id} - no phone number`);
          continue;
        }

        // Look up lead by email to get lead_id and name
        let leadId = null;
        let leadName = 'there';

        if (email && email !== 'N/A') {
          const { data: leadData } = await supabase
            .from('leads')
            .select('id, contact_name')
            .eq('email', email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (leadData) {
            leadId = leadData.id;
            leadName = leadData.contact_name || 'there';
          }
        }

        // Check if we already called this lead recently (avoid duplicates)
        const { data: recentCall } = await supabase
          .from('phone_calls')
          .select('id')
          .eq('phone_number', phone)
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .limit(1)
          .single();

        if (recentCall) {
          console.log(`⏭️  Skipping ${phone} - already called recently`);
          continue;
        }

        // Trigger the discovery call
        console.log(`📞 Triggering discovery call to ${phone} (${leadName})`);

        const callResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/initiate-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phone,
            leadId,
            leadName,
          }),
        });

        const callResult = await callResponse.json();

        results.push({
          eventId: event.id,
          phone,
          leadName,
          success: callResponse.ok,
          callSid: callResult.callSid,
        });

        console.log(`✅ Call initiated for ${leadName}: ${callResult.callSid}`);
      } catch (error) {
        console.error(`❌ Error processing event ${event.id}:`, error);
        results.push({
          eventId: event.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} calls`,
      results,
    });
  } catch (error) {
    console.error('❌ Cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
