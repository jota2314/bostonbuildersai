import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Twilio sends data as form-urlencoded
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('Received inbound SMS:', { from, to, body, messageSid });

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role key for webhooks (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the lead by phone number
    // Format the phone number to match what might be in the database
    const phoneVariants = [
      from,
      from.replace(/\D/g, ''), // Just digits
      from.replace(/^\+1/, ''), // Remove +1 prefix
    ];

    const { data: leads, error: findError } = await supabase
      .from('leads')
      .select('id, email, phone')
      .or(phoneVariants.map(p => `phone.eq.${p}`).join(','));

    if (findError) {
      console.error('Error finding lead:', findError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // If we found a lead, log the inbound SMS
    if (leads && leads.length > 0) {
      const lead = leads[0];

      const { error: insertError } = await supabase.from('communications').insert({
        lead_id: lead.id,
        type: 'sms',
        direction: 'inbound',
        body,
        from_address: from,
        to_address: to,
        status: 'delivered',
        provider_id: messageSid,
      });

      if (insertError) {
        console.error('Error logging inbound SMS:', insertError);
      } else {
        console.log('Inbound SMS logged successfully for lead:', lead.id);
      }
    } else {
      console.log('No lead found for phone number:', from);
      // Optionally: Create a new lead automatically or log to a separate table
    }

    // Respond to Twilio with TwiML (empty response = no reply)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Twilio SMS webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
