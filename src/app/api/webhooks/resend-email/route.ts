import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log('Received Resend webhook:', payload);

    // Resend sends different event types
    const eventType = payload.type;

    // Handle email.delivered or email.received events
    if (eventType === 'email.delivered' || eventType === 'email.received') {
      const emailData = payload.data;

      // For inbound emails
      if (eventType === 'email.received') {
        const from = emailData.from;
        const to = emailData.to?.[0] || '';
        const subject = emailData.subject || '';
        const html = emailData.html || emailData.text || '';
        const messageId = emailData.message_id;

        // Extract email address from "Name <email@domain.com>" format
        const emailMatch = from.match(/<(.+?)>/) || [null, from];
        const fromEmail = emailMatch[1] || from;

        console.log('Inbound email from:', fromEmail);

        // Use service role key for webhooks (bypasses RLS)
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find the lead by email address
        const { data: leads, error: findError } = await supabase
          .from('leads')
          .select('id, email')
          .eq('email', fromEmail.toLowerCase().trim());

        if (findError) {
          console.error('Error finding lead:', findError);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // If we found a lead, log the inbound email
        if (leads && leads.length > 0) {
          const lead = leads[0];

          const { error: insertError } = await supabase.from('communications').insert({
            lead_id: lead.id,
            type: 'email',
            direction: 'inbound',
            subject,
            body: html,
            from_address: fromEmail,
            to_address: to,
            status: 'delivered',
            provider_id: messageId,
          });

          if (insertError) {
            console.error('Error logging inbound email:', insertError);
          } else {
            console.log('Inbound email logged successfully for lead:', lead.id);
          }
        } else {
          console.log('No lead found for email:', fromEmail);
          // Optionally: Create a new lead automatically
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
