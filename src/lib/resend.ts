import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  leadId?: string;
}

export async function sendEmail({ to, subject, html, leadId }: SendEmailParams) {
  try {
    const fromEmail = process.env.FROM_EMAIL || 'jorge@bostonbuilders.ai';

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);

      // Log failed email to database
      if (leadId) {
        const supabase = await createClient();
        await supabase.from('communications').insert({
          lead_id: leadId,
          type: 'email',
          direction: 'outbound',
          subject,
          body: html,
          from_address: fromEmail,
          to_address: to,
          status: 'failed',
          error_message: error.message,
        });
      }

      throw error;
    }

    // Log successful email to database
    if (leadId) {
      const supabase = await createClient();
      await supabase.from('communications').insert({
        lead_id: leadId,
        type: 'email',
        direction: 'outbound',
        subject,
        body: html,
        from_address: fromEmail,
        to_address: to,
        status: 'sent',
        provider_id: data?.id,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function logInboundEmail({
  leadId,
  from,
  subject,
  body,
  providerId,
}: {
  leadId: string;
  from: string;
  subject: string;
  body: string;
  providerId?: string;
}) {
  try {
    const supabase = await createClient();
    const toEmail = process.env.FROM_EMAIL || 'jorge@bostonbuilders.ai';

    const { error } = await supabase.from('communications').insert({
      lead_id: leadId,
      type: 'email',
      direction: 'inbound',
      subject,
      body,
      from_address: from,
      to_address: toEmail,
      status: 'delivered',
      provider_id: providerId,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to log inbound email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
