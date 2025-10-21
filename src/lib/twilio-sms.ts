import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export interface SendSMSParams {
  to: string;
  body: string;
  leadId?: string;
}

export async function sendSMS({ to, body, leadId }: SendSMSParams) {
  try {
    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER is not configured');
    }

    // Format phone number - ensure it has country code
    let formattedPhone = to.trim();

    // If phone doesn't start with +, add +1 for US numbers
    if (!formattedPhone.startsWith('+')) {
      // Remove any non-digit characters
      formattedPhone = formattedPhone.replace(/\D/g, '');

      // If it's 10 digits, it's a US number without country code
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        throw new Error(`Invalid phone number format: ${to}. Please use E.164 format (e.g., +1234567890)`);
      }
    }

    console.log('Sending SMS from', twilioPhoneNumber, 'to', formattedPhone);

    // Send SMS via Twilio
    const message = await client.messages.create({
      from: twilioPhoneNumber,
      to: formattedPhone,
      body,
    });

    console.log('SMS sent successfully:', message.sid, 'Status:', message.status);

    // Log successful SMS to database
    if (leadId) {
      const supabase = await createClient();
      await supabase.from('communications').insert({
        lead_id: leadId,
        type: 'sms',
        direction: 'outbound',
        body,
        from_address: twilioPhoneNumber,
        to_address: formattedPhone,
        status: message.status === 'sent' || message.status === 'queued' ? 'sent' : 'failed',
        provider_id: message.sid,
        metadata: {
          error_code: message.errorCode,
          error_message: message.errorMessage,
          price: message.price,
          price_unit: message.priceUnit,
          twilio_status: message.status,
        },
      });
    }

    return { success: true, data: message };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.moreInfo);

    // Log failed SMS to database
    if (leadId) {
      const supabase = await createClient();
      await supabase.from('communications').insert({
        lead_id: leadId,
        type: 'sms',
        direction: 'outbound',
        body,
        from_address: twilioPhoneNumber || '',
        to_address: to,
        status: 'failed',
        error_message: `${error.message} (Code: ${error.code || 'unknown'})`,
      });
    }

    return { success: false, error: `${error.message} ${error.code ? `(Code: ${error.code})` : ''}` };
  }
}

export async function logInboundSMS({
  leadId,
  from,
  body,
  messageSid,
}: {
  leadId: string;
  from: string;
  body: string;
  messageSid?: string;
}) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('communications').insert({
      lead_id: leadId,
      type: 'sms',
      direction: 'inbound',
      body,
      from_address: from,
      to_address: twilioPhoneNumber || '',
      status: 'delivered',
      provider_id: messageSid,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Failed to log inbound SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function getSMSHistory(leadId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('lead_id', leadId)
      .eq('type', 'sms')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to get SMS history:', error);
    return { success: false, error: error.message };
  }
}
