import { NextRequest } from 'next/server';
import { openai, models } from '@/lib/ai/provider';
import { generateText } from 'ai';
import { getServerSupabase } from '@/lib/supabase-server';
import { saveCommunication } from '@/lib/db-operations';
import { sendSMS } from '@/lib/twilio-sms';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('📱 Incoming SMS from:', from);
    console.log('💬 Message:', body);

    if (!from || !body) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = getServerSupabase();

    // Normalize phone number (remove +1, spaces, dashes, parentheses)
    const normalizedFrom = from.replace(/^\+1/, '').replace(/[\s\-\(\)]/g, '');

    // Try multiple phone formats to find the lead
    const { data: leads } = await supabase
      .from('leads')
      .select('id, contact_name, email, notes, phone')
      .order('created_at', { ascending: false });

    // Find lead by matching phone number (trying different formats)
    const lead = leads?.find(l => {
      if (!l.phone) return false;
      const normalizedLeadPhone = l.phone.replace(/^\+1/, '').replace(/[\s\-\(\)]/g, '');
      return normalizedLeadPhone === normalizedFrom;
    });

    if (!lead) {
      console.log('⚠️ Lead not found for phone:', from, '(normalized:', normalizedFrom + ')');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    console.log('✅ Found lead:', lead.contact_name, 'for phone:', from);

    // Save incoming SMS to communications
    await saveCommunication({
      lead_id: lead.id,
      type: 'sms',
      direction: 'inbound',
      body,
      from_address: from,
      to_address: process.env.TWILIO_PHONE_NUMBER || '+18773695137',
      status: 'delivered',
      provider_id: messageSid,
      metadata: {
        type: 'discovery_sms_reply'
      }
    });

    // Get recent SMS conversation history
    const { data: recentComms } = await supabase
      .from('communications')
      .select('*')
      .eq('lead_id', lead.id)
      .eq('type', 'sms')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    // Build conversation context
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = (recentComms || []).map(comm => ({
      role: comm.direction === 'outbound' ? 'assistant' as const : 'user' as const,
      content: comm.body
    }));

    conversationHistory.push({
      role: 'user',
      content: body
    });

    // Use AI to determine next question
    const systemPrompt = `You are Jorge's AI assistant helping gather discovery information via SMS before their scheduled meeting.

DISCOVERY QUESTIONS (Ask in order, ONE at a time):
1. Do you have a website? (If yes, get URL)
2. What services are you interested in? (CRM, lead tracking, etc.)
3. What's your biggest business challenge?
4. Any frustrations with current systems?

After ALL 4 questions answered: Say "Thanks! That's all I need. Jorge will be ready for your call on [date]." Then STOP responding.

IMPORTANT:
- Keep messages under 160 chars
- Don't answer questions about the meeting - refer them to check their email for details
- Don't explain services in detail - that's for Jorge's call
- After discovery is complete, ONLY respond with: "All set! See you on [meeting date]"

Lead: ${lead.contact_name || 'there'}

Respond with ONLY the next SMS message.`;

    const result = await generateText({
      model: openai(models.default),
      messages: conversationHistory,
      system: systemPrompt,
      temperature: 0.7,
    });

    const responseText = result.text.trim();

    // Send SMS response
    await sendSMS({
      to: from,
      body: responseText
    });

    console.log('✅ SMS response sent:', responseText);

    // Save outgoing SMS to communications
    await saveCommunication({
      lead_id: lead.id,
      type: 'sms',
      direction: 'outbound',
      body: responseText,
      from_address: process.env.TWILIO_PHONE_NUMBER || '+18773695137',
      to_address: from,
      status: 'sent',
      metadata: {
        type: 'discovery_sms'
      }
    });

    console.log('✅ SMS conversation saved to communications table (view in Messages tab)');

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('❌ Error handling SMS webhook:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
